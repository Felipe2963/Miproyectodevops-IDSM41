
const pool = require('./connection');

async function verificarConexion() {
    let conexion;

    try {
        conexion = await pool.getConnection();

        console.log('Conexión con MySQL establecida correctamente.');

        const [filas] = await conexion.query(
            'SELECT DATABASE() AS base_datos, VERSION() AS version'
        );

        console.log('Base de datos:', filas[0].base_datos);
        console.log('Versión de MySQL:', filas[0].version);

        console.log('\nVerificación completada correctamente.');
    } catch (error) {
        console.error('Error al conectar con MySQL:');
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        if (conexion) {
            conexion.release();
        }

        await pool.end();
    }
}

verificarConexion();
