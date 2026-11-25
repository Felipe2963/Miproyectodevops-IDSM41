
const pool = require('./connection');

async function probarBaseDatos() {
    let conexion;
    let idUsuario;

    try {
        conexion = await pool.getConnection();

        // Insertar un usuario de prueba
        const [resultado] = await conexion.execute(
            `INSERT INTO usuarios
            (nombre, correo, password_hash, rol)
            VALUES (?, ?, ?, ?)`,
            [
                'Usuario Prueba Node',
                `prueba_${Date.now()}@devops.com`,
                'hash_temporal',
                'usuario'
            ]
        );

        idUsuario = resultado.insertId;
        console.log('Usuario insertado. ID:', idUsuario);

        // Consultar el usuario insertado
        const [usuarios] = await conexion.execute(
            'SELECT * FROM usuarios WHERE id_usuario = ?',
            [idUsuario]
        );

        console.log('Usuario encontrado:');
        console.log(usuarios[0]);

        console.log('\nPrueba de inserción y consulta exitosa.');

    } catch (error) {
        console.error('Error en la prueba:', error.message);
        process.exitCode = 1;
    } finally {
        // Eliminar el registro de prueba
        if (conexion && idUsuario) {
            await conexion.execute(
                'DELETE FROM usuarios WHERE id_usuario = ?',
                [idUsuario]
            );
            console.log('Registro de prueba eliminado.');
        }

        if (conexion) conexion.release();

        await pool.end();
    }
}

probarBaseDatos();
