
const express = require('express');
const pool = require('../database/connection');

const router = express.Router();

const ESTADOS = ['pendiente', 'activo', 'finalizado'];

const CAMPOS_PROYECTO = `
    id_proyecto,
    nombre,
    descripcion,
    estado,
    DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
    DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS fecha_fin,
    id_usuario,
    fecha_creacion
`;

// Verificar sesión
router.use((req, res, next) => {
    if (!req.session || !req.session.usuario) {
        return res.status(401).json({
            mensaje: 'Debes iniciar sesión.'
        });
    }

    next();
});

// Validar ID
function validarId(req, res, next) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            mensaje: 'Identificador inválido.'
        });
    }

    req.projectId = id;
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

// Validar información del proyecto
function validarProyecto(body) {
    const {
        nombre,
        descripcion = '',
        estado = 'pendiente',
        fecha_inicio = null,
        fecha_fin = null
    } = body || {};

    if (
        typeof nombre !== 'string' ||
        !nombre.trim() ||
        nombre.trim().length > 150
    ) {
        return {
            error: 'El nombre es obligatorio y debe tener máximo 150 caracteres.'
        };
    }

    if (typeof descripcion !== 'string') {
        return {
            error: 'La descripción no es válida.'
        };
    }

    if (!ESTADOS.includes(estado)) {
        return {
            error: 'El estado del proyecto no es válido.'
        };
    }

    const inicio = fecha_inicio || null;
    const fin = fecha_fin || null;

    if (!fechaValida(inicio) || !fechaValida(fin)) {
        return {
            error: 'Las fechas deben tener formato YYYY-MM-DD.'
        };
    }

    if (inicio && fin && fin < inicio) {
        return {
            error: 'La fecha final no puede ser anterior a la inicial.'
        };
    }

    return {
        data: {
            nombre: nombre.trim(),
            descripcion: descripcion.trim(),
            estado,
            fecha_inicio: inicio,
            fecha_fin: fin
        }
    };
}

// LISTAR PROYECTOS
router.get('/', async (req, res) => {
    try {
        const idUsuario = req.session.usuario.id_usuario;

        const [proyectos] = await pool.execute(
            `SELECT ${CAMPOS_PROYECTO}
             FROM proyectos
             WHERE id_usuario = ?
             ORDER BY fecha_creacion DESC`,
            [idUsuario]
        );

        res.json(proyectos);

    } catch (error) {
        console.error('Error al listar proyectos:', error);

        res.status(500).json({
            mensaje: 'No se pudieron consultar los proyectos.'
        });
    }
});

// CONSULTAR UN PROYECTO
router.get('/:id', validarId, async (req, res) => {
    try {
        const idUsuario = req.session.usuario.id_usuario;

        const [proyectos] = await pool.execute(
            `SELECT ${CAMPOS_PROYECTO}
             FROM proyectos
             WHERE id_proyecto = ? AND id_usuario = ?`,
            [req.projectId, idUsuario]
        );

        if (proyectos.length === 0) {
            return res.status(404).json({
                mensaje: 'Proyecto no encontrado.'
            });
        }

        res.json(proyectos[0]);

    } catch (error) {
        console.error('Error al consultar proyecto:', error);

        res.status(500).json({
            mensaje: 'No se pudo consultar el proyecto.'
        });
    }
});

// CREAR PROYECTO
router.post('/', async (req, res) => {
    const validacion = validarProyecto(req.body);

    if (validacion.error) {
        return res.status(400).json({
            mensaje: validacion.error
        });
    }

    try {
        const idUsuario = req.session.usuario.id_usuario;
        const p = validacion.data;

        const [resultado] = await pool.execute(
            `INSERT INTO proyectos
             (nombre, descripcion, estado, fecha_inicio,
              fecha_fin, id_usuario)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                p.nombre,
                p.descripcion,
                p.estado,
                p.fecha_inicio,
                p.fecha_fin,
                idUsuario
            ]
        );

        res.status(201).json({
            mensaje: 'Proyecto creado correctamente.',
            id_proyecto: resultado.insertId
        });

    } catch (error) {
        console.error('Error al crear proyecto:', error);

        res.status(500).json({
            mensaje: 'No se pudo crear el proyecto.'
        });
    }
});

// EDITAR PROYECTO
router.put('/:id', validarId, async (req, res) => {
    const validacion = validarProyecto(req.body);

    if (validacion.error) {
        return res.status(400).json({
            mensaje: validacion.error
        });
    }

    try {
        const idUsuario = req.session.usuario.id_usuario;
        const p = validacion.data;

        const [existentes] = await pool.execute(
            `SELECT id_proyecto
             FROM proyectos
             WHERE id_proyecto = ? AND id_usuario = ?`,
            [req.projectId, idUsuario]
        );

        if (existentes.length === 0) {
            return res.status(404).json({
                mensaje: 'Proyecto no encontrado.'
            });
        }

        await pool.execute(
            `UPDATE proyectos
             SET nombre = ?,
                 descripcion = ?,
                 estado = ?,
                 fecha_inicio = ?,
                 fecha_fin = ?
             WHERE id_proyecto = ? AND id_usuario = ?`,
            [
                p.nombre,
                p.descripcion,
                p.estado,
                p.fecha_inicio,
                p.fecha_fin,
                req.projectId,
                idUsuario
            ]
        );

        res.json({
            mensaje: 'Proyecto actualizado correctamente.'
        });

    } catch (error) {
        console.error('Error al editar proyecto:', error);

        res.status(500).json({
            mensaje: 'No se pudo actualizar el proyecto.'
        });
    }
});

// ELIMINAR PROYECTO
router.delete('/:id', validarId, async (req, res) => {
    try {
        const idUsuario = req.session.usuario.id_usuario;

        const [resultado] = await pool.execute(
            `DELETE FROM proyectos
             WHERE id_proyecto = ? AND id_usuario = ?`,
            [req.projectId, idUsuario]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: 'Proyecto no encontrado.'
            });
        }

        res.json({
            mensaje: 'Proyecto eliminado correctamente.'
        });

    } catch (error) {
        console.error('Error al eliminar proyecto:', error);

        res.status(500).json({
            mensaje: 'No se pudo eliminar el proyecto.'
        });
    }
});

module.exports = router;
