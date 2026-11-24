
const request = require('supertest');
const app = require('../app');

describe('Pruebas del servidor Backend', () => {

    test('El servidor responde correctamente en la ruta principal', async () => {
        const response = await request(app).get('/');

        expect(response.statusCode).toBe(200);
    });

    test('El servidor devuelve un mensaje de funcionamiento', async () => {
        const response = await request(app).get('/');

        expect(response.body.estado).toBe('OK');
    });

});
