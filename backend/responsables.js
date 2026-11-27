const express = require('express');
const pool = require('../database/connection');
const router = express.Router();

router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!req.session?.usuario) {
        return res.status(401).json({ mensaje: 'Debes iniciar sesión.' });
    }
    next();
});

const idValido = valor => /^[1-9]\d*$/.test(String(valor)) && Number.isSafeInteger(Number(valor));

router.get('/usuarios', async (req, res, next) => {
    try {
        const [usuarios] = await pool.execute(
            'SELECT id_usuario, nombre FROM usuarios ORDER BY nombre'
        );
        res.json(usuarios);
    } catch (error) { next(error); }
});

// El propietario del proyecto administra las asignaciones de sus tareas.
router.get('/tareas', async (req, res, next) => {
    try {
        const [tareas] = await pool.execute(
            `SELECT t.id_tarea, t.titulo, p.nombre AS proyecto
             FROM tareas t JOIN proyectos p ON p.id_proyecto = t.id_proyecto
             WHERE p.id_usuario = ? ORDER BY p.nombre, t.titulo`,
            [req.session.usuario.id_usuario]
        );
        res.json(tareas);
    } catch (error) { next(error); }
});

router.use('/tareas/:id', async (req, res, next) => {
    if (!idValido(req.params.id)) {
        return res.status(400).json({ mensaje: 'Identificador de tarea inválido.' });
    }
    try {
        const [tareas] = await pool.execute(
            `SELECT t.id_tarea FROM tareas t
             JOIN proyectos p ON p.id_proyecto = t.id_proyecto
             WHERE t.id_tarea = ? AND p.id_usuario = ?`,
            [Number(req.params.id), req.session.usuario.id_usuario]
        );
        if (!tareas.length) {
            return res.status(404).json({ mensaje: 'Tarea no encontrada.' });
        }
        req.tareaId = Number(req.params.id);
        next();
    } catch (error) { next(error); }
});

router.get('/tareas/:id', async (req, res, next) => {
    try {
        const [responsables] = await pool.execute(
            `SELECT r.id_asignacion, r.id_tarea, r.id_usuario, u.nombre, r.fecha_asignacion
             FROM responsables r JOIN usuarios u ON u.id_usuario = r.id_usuario
             WHERE r.id_tarea = ? ORDER BY r.id_asignacion`, [req.tareaId]
        );
        res.json(responsables);
    } catch (error) { next(error); }
});

async function validarUsuario(req, res, next) {
    const id = req.body?.id_usuario;
    if (typeof id !== 'number' || !idValido(id)) {
        return res.status(400).json({ mensaje: 'Selecciona un usuario válido.' });
    }
    try {
        const [usuarios] = await pool.execute(
            'SELECT id_usuario FROM usuarios WHERE id_usuario = ?', [id]
        );
        if (!usuarios.length) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }
        next();
    } catch (error) { next(error); }
}

function validarAsignacion(req, res, next) {
    if (!idValido(req.params.asignacion)) {
        return res.status(400).json({ mensaje: 'Identificador de asignación inválido.' });
    }
    next();
}

router.post('/tareas/:id', validarUsuario, async (req, res, next) => {
    try {
        const [resultado] = await pool.execute(
            'INSERT INTO responsables (id_tarea, id_usuario) VALUES (?, ?)',
            [req.tareaId, req.body.id_usuario]
        );
        res.status(201).json({
            mensaje: 'Responsable asignado correctamente.',
            id_asignacion: resultado.insertId
        });
    } catch (error) { next(error); }
});

router.put('/tareas/:id/:asignacion', validarAsignacion, validarUsuario, async (req, res, next) => {
    try {
        // La asignación debe pertenecer a la tarea autorizada.
        const [asignaciones] = await pool.execute(
            'SELECT id_asignacion FROM responsables WHERE id_asignacion = ? AND id_tarea = ?',
            [Number(req.params.asignacion), req.tareaId]
        );
        if (!asignaciones.length) {
            return res.status(404).json({ mensaje: 'Asignación no encontrada.' });
        }
        await pool.execute(
            `UPDATE responsables SET id_usuario = ?, fecha_asignacion = CURRENT_TIMESTAMP
             WHERE id_asignacion = ? AND id_tarea = ?`,
            [req.body.id_usuario, Number(req.params.asignacion), req.tareaId]
        );
        res.json({ mensaje: 'Responsable actualizado correctamente.' });
    } catch (error) { next(error); }
});

router.delete('/tareas/:id/:asignacion', validarAsignacion, async (req, res, next) => {
    try {
        const [resultado] = await pool.execute(
            'DELETE FROM responsables WHERE id_asignacion = ? AND id_tarea = ?',
            [Number(req.params.asignacion), req.tareaId]
        );
        if (!resultado.affectedRows) {
            return res.status(404).json({ mensaje: 'Asignación no encontrada.' });
        }
        res.json({ mensaje: 'Asignación eliminada correctamente.' });
    } catch (error) { next(error); }
});

router.use((error, req, res, next) => {
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ mensaje: 'El usuario ya es responsable de esta tarea.' });
    }
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(409).json({ mensaje: 'La tarea o el usuario ya no está disponible.' });
    }
    console.error('Error en responsables:', error);
    res.status(500).json({ mensaje: 'No se pudo completar la operación de responsables.' });
});

module.exports = router;
