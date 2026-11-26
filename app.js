
const express = require('express');
const path = require('node:path');
const loginRouter = require('./backend/login');

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/auth', loginRouter);
app.use('/login', express.static(path.join(__dirname, 'frontend')));

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
