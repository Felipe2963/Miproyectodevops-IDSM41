const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { randomBytes } = require('node:crypto');
const pool = require('../database/connection');

const router = express.Router();

router.use(session({
    name: 'devops.sid',
    secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 1000
    }
}));

router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

router.post('/login', async (req, res) => {
    const { correo, password } = req.body || {};

    if (
        typeof correo !== 'string' ||
        typeof password !== 'string' ||
        !correo.trim() ||
        !password.trim()
    ) {
        return res.status(400).json({
            mensaje: 'Completa el correo y la contraseña.'
        });
    }

    try {
        const [usuarios] = await pool.execute(
            `SELECT id_usuario, nombre, correo, password_hash, rol
             FROM usuarios WHERE correo = ? LIMIT 1`,
            [correo.trim()]
        );

        const usuario = usuarios[0];

        if (
            !usuario ||
            !(await bcrypt.compare(password, usuario.password_hash))
        ) {
            return res.status(401).json({
                mensaje: 'Correo o contraseña incorrectos.'
            });
        }

        // Cambia el identificador de sesión al autenticar al usuario.
        await new Promise((resolve, reject) => {
            req.session.regenerate(error => {
                if (error) return reject(error);
                resolve();
            });
        });

        // Nunca guardar ni devolver el hash de la contraseña.
        req.session.usuario = {
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.rol
        };

        await new Promise((resolve, reject) => {
            req.session.save(error => {
                if (error) return reject(error);
                resolve();
            });
        });

        return res.status(200).json({
            mensaje: 'Inicio de sesión correcto.',
            usuario: req.session.usuario
        });
    } catch {
        return res.status(500).json({
            mensaje: 'No se pudo iniciar sesión. Intenta nuevamente.'
        });
    }
});

router.get('/sesion', (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).json({
            mensaje: 'No hay una sesión activa.'
        });
    }

    return res.json({ usuario: req.session.usuario });
});

module.exports = router;