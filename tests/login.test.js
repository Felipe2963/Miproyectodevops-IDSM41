jest.mock('../database/connection', () => ({
    execute: jest.fn()
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const pool = require('../database/connection');
const app = require('../app');

let usuario;

beforeAll(async () => {
    usuario = {
        id_usuario: 1,
        nombre: 'Bryan',
        correo: 'bryan@example.com',
        password_hash: await bcrypt.hash('Prueba123!', 4),
        rol: 'usuario'
    };
});

beforeEach(() => {
    pool.execute.mockReset();
});

describe('Inicio de sesión — Issue #3', () => {
    test('Usuario válido inicia sesión y conserva su sesión', async () => {
        pool.execute.mockResolvedValue([[usuario]]);
        const agente = request.agent(app);

        const respuesta = await agente
            .post('/api/auth/login')
            .send({
                correo: usuario.correo,
                password: 'Prueba123!'
            });

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.usuario.correo).toBe(usuario.correo);
        expect(respuesta.body.usuario).not.toHaveProperty('password_hash');
        expect(respuesta.headers['set-cookie']).toBeDefined();

        const sesion = await agente.get('/api/auth/sesion');

        expect(sesion.status).toBe(200);
        expect(sesion.body.usuario.id_usuario).toBe(1);
    });

    test('Usuario incorrecto muestra error y no inicia sesión', async () => {
        pool.execute.mockResolvedValue([[]]);
        const agente = request.agent(app);

        const respuesta = await agente
            .post('/api/auth/login')
            .send({
                correo: 'inexistente@example.com',
                password: 'Prueba123!'
            });

        expect(respuesta.status).toBe(401);
        expect(respuesta.body.mensaje)
            .toBe('Correo o contraseña incorrectos.');

        const sesion = await agente.get('/api/auth/sesion');
        expect(sesion.status).toBe(401);
    });

    test('Contraseña incorrecta muestra error y no inicia sesión', async () => {
        pool.execute.mockResolvedValue([[usuario]]);
        const agente = request.agent(app);

        const respuesta = await agente
            .post('/api/auth/login')
            .send({
                correo: usuario.correo,
                password: 'Incorrecta'
            });

        expect(respuesta.status).toBe(401);
        expect(respuesta.body.mensaje)
            .toBe('Correo o contraseña incorrectos.');

        const sesion = await agente.get('/api/auth/sesion');
        expect(sesion.status).toBe(401);
    });

    test.each([
        {},
        { correo: '', password: 'Prueba123!' },
        { correo: 'bryan@example.com', password: '' },
        { correo: '   ', password: 'Prueba123!' },
        { correo: 'bryan@example.com', password: '   ' }
    ])('Rechaza campos vacíos: %j', async datos => {
        const respuesta = await request(app)
            .post('/api/auth/login')
            .send(datos);

        expect(respuesta.status).toBe(400);
        expect(pool.execute).not.toHaveBeenCalled();
    });

    test('Maneja un error de base de datos sin exponer detalles', async () => {
        pool.execute.mockRejectedValue(new Error('Detalle interno de MySQL'));

        const respuesta = await request(app)
            .post('/api/auth/login')
            .send({
                correo: usuario.correo,
                password: 'Prueba123!'
            });

        expect(respuesta.status).toBe(500);
        expect(respuesta.body.mensaje)
            .toBe('No se pudo iniciar sesión. Intenta nuevamente.');
    });
});