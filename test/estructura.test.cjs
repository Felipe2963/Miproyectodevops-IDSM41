const { statSync } = require('node:fs');
const { resolve } = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');

for (const carpeta of ['backend', 'frontend', 'database', 'docs']) {
  test(`El proyecto incluye la carpeta ${carpeta}`, () => {
    const ruta = resolve(__dirname, '..', carpeta);
    assert.ok(statSync(ruta).isDirectory(), `${carpeta} debe ser un directorio`);
  });
}
