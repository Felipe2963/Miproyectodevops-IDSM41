const express = require('express');
const pool = require('../database/connection');

const router = express.Router();

const ESTADOS_TAREA = [
    'pendiente',
    'en_proceso',
    'completada'
];

const PRIORIDADES_TAREA = [
    'baja',
    'media',
    'alta'
];

// Verificar sesión
router.use((req, res, next) => {
    if (!req.session || !req.session.usuario) {
        return res.status(401).json({
            mensaje: 'Debes iniciar sesión.'
        });
    }

    next();
});

// Validar ID de la tarea
function validarId(req, res, next) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            mensaje: 'Identificador inválido.'
        });
    }

    req.taskId = id;
    next();
}

// Validar fechas
function fechaValida(fecha) {
    if (fecha === null || fecha === '') {
        return true;
    }

    if (
        typeof fecha !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ) {
        return false;
    }

    const date = new Date(`${fecha}T00:00:00Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === fecha
    );
}

// Validar información de la tarea
function validarTarea(body) {
    const {
        titulo,
        descripcion = '',
        estado = 'pendiente',
        prioridad = 'media',
        fecha_inicio = null,
        fecha_vencimiento = null,
        id_proyecto
    } = body || {};

    if (
        typeof titulo !== 'string' ||
        !titulo.trim() ||
        titulo.trim().length > 150
    ) {
        return {
            error: 'El título es obligatorio y debe tener máximo 150 caracteres.'
        };
    }

    if (typeof descripcion !== 'string') {
        return {
            error: 'La descripción no es válida.'
        };
    }

    if (!ESTADOS_TAREA.includes(estado)) {
        return {
            error: 'El estado de la tarea no es válido.'
        };
    }

    if (!PRIORIDADES_TAREA.includes(prioridad)) {
        return {
            error: 'La prioridad de la tarea no es válida.'
        };
    }

    const inicio = fecha_inicio || null;
    const vencimiento = fecha_vencimiento || null;
    const proyectoId = Number(id_proyecto);

    if (!fechaValida(inicio) || !fechaValida(vencimiento)) {
        return {
            error: 'Las fechas deben tener formato YYYY-MM-DD.'
        };
    }

    if (inicio && vencimiento && vencimiento < inicio) {
        return {
            error: 'La fecha de vencimiento no puede ser anterior a la fecha de inicio.'
        };
    }

    if (!Number.isInteger(proyectoId) || proyectoId <= 0) {
        return {
            error: 'El proyecto seleccionado no es válido.'
        };
    }

    return {
        data: {
            titulo: titulo.trim(),
            descripcion: descripcion.trim(),
            estado,
            prioridad,
            fecha_inicio: inicio,
            fecha_vencimiento: vencimiento,
            id_proyecto: proyectoId
        }
    };
}

// LISTAR TAREAS
router.get('/', async (req, res) => {
    try {
        const idUsuario = req.session.usuario.id_usuario;

        const [tareas] = await pool.execute(
            `SELECT
                t.id_tarea,
                t.titulo,
                t.descripcion,
                t.estado,
                t.prioridad,
                DATE_FORMAT(t.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
                DATE_FORMAT(t.fecha_vencimiento, '%Y-%m-%d') AS fecha_vencimiento,
                t.id_proyecto,
                t.id_creador,
                t.fecha_creacion,
                p.nombre AS nombre_proyecto
             FROM tareas t
             INNER JOIN proyectos p
                ON t.id_proyecto = p.id_proyecto
             WHERE p.id_usuario = ?
             ORDER BY t.fecha_creacion DESC`,
            [idUsuario]
        );

        res.json(tareas);

    } catch (error) {
        console.error('Error al listar tareas:', error);

        res.status(500).json({
            mensaje: 'No se pudieron consultar las tareas.'
        });
    }
});

// CONSULTAR UNA TAREA
router.get('/:id', validarId, async (req, res) => {
    try {
        const idUsuario = req.session.usuario.id_usuario;

        const [tareas] = await pool.execute(
            `SELECT
                t.id_tarea,
                t.titulo,
                t.descripcion,
                t.estado,
                t.prioridad,
                DATE_FORMAT(t.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
                DATE_FORMAT(t.fecha_vencimiento, '%Y-%m-%d') AS fecha_vencimiento,
                t.id_proyecto,
                t.id_creador,
                t.fecha_creacion,
                p.nombre AS nombre_proyecto
             FROM tareas t
             INNER JOIN proyectos p
                ON t.id_proyecto = p.id_proyecto
             WHERE t.id_tarea = ? AND p.id_usuario = ?`,
            [req.taskId, idUsuario]
        );

        if (tareas.length === 0) {
            return res.status(404).json({
                mensaje: 'Tarea no encontrada.'
            });
        }

        res.json(tareas[0]);

    } catch (error) {
        console.error('Error al consultar tarea:', error);

        res.status(500).json({
            mensaje: 'No se pudo consultar la tarea.'
        });
    }
});

// CREAR TAREA
router.post('/', async (req, res) => {
    const validacion = validarTarea(req.body);

    if (validacion.error) {
        return res.status(400).json({
            mensaje: validacion.error
        });
    }

    try {
        const idUsuario = req.session.usuario.id_usuario;
        const t = validacion.data;

        // Verificar que el proyecto pertenezca al usuario
        const [proyectos] = await pool.execute(
            `SELECT id_proyecto
             FROM proyectos
             WHERE id_proyecto = ? AND id_usuario = ?`,
            [t.id_proyecto, idUsuario]
        );

        if (proyectos.length === 0) {
            return res.status(404).json({
                mensaje: 'Proyecto no encontrado.'
            });
        }

        // Insertar la tarea
        const [resultado] = await pool.execute(
            `INSERT INTO tareas
             (titulo, descripcion, estado, prioridad,
              fecha_inicio, fecha_vencimiento,
              id_proyecto, id_creador)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                t.titulo,
                t.descripcion,
                t.estado,
                t.prioridad,
                t.fecha_inicio,
                t.fecha_vencimiento,
                t.id_proyecto,
                idUsuario
            ]
        );

        res.status(201).json({
            mensaje: 'Tarea creada correctamente.',
            id_tarea: resultado.insertId
        });

    } catch (error) {
        console.error('Error al crear tarea:', error);

        res.status(500).json({
            mensaje: 'No se pudo crear la tarea.'
        });
    }
});


// EDITAR TAREA
router.put('/:id', validarId, async (req, res) => {
    const validacion = validarTarea(req.body);

    if (validacion.error) {
        return res.status(400).json({
            mensaje: validacion.error
        });
    }

    try {
        const idUsuario = req.session.usuario.id_usuario;
        const t = validacion.data;

        // Verificar que la tarea pertenezca a un proyecto del usuario
        const [existentes] = await pool.execute(
            `SELECT t.id_tarea
             FROM tareas t
             INNER JOIN proyectos p
                ON t.id_proyecto = p.id_proyecto
             WHERE t.id_tarea = ? AND p.id_usuario = ?`,
            [req.taskId, idUsuario]
        );

        if (existentes.length === 0) {
            return res.status(404).json({
                mensaje: 'Tarea no encontrada.'
            });
        }

        // Verificar que el proyecto destino pertenezca al usuario
        const [proyectos] = await pool.execute(
            `SELECT id_proyecto
             FROM proyectos
             WHERE id_proyecto = ? AND id_usuario = ?`,
            [t.id_proyecto, idUsuario]
        );

        if (proyectos.length === 0) {
            return res.status(404).json({
                mensaje: 'Proyecto no encontrado.'
            });
        }

        // Actualizar la tarea
        await pool.execute(
            `UPDATE tareas
             SET titulo = ?,
                 descripcion = ?,
                 estado = ?,
                 prioridad = ?,
                 fecha_inicio = ?,
                 fecha_vencimiento = ?,
                 id_proyecto = ?
             WHERE id_tarea = ?`,
            [
                t.titulo,
                t.descripcion,
                t.estado,
                t.prioridad,
                t.fecha_inicio,
                t.fecha_vencimiento,
                t.id_proyecto,
                req.taskId
            ]
        );

        res.json({
            mensaje: 'Tarea actualizada correctamente.'
        });

    } catch (error) {
        console.error('Error al editar tarea:', error);

        res.status(500).json({
            mensaje: 'No se pudo actualizar la tarea.'
        });
    }
});


// ELIMINAR TAREA
router.delete('/:id', validarId, async (req, res) => {
    try {
        const idUsuario = req.session.usuario.id_usuario;

        const [resultado] = await pool.execute(
            `DELETE t
             FROM tareas t
             INNER JOIN proyectos p
                ON t.id_proyecto = p.id_proyecto
             WHERE t.id_tarea = ? AND p.id_usuario = ?`,
            [req.taskId, idUsuario]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: 'Tarea no encontrada.'
            });
        }

        res.json({
            mensaje: 'Tarea eliminada correctamente.'
        });

    } catch (error) {
        console.error('Error al eliminar tarea:', error);

        res.status(500).json({
            mensaje: 'No se pudo eliminar la tarea.'
        });
    }
});

module.exports = router;