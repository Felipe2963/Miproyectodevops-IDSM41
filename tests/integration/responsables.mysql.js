// Prueba optativa contra MySQL real. Usar exclusivamente una base de pruebas.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const request = require('supertest');

async function main() {
    const database = process.env.DB_NAME;
    if (!database || !/^[a-zA-Z0-9_]+_test$/.test(database)) {
        throw new Error('DB_NAME debe indicar una base exclusiva de pruebas y terminar en _test.');
    }
    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || ''
    };
    const setup = await mysql.createConnection({ ...config, multipleStatements: true });
    try {
        const schema = fs.readFileSync(path.resolve(__dirname, '../../database/schema.sql'), 'utf8');
        await setup.query(schema.replace(/myproyectodevops/g, database));
    } finally { await setup.end(); }

    const app = require('../../app');
    const pool = require('../../database/connection');
    const userIds = [];
    let projectId;
    let checks = 0;
    const ok = texto => { checks++; console.log(`OK ${checks}: ${texto}`); };
    try {
        const [version] = await pool.query('SELECT VERSION() AS version');
        console.log(`MySQL real: ${version[0].version}; base: ${database}`);
        const stamp = `${Date.now()}_${process.pid}`;
        const password = 'PruebaMysql123!';
        const hash = await bcrypt.hash(password, 4);
        for (const nombre of ['Propietario', 'Ana', 'Luis', 'Ajeno']) {
            const [r] = await pool.execute(
                'INSERT INTO usuarios (nombre, correo, password_hash) VALUES (?, ?, ?)',
                [nombre, `${nombre}_${stamp}@test.invalid`, hash]);
            userIds.push(r.insertId);
        }
        const [owner, ana, luis, ajeno] = userIds;
        const [project] = await pool.execute('INSERT INTO proyectos (nombre, id_usuario) VALUES (?, ?)', ['Proyecto de integración', owner]);
        projectId = project.insertId;
        const [task] = await pool.execute('INSERT INTO tareas (titulo, id_proyecto, id_creador) VALUES (?, ?, ?)', ['Tarea de integración', projectId, owner]);
        const taskId = task.insertId;
        const ruta = `/api/responsables/tareas/${taskId}`;
        const agent = request.agent(app);
        await agent.post('/api/auth/login').send({ correo: `Propietario_${stamp}@test.invalid`, password }).expect(200);
        ok('Inicio de sesión con contraseña guardada en MySQL');
        await request(app).get(ruta).expect(401);
        ok('Acceso anónimo rechazado');
        const usuarios = await agent.get('/api/responsables/usuarios').expect(200);
        assert(usuarios.body.some(u => u.id_usuario === ana));
        assert(usuarios.body.every(u => !('password_hash' in u)));
        ok('Usuarios disponibles sin hashes');
        const tareas = await agent.get('/api/responsables/tareas').expect(200);
        assert(tareas.body.some(t => t.id_tarea === taskId));
        ok('Lista tareas del propietario');
        await agent.get(ruta).expect(200, []);
        ok('Tarea inicialmente sin responsables');
        const asignada = await agent.post(ruta).send({ id_usuario: ana }).expect(201);
        const id = asignada.body.id_asignacion;
        assert(Number.isInteger(id));
        ok('Asigna a Ana mediante HTTP');
        const [rows] = await pool.execute('SELECT id_usuario FROM responsables WHERE id_asignacion = ?', [id]);
        assert.equal(rows[0].id_usuario, ana);
        ok('Asignación persistida en la tabla real');
        const listado = await agent.get(ruta).expect(200);
        assert.equal(listado.body[0].nombre, 'Ana');
        ok('Consulta muestra el nombre asignado');
        await agent.post(ruta).send({ id_usuario: ana }).expect(409);
        ok('Restricción UNIQUE evita duplicados');
        await agent.put(`${ruta}/${id}`).send({ id_usuario: luis }).expect(200);
        const cambiada = await agent.get(ruta).expect(200);
        assert.equal(cambiada.body[0].nombre, 'Luis');
        assert.equal(cambiada.body[0].id_usuario, luis);
        ok('Cambia a Luis y confirma persistencia al consultar');
        await agent.put(`${ruta}/${id}`).send({ id_usuario: luis }).expect(200);
        ok('Guardar el mismo responsable funciona');
        const segunda = await agent.post(ruta).send({ id_usuario: ana }).expect(201);
        const multiples = await agent.get(ruta).expect(200);
        assert.equal(multiples.body.length, 2);
        ok('Permite varios responsables distintos');
        await agent.put(`${ruta}/${segunda.body.id_asignacion}`).send({ id_usuario: luis }).expect(409);
        ok('Cambiar hacia un responsable duplicado devuelve conflicto');
        await agent.post(ruta).send({ id_usuario: 'incorrecto' }).expect(400);
        ok('Valida los datos recibidos');
        const foreignAgent = request.agent(app);
        await foreignAgent.post('/api/auth/login').send({ correo: `Ajeno_${stamp}@test.invalid`, password }).expect(200);
        await foreignAgent.get(ruta).expect(404);
        await foreignAgent.post(ruta).send({ id_usuario: ajeno }).expect(404);
        await foreignAgent.put(`${ruta}/${id}`).send({ id_usuario: ajeno }).expect(404);
        await foreignAgent.delete(`${ruta}/${id}`).expect(404);
        ok('Otro propietario no puede consultar ni modificar asignaciones');
        await agent.delete(`${ruta}/${id}`).expect(200);
        await agent.delete(`${ruta}/${segunda.body.id_asignacion}`).expect(200);
        await agent.get(ruta).expect(200, []);
        const [remaining] = await pool.execute('SELECT COUNT(*) AS total FROM responsables WHERE id_tarea = ?', [taskId]);
        assert.equal(remaining[0].total, 0);
        ok('Quita asignaciones y verifica eliminación en MySQL');
        await agent.delete(`${ruta}/${id}`).expect(404);
        ok('Eliminar una asignación inexistente devuelve 404');
        console.log(`RESULTADO: ${checks} comprobaciones de integración aprobadas.`);
    } finally {
        try {
            if (projectId) await pool.execute('DELETE FROM proyectos WHERE id_proyecto = ?', [projectId]);
            for (const id of userIds) await pool.execute('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
            console.log('Datos creados por la prueba eliminados.');
        } finally { await pool.end(); }
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
