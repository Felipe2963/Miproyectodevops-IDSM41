
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

const datosProyecto = {
    nombre: 'Proyecto DevOps',
    descripcion: 'Proyecto de prueba',
    estado: 'activo',
    fecha_inicio: '2026-11-26',
    fecha_fin: '2026-12-26'
};

describe('CRUD de proyectos', () => {

    test('Crear proyecto', async () => {
        const agent = await iniciarSesion();

        pool.execute.mockResolvedValueOnce([
            { insertId: 15 }
        ]);

        const respuesta = await agent
            .post('/api/proyectos')
            .send(datosProyecto)
            .expect(201);

        expect(respuesta.body.id_proyecto).toBe(15);
        expect(pool.execute).toHaveBeenLastCalledWith(
            expect.stringContaining('INSERT INTO proyectos'),
            [
                'Proyecto DevOps',
                'Proyecto de prueba',
                'activo',
                '2026-11-26',
                '2026-12-26',
                7
            ]
        );
    });

    test('Editar proyecto', async () => {
        const agent = await iniciarSesion();

        pool.execute
            .mockResolvedValueOnce([
                [{ id_proyecto: 15 }]
            ])
            .mockResolvedValueOnce([
                { affectedRows: 1 }
            ]);

        const respuesta = await agent
            .put('/api/proyectos/15')
            .send({
                ...datosProyecto,
                nombre: 'Proyecto DevOps Modificado'
            })
            .expect(200);

        expect(respuesta.body.mensaje)
            .toBe('Proyecto actualizado correctamente.');
    });

    test('Eliminar proyecto', async () => {
        const agent = await iniciarSesion();

        pool.execute.mockResolvedValueOnce([
            { affectedRows: 1 }
        ]);

        const respuesta = await agent
            .delete('/api/proyectos/15')
            .expect(200);

        expect(respuesta.body.mensaje)
            .toBe('Proyecto eliminado correctamente.');
    });

    test('Listar proyectos', async () => {
        const agent = await iniciarSesion();

        pool.execute.mockResolvedValueOnce([
            [{
                id_proyecto: 15,
                nombre: 'Proyecto DevOps',
                descripcion: 'Proyecto de prueba',
                estado: 'activo',
                id_usuario: 7
            }]
        ]);

        const respuesta = await agent
            .get('/api/proyectos')
            .expect(200);

        expect(respuesta.body).toHaveLength(1);
        expect(respuesta.body[0].nombre)
            .toBe('Proyecto DevOps');
    });

});
