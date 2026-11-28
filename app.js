
const express = require('express');
const path = require('node:path');

const loginRouter = require('./backend/login');
const projectsRouter = require('./backend/projects');
const responsablesRouter = require('./backend/responsables');
const tasksRouter = require('./backend/tasks');
const sessionMiddleware = require('./backend/session');

const app = express();
const PORT = process.env.PORT || 3000;

const frontendPath = path.join(__dirname, 'frontend');

app.use(express.json());

// Compartir la sesión entre todos los módulos
app.use(sessionMiddleware);

// Rutas de autenticación
app.use('/api/auth', loginRouter);

// Rutas de proyectos
app.use('/api/proyectos', projectsRouter);
app.use('/api/responsables', responsablesRouter);

app.get('/responsables', (req, res) => {
    if (!req.session?.usuario) return res.redirect('/login/');
    res.sendFile(path.join(frontendPath, 'responsables.html'));
});

//Rutas de tareas
app.use('/api/tareas', tasksRouter);

// Archivos del Login
app.use('/login', express.static(frontendPath));

// Archivos estáticos del módulo proyectos
app.use('/assets', express.static(frontendPath));

// Página de proyectos protegida
app.get('/projects', (req, res) => {
    if (!req.session || !req.session.usuario) {
        return res.redirect('/login/');
    }

    res.sendFile(path.join(frontendPath, 'projects.html'));
});

// Ruta principal
app.get('/', (req, res) => {
    res.status(200).json({
        mensaje: 'Servidor Backend funcionando correctamente',
        responsable: 'Jose Ramon Caro Salas',
        estado: 'OK'
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor funcionando en http://localhost:${PORT}`);
    });
}

module.exports = app;
