
jest.mock('../database/connection', () => ({
    execute: jest.fn()
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const pool = require('../database/connection');
const app = require('../app');

let passwordHash;

const usuario = {
    id_usuario: 7,
    nombre: 'Usuario Prueba',
    correo: 'prueba@correo.com',
    password_hash: '',
    rol: 'usuario'
};

async function iniciarSesion() {
    const agent = request.agent(app);

    pool.execute.mockResolvedValueOnce([
        [{ ...usuario, password_hash: passwordHash }]
    ]);

    await agent.post('/api/auth/login')
        .send({
            correo: usuario.correo,
            password: 'Prueba123!'
        })
        .expect(200);

    return agent;
}

beforeAll(async () => {
    passwordHash = await bcrypt.hash('Prueba123!', 10);
});

beforeEach(() => {
    pool.execute.mockReset();
});

const datosTarea = {
    titulo: 'Tarea de prueba',
    descripcion: 'Descripción inicial',
    estado: 'pendiente',
    prioridad: 'media',
    fecha_inicio: '2026-11-26',
    fecha_vencimiento: '2026-12-26',
    id_proyecto: 15
};

describe('CRUD de tareas', () => {

    test('Crear tarea', async () => {
        const agent = await iniciarSesion();

        pool.execute
            .mockResolvedValueOnce([
                [{ id_proyecto: 15 }]
            ])
            .mockResolvedValueOnce([
                { insertId: 25 }
            ]);

        const respuesta = await agent
            .post('/api/tareas')
            .send(datosTarea)
            .expect(201);

        expect(respuesta.body.id_tarea).toBe(25);
    });

    test('Cambiar descripción de una tarea', async () => {
        const agent = await iniciarSesion();

        pool.execute
            .mockResolvedValueOnce([
                [{ id_tarea: 25 }]
            ])
            .mockResolvedValueOnce([
                [{ id_proyecto: 15 }]
            ])
            .mockResolvedValueOnce([
                { affectedRows: 1 }
            ]);

        const respuesta = await agent
            .put('/api/tareas/25')
            .send({
                ...datosTarea,
                descripcion: 'Descripción modificada'
            })
            .expect(200);

        expect(respuesta.body.mensaje)
            .toBe('Tarea actualizada correctamente.');
    });

    test('Eliminar tarea', async () => {
        const agent = await iniciarSesion();

        pool.execute.mockResolvedValueOnce([
            { affectedRows: 1 }
        ]);

        const respuesta = await agent
            .delete('/api/tareas/25')
            .expect(200);

        expect(respuesta.body.mensaje)
            .toBe('Tarea eliminada correctamente.');
    });

    test('Consultar tareas', async () => {
        const agent = await iniciarSesion();

        pool.execute.mockResolvedValueOnce([
            [{
                id_tarea: 25,
                titulo: 'Tarea de prueba',
                descripcion: 'Descripción inicial',
                estado: 'pendiente',
                prioridad: 'media',
                id_proyecto: 15,
                id_creador: 7
            }]
        ]);

        const respuesta = await agent
            .get('/api/tareas')
            .expect(200);

        expect(respuesta.body).toHaveLength(1);
        expect(respuesta.body[0].titulo)
            .toBe('Tarea de prueba');
    });

});
