const formulario = document.getElementById('login-form');
const boton = document.getElementById('ingresar');
const mensaje = document.getElementById('mensaje');

formulario.addEventListener('submit', async event => {
    event.preventDefault();

    const correo = formulario.elements.correo.value.trim();
    const password = formulario.elements.password.value;

    mensaje.className = '';
    mensaje.textContent = '';

    if (!correo || !password.trim()) {
        mensaje.className = 'error';
        mensaje.textContent = 'Completa el correo y la contraseña.';
        return;
    }

    boton.disabled = true;
    boton.textContent = 'Iniciando sesión…';

    try {
        const respuesta = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            mensaje.className = 'error';
            mensaje.textContent = datos.mensaje;
            return;
        }

       formulario.reset();
        mensaje.className = 'exito';
        mensaje.textContent =`Bienvenido, ${datos.usuario.nombre}. Redirigiendo...`;
        window.location.replace('/projects');
    } catch {
        mensaje.className = 'error';
        mensaje.textContent =
            'No se pudo conectar con el servidor. Intenta nuevamente.';
    } finally {
        boton.disabled = false;
        boton.textContent = 'Iniciar sesión';
    }
});