
const form = document.getElementById('project-form');
const table = document.getElementById('projects-table');
const mensaje = document.getElementById('mensaje');
const projectId = document.getElementById('project-id');
const dialog = document.getElementById('details-dialog');

const formTitle = document.getElementById('form-title');
const saveButton = document.getElementById('save-button');

let proyectos = [];

// Formatear fechas para los campos HTML
function normalizarFecha(fecha) {
    if (!fecha) return '';

    return String(fecha).slice(0, 10);
}

// Mostrar mensajes
function mostrarMensaje(texto, error = false) {
    mensaje.textContent = texto;
    mensaje.className = error ? 'error' : 'success';
}

// Volver al modo de creación
function modoCrear() {
    projectId.value = '';

    formTitle.textContent = 'Crear proyecto';
    saveButton.textContent = 'Guardar proyecto';
}

// Limpiar el formulario sin generar ciclos de reset
function limpiarFormulario() {
    form.reset();
    modoCrear();
}

// Realizar peticiones a la API
async function api(url, options = {}) {
    const respuesta = await fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    let datos = {};

    try {
        datos = await respuesta.json();
    } catch {
        datos = {};
    }

    if (respuesta.status === 401) {
        window.location.href = '/login/';
        throw new Error('Debes iniciar sesión.');
    }

    if (!respuesta.ok) {
        throw new Error(
            datos.mensaje || 'Ocurrió un error en la operación.'
        );
    }

    return datos;
}

// Crear celdas seguras para la tabla
function crearCelda(texto) {
    const td = document.createElement('td');
    td.textContent = texto ?? '';
    return td;
}

// Crear botones de acciones
function crearBoton(texto, accion, id, clase) {
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = texto;
    button.dataset.action = accion;
    button.dataset.id = id;
    button.className = clase;

    return button;
}

// Mostrar los proyectos
function renderizarProyectos() {
    table.replaceChildren();

    if (proyectos.length === 0) {
        const tr = document.createElement('tr');
        const td = crearCelda('No hay proyectos registrados.');

        td.colSpan = 6;
        tr.appendChild(td);
        table.appendChild(tr);

        return;
    }

    proyectos.forEach(proyecto => {
        const tr = document.createElement('tr');

        tr.appendChild(crearCelda(proyecto.id_proyecto));
        tr.appendChild(crearCelda(proyecto.nombre));
        tr.appendChild(crearCelda(proyecto.estado));

        tr.appendChild(
            crearCelda(normalizarFecha(proyecto.fecha_inicio))
        );

        tr.appendChild(
            crearCelda(normalizarFecha(proyecto.fecha_fin))
        );

        const acciones = document.createElement('td');

        acciones.appendChild(
            crearBoton(
                'Consultar',
                'details',
                proyecto.id_proyecto,
                'secondary'
            )
        );

        acciones.appendChild(
            crearBoton(
                'Editar',
                'edit',
                proyecto.id_proyecto,
                'edit'
            )
        );

        acciones.appendChild(
            crearBoton(
                'Eliminar',
                'delete',
                proyecto.id_proyecto,
                'delete'
            )
        );

        tr.appendChild(acciones);
        table.appendChild(tr);
    });
}

// Listar proyectos
async function listarProyectos() {
    try {
        proyectos = await api('/api/proyectos');
        renderizarProyectos();
    } catch (error) {
        mostrarMensaje(error.message, true);
    }
}

// Crear o actualizar proyectos
form.addEventListener('submit', async event => {
    event.preventDefault();

    const id = projectId.value;

    const datos = {
        nombre: document.getElementById('nombre').value.trim(),
        descripcion: document.getElementById('descripcion').value,
        estado: document.getElementById('estado').value,
        fecha_inicio:
            document.getElementById('fecha_inicio').value || null,
        fecha_fin:
            document.getElementById('fecha_fin').value || null
    };

    saveButton.disabled = true;

    try {
        if (id) {
            // ACTUALIZAR PROYECTO
            await api(`/api/proyectos/${id}`, {
                method: 'PUT',
                body: JSON.stringify(datos)
            });

            mostrarMensaje('Proyecto actualizado correctamente.');

        } else {
            // CREAR PROYECTO
            await api('/api/proyectos', {
                method: 'POST',
                body: JSON.stringify(datos)
            });

            mostrarMensaje('Proyecto creado correctamente.');
        }

        limpiarFormulario();

        await listarProyectos();

    } catch (error) {
        mostrarMensaje(error.message, true);

    } finally {
        saveButton.disabled = false;
    }
});

// Consultar, editar y eliminar
table.addEventListener('click', async event => {

    const button = event.target.closest('button[data-action]');

    if (!button || !table.contains(button)) {
        return;
    }

    const id = button.dataset.id;
    const accion = button.dataset.action;

    button.disabled = true;

    try {

        // CONSULTAR PROYECTO
        if (accion === 'details') {

            const proyecto = await api(`/api/proyectos/${id}`);

            const content =
                document.getElementById('details-content');

            content.replaceChildren();

            const campos = [
                ['Nombre', proyecto.nombre],
                ['Descripción', proyecto.descripcion],
                ['Estado', proyecto.estado],
                ['Fecha de inicio', normalizarFecha(proyecto.fecha_inicio)],
                ['Fecha de finalización', normalizarFecha(proyecto.fecha_fin)],
                ['ID del usuario', proyecto.id_usuario],
                ['Fecha de creación', proyecto.fecha_creacion]
            ];

            campos.forEach(([label, value]) => {
                const p = document.createElement('p');

                p.textContent =
                    `${label}: ${value ?? 'No especificado'}`;

                content.appendChild(p);
            });

            dialog.showModal();
        }

        // EDITAR PROYECTO
        else if (accion === 'edit') {

            const proyecto = await api(`/api/proyectos/${id}`);

            projectId.value = proyecto.id_proyecto;

            document.getElementById('nombre').value =
                proyecto.nombre;

            document.getElementById('descripcion').value =
                proyecto.descripcion || '';

            document.getElementById('estado').value =
                proyecto.estado;

            document.getElementById('fecha_inicio').value =
                normalizarFecha(proyecto.fecha_inicio);

            document.getElementById('fecha_fin').value =
                normalizarFecha(proyecto.fecha_fin);

            formTitle.textContent = 'Editar proyecto';

            saveButton.textContent = 'Actualizar proyecto';

            mostrarMensaje(
                `Editando proyecto: ${proyecto.nombre}`
            );

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

            document.getElementById('nombre').focus();
        }

        // ELIMINAR PROYECTO
        else if (accion === 'delete') {

            const confirmar = confirm(
                '¿Estás seguro de eliminar este proyecto?'
            );

            if (!confirmar) {
                return;
            }

            await api(`/api/proyectos/${id}`, {
                method: 'DELETE'
            });

            mostrarMensaje('Proyecto eliminado correctamente.');

            // Si se estaba editando el proyecto eliminado,
            // limpiar el formulario.
            if (projectId.value === id) {
                limpiarFormulario();
            }

            await listarProyectos();
        }

    } catch (error) {
        mostrarMensaje(error.message, true);

    } finally {
        button.disabled = false;
    }
});

// Botón de cerrar detalles
document.getElementById('close-dialog')
    .addEventListener('click', () => {
        dialog.close();
    });

// Botón Limpiar: restablecer el formulario
form.addEventListener('reset', () => {
    modoCrear();
});

// Cargar proyectos al entrar
listarProyectos();
