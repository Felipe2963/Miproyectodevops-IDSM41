const tarea = document.getElementById('tarea');
const usuario = document.getElementById('usuario');
const guardar = document.getElementById('guardar');
const cancelar = document.getElementById('cancelar');
const tabla = document.getElementById('asignaciones');
const mensaje = document.getElementById('mensaje');
let editando = null;
let ocupado = false;
let consulta = 0;

function informar(texto, error = false) {
    mensaje.textContent = texto;
    mensaje.className = error ? 'error' : 'success';
}

async function api(ruta, opciones) {
    const respuesta = await fetch(`/api/responsables${ruta}`, opciones);
    if (respuesta.status === 401) {
        window.location.assign('/login/');
        throw new Error('Inicia sesión para continuar.');
    }
    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo completar la operación.');
    return datos;
}

function actualizarControles() {
    guardar.disabled = ocupado || !tarea.value || !usuario.value;
    tarea.disabled = ocupado || tarea.options.length <= 1;
    usuario.disabled = ocupado || usuario.options.length <= 1;
    cancelar.disabled = ocupado;
    tabla.querySelectorAll('button').forEach(boton => { boton.disabled = ocupado; });
}

function limpiarEdicion() {
    editando = null;
    usuario.value = '';
    guardar.textContent = 'Asignar responsable';
    cancelar.hidden = true;
    actualizarControles();
}

function filaVacia(texto) {
    tabla.replaceChildren();
    const celda = document.createElement('td');
    celda.colSpan = 3;
    celda.textContent = texto;
    const fila = document.createElement('tr');
    fila.append(celda);
    tabla.append(fila);
}

async function cargarAsignaciones() {
    const version = ++consulta;
    filaVacia(tarea.value ? 'Cargando responsables...' : 'Selecciona una tarea.');
    if (!tarea.value) return;
    try {
        const datos = await api(`/tareas/${tarea.value}`);
        if (version !== consulta) return;
        filaVacia('Esta tarea no tiene responsables asignados.');
        if (datos.length) tabla.replaceChildren();
        datos.forEach(asignacion => {
            const fila = document.createElement('tr');
            [asignacion.nombre, new Date(asignacion.fecha_asignacion).toLocaleString('es')].forEach(valor => {
                const celda = document.createElement('td');
                celda.textContent = valor;
                fila.append(celda);
            });
            const acciones = document.createElement('td');
            const cambiar = document.createElement('button');
            cambiar.textContent = 'Cambiar';
            cambiar.type = 'button';
            cambiar.addEventListener('click', () => {
                editando = asignacion.id_asignacion;
                usuario.value = String(asignacion.id_usuario);
                guardar.textContent = 'Guardar cambio';
                cancelar.hidden = false;
                actualizarControles();
                usuario.focus();
            });
            const eliminar = document.createElement('button');
            eliminar.textContent = 'Quitar';
            eliminar.type = 'button';
            eliminar.className = 'delete';
            eliminar.addEventListener('click', async () => {
                if (ocupado || !window.confirm(`¿Quitar a ${asignacion.nombre} de esta tarea?`)) return;
                await mutar(`/tareas/${tarea.value}/${asignacion.id_asignacion}`, { method: 'DELETE' });
            });
            acciones.append(cambiar, eliminar);
            fila.append(acciones);
            tabla.append(fila);
        });
        actualizarControles();
    } catch (error) {
        if (version !== consulta) return;
        filaVacia('No se pudieron cargar los responsables. Vuelve a seleccionar la tarea para reintentar.');
        informar(error.message, true);
    }
}

async function mutar(ruta, opciones) {
    ocupado = true;
    actualizarControles();
    try {
        const resultado = await api(ruta, opciones);
        limpiarEdicion();
        informar(resultado.mensaje);
        await cargarAsignaciones();
    } catch (error) { informar(error.message, true); }
    finally {
        ocupado = false;
        actualizarControles();
    }
}

document.getElementById('responsables-form').addEventListener('submit', async evento => {
    evento.preventDefault();
    if (ocupado || !tarea.value || !usuario.value) return;
    await mutar(`/tareas/${tarea.value}${editando ? `/${editando}` : ''}`, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario: Number(usuario.value) })
    });
});
tarea.addEventListener('change', () => {
    informar('');
    limpiarEdicion();
    cargarAsignaciones();
});
usuario.addEventListener('change', actualizarControles);
cancelar.addEventListener('click', limpiarEdicion);

(async () => {
    try {
        const [tareas, usuarios] = await Promise.all([api('/tareas'), api('/usuarios')]);
        tarea.replaceChildren(new Option(tareas.length ? 'Selecciona una tarea' : 'No hay tareas en tus proyectos', ''));
        usuario.replaceChildren(new Option('Selecciona un usuario', ''));
        tareas.forEach(item => tarea.add(new Option(`${item.proyecto} / ${item.titulo}`, item.id_tarea)));
        usuarios.forEach(item => usuario.add(new Option(item.nombre, item.id_usuario)));
        if (!tareas.length) informar('Primero debe existir una tarea en uno de tus proyectos.');
        actualizarControles();
    } catch (error) { informar(error.message, true); }
})();
