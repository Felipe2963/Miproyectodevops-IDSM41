jest.mock('../database/connection', () => ({ execute: jest.fn() }));
const request = require('supertest');
const bcrypt = require('bcryptjs');
const pool = require('../database/connection');
const app = require('../app');
let hash;
let agent;
const base = '/api/responsables';

beforeAll(async () => { hash = await bcrypt.hash('Prueba123!', 4); });
beforeEach(async () => {
    pool.execute.mockReset();
    agent = request.agent(app);
    pool.execute.mockResolvedValueOnce([[{
        id_usuario: 7, nombre: 'Propietario', correo: 'prueba@correo.com',
        password_hash: hash, rol: 'usuario'
    }]]);
    await agent.post('/api/auth/login')
        .send({ correo: 'prueba@correo.com', password: 'Prueba123!' }).expect(200);
    pool.execute.mockClear();
});
const autorizar = () => pool.execute.mockResolvedValueOnce([[{ id_tarea: 10 }]]);
const usuarioExiste = () => pool.execute.mockResolvedValueOnce([[{ id_usuario: 8 }]]);

describe('Asignación de responsables (issue 6)', () => {
    test.each([
        ['get', '/usuarios'], ['get', '/tareas'], ['get', '/tareas/10'],
        ['post', '/tareas/10'], ['put', '/tareas/10/2'], ['delete', '/tareas/10/2']
    ])('Requiere sesión: %s %s', async (metodo, ruta) => {
        await request(app)[metodo](base + ruta).send({ id_usuario: 8 }).expect(401);
        expect(pool.execute).not.toHaveBeenCalled();
    });

    test('Lista usuarios sin consultar contraseñas', async () => {
        pool.execute.mockResolvedValueOnce([[{ id_usuario: 8, nombre: 'Ana' }]]);
        const res = await agent.get(base + '/usuarios').expect(200);
        expect(res.body).toEqual([{ id_usuario: 8, nombre: 'Ana' }]);
        expect(pool.execute.mock.calls[0][0]).toBe('SELECT id_usuario, nombre FROM usuarios ORDER BY nombre');
    });

    test('Lista únicamente tareas de proyectos del usuario autenticado', async () => {
        pool.execute.mockResolvedValueOnce([[]]);
        await agent.get(base + '/tareas').expect(200, []);
        expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('WHERE p.id_usuario = ?'), [7]);
    });

    test('Asigna responsable', async () => {
        autorizar(); usuarioExiste();
        pool.execute.mockResolvedValueOnce([{ insertId: 2 }]);
        const res = await agent.post(base + '/tareas/10').send({ id_usuario: 8 }).expect(201);
        expect(res.body.id_asignacion).toBe(2);
        expect(pool.execute).toHaveBeenLastCalledWith(
            'INSERT INTO responsables (id_tarea, id_usuario) VALUES (?, ?)', [10, 8]);
    });

    test('Cambia el responsable de una asignación de la tarea autorizada', async () => {
        autorizar(); usuarioExiste();
        pool.execute.mockResolvedValueOnce([[{ id_asignacion: 2 }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);
        await agent.put(base + '/tareas/10/2').send({ id_usuario: 8 }).expect(200);
        expect(pool.execute).toHaveBeenLastCalledWith(expect.stringContaining('UPDATE responsables'), [8, 2, 10]);
    });

    test('Muestra responsables asignados', async () => {
        autorizar();
        const asignaciones = [{ id_asignacion: 2, id_tarea: 10, id_usuario: 8, nombre: 'Ana' }];
        pool.execute.mockResolvedValueOnce([asignaciones]);
        await agent.get(base + '/tareas/10').expect(200, asignaciones);
        expect(pool.execute).toHaveBeenLastCalledWith(expect.stringContaining('WHERE r.id_tarea = ?'), [10]);
    });

    test('Devuelve lista vacía para tarea sin responsables', async () => {
        autorizar(); pool.execute.mockResolvedValueOnce([[]]);
        await agent.get(base + '/tareas/10').expect(200, []);
    });

    test('Quita una asignación sin borrar la tarea ni el usuario', async () => {
        autorizar(); pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
        await agent.delete(base + '/tareas/10/2').expect(200);
        expect(pool.execute).toHaveBeenLastCalledWith(
            'DELETE FROM responsables WHERE id_asignacion = ? AND id_tarea = ?', [2, 10]);
    });

    test.each(['0', '-1', 'abc', '1.2', '9007199254740992'])('Rechaza ID de tarea inválido: %s', async id => {
        await agent.get(base + '/tareas/' + id).expect(400);
        expect(pool.execute).not.toHaveBeenCalled();
    });

    test.each([null, 0, -1, 1.5, '8', true, {}, []])('Rechaza usuario inválido: %j', async id => {
        autorizar();
        await agent.post(base + '/tareas/10').send({ id_usuario: id }).expect(400);
        expect(pool.execute).toHaveBeenCalledTimes(1);
    });

    test.each(['get', 'post', 'put', 'delete'])('Impide %s sobre tareas ajenas o inexistentes', async metodo => {
        pool.execute.mockResolvedValueOnce([[]]);
        await agent[metodo](base + '/tareas/10' + (['put', 'delete'].includes(metodo) ? '/2' : ''))
            .send({ id_usuario: 8 }).expect(404);
        expect(pool.execute).toHaveBeenCalledTimes(1);
        expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('p.id_usuario = ?'), [10, 7]);
    });

    test('Rechaza usuario inexistente', async () => {
        autorizar(); pool.execute.mockResolvedValueOnce([[]]);
        await agent.post(base + '/tareas/10').send({ id_usuario: 8 }).expect(404);
        expect(pool.execute).toHaveBeenCalledTimes(2);
    });

    test.each(['post', 'put'])('Evita duplicados al %s', async metodo => {
        autorizar(); usuarioExiste();
        if (metodo === 'put') pool.execute.mockResolvedValueOnce([[{ id_asignacion: 2 }]]);
        pool.execute.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
        await agent[metodo](base + '/tareas/10' + (metodo === 'put' ? '/2' : ''))
            .send({ id_usuario: 8 }).expect(409);
    });

    test.each(['put', 'delete'])('Rechaza ID de asignación inválido al %s', async metodo => {
        autorizar();
        await agent[metodo](base + '/tareas/10/abc').send({ id_usuario: 8 }).expect(400);
        expect(pool.execute).toHaveBeenCalledTimes(1);
    });

    test('No cambia asignaciones de otra tarea', async () => {
        autorizar(); usuarioExiste(); pool.execute.mockResolvedValueOnce([[]]);
        await agent.put(base + '/tareas/10/99').send({ id_usuario: 8 }).expect(404);
        expect(pool.execute).toHaveBeenCalledTimes(3);
    });

    test('Devuelve 404 al quitar asignación inexistente o de otra tarea', async () => {
        autorizar(); pool.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);
        await agent.delete(base + '/tareas/10/99').expect(404);
    });

    test('Controla referencias eliminadas durante la asignación', async () => {
        autorizar(); usuarioExiste();
        pool.execute.mockRejectedValueOnce({ code: 'ER_NO_REFERENCED_ROW_2' });
        await agent.post(base + '/tareas/10').send({ id_usuario: 8 }).expect(409);
    });

    test('Controla fallos de base de datos sin exponer detalles', async () => {
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        pool.execute.mockRejectedValueOnce(new Error('detalle privado'));
        try {
            const res = await agent.get(base + '/usuarios').expect(500);
            expect(JSON.stringify(res.body)).not.toContain('detalle privado');
        } finally { log.mockRestore(); }
    });

    test('Protege la pantalla y la sirve con sesión', async () => {
        await request(app).get('/responsables').expect(302).expect('Location', '/login/');
        const res = await agent.get('/responsables').expect(200);
        expect(res.text).toContain('Asignación de responsables');
    });
});
