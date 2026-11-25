-- ==========================================
-- MyProyectoDevOps
-- ==========================================

CREATE DATABASE IF NOT EXISTS myproyectodevops
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE myproyectodevops;

-- ==========================================
-- 1. TABLA USUARIOS
-- ==========================================

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('administrador', 'usuario') DEFAULT 'usuario',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==========================================
-- 2. TABLA PROYECTOS
-- ==========================================

CREATE TABLE IF NOT EXISTS proyectos (
    id_proyecto INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado ENUM('pendiente', 'activo', 'finalizado')
        DEFAULT 'pendiente',
    fecha_inicio DATE,
    fecha_fin DATE,
    id_usuario INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_proyectos_usuarios
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ==========================================
-- 3. TABLA TAREAS
-- ==========================================

CREATE TABLE IF NOT EXISTS tareas (
    id_tarea INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado ENUM('pendiente', 'en_proceso', 'completada')
        DEFAULT 'pendiente',
    prioridad ENUM('baja', 'media', 'alta')
        DEFAULT 'media',
    fecha_inicio DATE,
    fecha_vencimiento DATE,
    id_proyecto INT NOT NULL,
    id_creador INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tareas_proyectos
        FOREIGN KEY (id_proyecto)
        REFERENCES proyectos(id_proyecto)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_tareas_usuarios
        FOREIGN KEY (id_creador)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ==========================================
-- 4. TABLA RESPONSABLES
-- Relaciona usuarios con tareas
-- ==========================================

CREATE TABLE IF NOT EXISTS responsables (
    id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
    id_tarea INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_responsable_tarea
        UNIQUE (id_tarea, id_usuario),

    CONSTRAINT fk_responsables_tareas
        FOREIGN KEY (id_tarea)
        REFERENCES tareas(id_tarea)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_responsables_usuarios
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ==========================================
-- 5. TABLA ACTIVIDADES
-- Historial de acciones sobre las tareas
-- ==========================================

CREATE TABLE IF NOT EXISTS actividades (
    id_actividad INT AUTO_INCREMENT PRIMARY KEY,
    id_tarea INT NOT NULL,
    id_usuario INT NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_actividad TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_actividades_tareas
        FOREIGN KEY (id_tarea)
        REFERENCES tareas(id_tarea)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_actividades_usuarios
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;