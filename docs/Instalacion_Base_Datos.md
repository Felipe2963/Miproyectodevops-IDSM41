# Guía de instalación y configuración de la base de datos

## 1. Objetivo

Este documento explica cómo instalar y configurar MySQL para utilizar la base de datos del proyecto MyProyectoDevOps. Su propósito es permitir que cualquier integrante del equipo pueda preparar su entorno local y establecer una conexión con el backend desarrollado en Node.js.

## 2. Requisitos previos

Antes de comenzar, es necesario contar con los siguientes programas:

- **MySQL Server:** motor encargado de almacenar y administrar la información.
- **MySQL Workbench:** herramienta gráfica para administrar la base de datos y ejecutar consultas SQL.
- **Node.js:** entorno necesario para ejecutar el backend.
- **Git:** herramienta para descargar y actualizar el proyecto.
- **Visual Studio Code:** editor recomendado para modificar los archivos.

## 3. Instalar MySQL

1. Ingresar al sitio oficial de MySQL: https://dev.mysql.com/downloads/installer/
2. Descargar el instalador de MySQL para Windows.
3. Ejecutar el instalador y seleccionar MySQL Server y MySQL Workbench.
4. Durante la configuración, establecer una contraseña para el usuario administrador `root`.
5. Finalizar la instalación y comprobar que el servicio de MySQL se encuentre funcionando.
6. Abrir MySQL Workbench y conectarse al servidor local.

**Importante:** cada integrante debe utilizar sus propias credenciales de MySQL. No es necesario compartir la contraseña con los demás integrantes.

## 4. Descargar el proyecto

Clonar el repositorio desde una terminal:

```bash
git clone https://github.com/Felipe2963/Miproyectodevops-IDSM41.git
```

Entrar a la carpeta:

```bash
cd Miproyectodevops-IDSM41
```

Instalar las dependencias:

```bash
npm install
```

## 5. Crear la base de datos

1. Abrir MySQL Workbench.
2. Conectarse al servidor local.
3. Abrir el archivo `database/schema.sql` del proyecto.
4. Ejecutar el contenido del archivo mediante el botón de ejecución de consultas.
5. Comprobar que se haya creado la base de datos `myproyectodevops`.

El archivo SQL contiene la estructura de las siguientes tablas:

| Tabla | Descripción |
|---|---|
| usuarios | Almacena la información de los usuarios. |
| proyectos | Guarda los proyectos registrados. |
| tareas | Contiene las tareas de cada proyecto. |
| responsables | Relaciona usuarios con tareas asignadas. |
| actividades | Registra las actividades realizadas. |

Las tablas utilizan claves primarias y foráneas para establecer relaciones y mantener la integridad de la información.

## 6. Configurar las variables de entorno

En la carpeta principal del proyecto se encuentra el archivo `.env.example`.

Crear una copia con el nombre `.env`:

```powershell
Copy-Item .env.example .env
```

Abrir el archivo `.env` y configurar los datos correspondientes al servidor MySQL local:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=TU_CONTRASEÑA
DB_NAME=myproyectodevops
```

Reemplazar `TU_CONTRASEÑA` por la contraseña establecida durante la instalación de MySQL.

**Nota:** el archivo `.env` contiene información privada y no debe subirse al repositorio. El archivo `.gitignore` ya contempla su exclusión.

## 7. Verificar la conexión

Después de configurar las variables de entorno, abrir una terminal en la carpeta principal del proyecto y ejecutar:

```bash
node database/verify.js
```

Si la configuración es correcta, se mostrará un mensaje indicando que la conexión con MySQL fue establecida correctamente, junto con el nombre de la base de datos y la versión del servidor.

## 8. Probar inserciones y consultas

Para comprobar que el backend puede insertar y recuperar información, ejecutar:

```bash
node database/test-crud.js
```

Este archivo realiza una prueba que consiste en:

1. Establecer una conexión con MySQL.
2. Insertar un usuario temporal.
3. Consultar el registro mediante su identificador.
4. Eliminar el registro utilizado para la prueba.
5. Cerrar la conexión.

Si las operaciones terminan correctamente, significa que la conexión permite realizar operaciones básicas sobre la base de datos.

## 9. Ejecutar las pruebas del proyecto

Para ejecutar las pruebas automatizadas disponibles:

```bash
npm test
```

Este comando utiliza Jest para comprobar el funcionamiento de las pruebas configuradas en el proyecto.

## 10. Ejecutar el backend

Una vez configurada la base de datos, iniciar el servidor mediante:

```bash
npm start
```

El backend estará disponible localmente según la configuración de la aplicación.

## 11. Solución de problemas

| Problema | Posible solución |
|---|---|
| Access denied for user root | Revisar el usuario y la contraseña del archivo `.env`. |
| ECONNREFUSED | Comprobar que el servicio MySQL esté iniciado y que el puerto sea correcto. |
| Unknown database | Ejecutar nuevamente `database/schema.sql` en MySQL Workbench. |
| Cannot find module | Ejecutar `npm install` en la carpeta principal. |
| Error al consultar tablas | Verificar que el archivo SQL se haya ejecutado correctamente. |

## 12. Consideraciones de seguridad

- No compartir contraseñas de MySQL mediante GitHub.
- No subir el archivo `.env` al repositorio.
- Utilizar `.env.example` como plantilla de configuración.
- No utilizar credenciales de administrador en entornos de producción.
- Cada integrante debe configurar su propia conexión local.

---

**Proyecto:** MyProyectoDevOps  
**Asignatura:** Gestión de Procesos de Software  
**Grupo:** IDSM41  
**Universidad:** UTCJ