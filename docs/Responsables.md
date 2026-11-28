# Asignación de responsables (issue 6)

## Uso

1. Configurar MySQL con `database/schema.sql` y `.env` como indica el README.
2. Instalar dependencias con `npm ci` e iniciar con `npm start`.
3. Iniciar sesión en `/login/` y abrir `/responsables` (también desde Proyectos).
4. Seleccionar una tarea, elegir un usuario registrado y pulsar **Asignar responsable**.
5. Usar **Cambiar** para sustituir el usuario de una asignación o **Quitar** para eliminarla.

La pantalla muestra los nombres y fechas de asignación. Si no hay tareas, primero
deben crearse mediante el módulo de tareas o datos de prueba de la base de datos.
Este módulo no crea tareas ni proyectos.

Se reutiliza `responsables` y su restricción única `(id_tarea, id_usuario)`.
Una tarea admite varios responsables distintos; cambiar uno conserva las demás
asignaciones. No hace falta una migración. Se seleccionan usuarios existentes;
no es necesario agregar un CRUD de usuarios para cumplir el issue.

## API

Todas las rutas requieren la sesión de inicio de sesión existente. Solo el
propietario del proyecto puede consultar o administrar responsables de sus tareas.

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/api/responsables/usuarios` | Usuarios disponibles (ID y nombre) |
| GET | `/api/responsables/tareas` | Tareas de proyectos del usuario autenticado |
| GET | `/api/responsables/tareas/:id` | Asignaciones de la tarea con nombre del usuario |
| POST | `/api/responsables/tareas/:id` | Asignar usuario |
| PUT | `/api/responsables/tareas/:id/:asignacion` | Cambiar responsable |
| DELETE | `/api/responsables/tareas/:id/:asignacion` | Quitar asignación |

POST y PUT reciben JSON: `{ "id_usuario": 8 }`.
Respuestas: 201 al asignar; 200 al consultar, cambiar o quitar; 400 para datos
inválidos; 401 sin sesión; 404 para recursos inexistentes o no autorizados;
409 para duplicados o referencias eliminadas concurrentemente; 500 ante fallos internos.

## Verificación

`npm test` ejecuta la suite existente y `tests/responsables.test.js`.
Las pruebas nuevas cubren asignar, cambiar, mostrar y quitar responsables,
sesión, aislamiento entre propietarios, validaciones, duplicados y errores.
Las pruebas HTTP usan Jest/Supertest con MySQL simulado; no sustituyen una prueba
de integración contra una instancia real de MySQL.

Prueba manual con MySQL: iniciar sesión como propietario de un proyecto con una
tarea, asignar al usuario A, recargar y comprobar su nombre, cambiar por el usuario
B, recargar de nuevo y comprobar la persistencia. Intentar asignar B otra vez debe
mostrar el conflicto sin duplicarlo. Quitar la asignación debe dejar la lista vacía.

La rama es `feature/responsables`, creada desde `develop`. El PR debe apuntar a
`develop` y mencionar `Closes #6`. El merge corresponde a la profesora.

## Prueba de integración con MySQL real

Se validó con MySQL 8.4.13: 17 comprobaciones aprobadas, incluyendo autenticación,
asignación, consulta, cambio, persistencia, varios responsables, restricciones de
duplicados, eliminación y aislamiento entre propietarios.

La prueba reproducible está en `tests/integration/responsables.mysql.js`.
Requiere una instancia de MySQL y una cuenta con permiso para crear el esquema.
Por seguridad, `DB_NAME` debe terminar en `_test`; no usar una base de producción.
El script carga `database/schema.sql` y elimina los registros que crea al finalizar.
No se ejecuta durante `npm test` para mantener las pruebas unitarias independientes
de MySQL. Ejemplo en PowerShell con una instancia de prueba en el puerto 13316:

```powershell
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '13316'
$env:DB_USER = 'root'
$env:DB_PASSWORD = '' # Ajustar a la instancia de prueba.
$env:DB_NAME = 'responsables_issue6_test'
node tests/integration/responsables.mysql.js
```