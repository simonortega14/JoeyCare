-- ========================================
-- SCRIPT DE BASE DE DATOS PARA TESTING
-- joeycare_db_test
-- ========================================

-- Eliminar y crear base de datos limpia
DROP DATABASE IF EXISTS joeycare_db_test;
CREATE DATABASE joeycare_db_test
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE joeycare_db_test;

-- Limpieza ordenada
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS auditoria;
DROP TABLE IF EXISTS reportes_historial;
DROP TABLE IF EXISTS reportes;
DROP TABLE IF EXISTS metadatos_dicom;
DROP TABLE IF EXISTS instancias;
DROP TABLE IF EXISTS ecografias;
DROP TABLE IF EXISTS acudiente;
DROP TABLE IF EXISTS neonato;
DROP TABLE IF EXISTS medicos;
DROP TABLE IF EXISTS especialidades;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS sedes;
SET FOREIGN_KEY_CHECKS = 1;

-- ========================================
-- ESTRUCTURA DE TABLAS
-- ========================================

-- Catálogos base
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE especialidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  descripcion VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sedes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  institucion VARCHAR(150),
  ciudad VARCHAR(80),
  direccion VARCHAR(150)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Usuarios clínicos
CREATE TABLE medicos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rol_id INT NOT NULL,
  especialidad_id INT NOT NULL,
  sede_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  hash_password VARCHAR(255) NOT NULL,
  activo BOOLEAN DEFAULT FALSE,
  foto_perfil VARCHAR(255) NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_medicos_roles FOREIGN KEY (rol_id) REFERENCES roles(id),
  CONSTRAINT fk_medicos_especialidades FOREIGN KEY (especialidad_id) REFERENCES especialidades(id),
  CONSTRAINT fk_medicos_sedes FOREIGN KEY (sede_id) REFERENCES sedes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Pacientes
CREATE TABLE neonato (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  documento VARCHAR(255) NOT NULL,
  sexo ENUM('M','F','X') NULL,
  fecha_nacimiento DATE,
  edad_gestacional_sem TINYINT,
  edad_corregida_sem TINYINT,
  peso_nacimiento_g SMALLINT,
  peso_actual_g SMALLINT NULL,
  perimetro_cefalico DECIMAL(5,2) NULL,
  created_by_medico_id INT NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_neonato_medicos FOREIGN KEY (created_by_medico_id) REFERENCES medicos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE acudiente (
  id INT AUTO_INCREMENT PRIMARY KEY,
  neonato_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  sexo ENUM('M','F','X') NULL,
  parentesco ENUM('P','M','H','O') NULL,
  telefono VARCHAR(255) NOT NULL,
  correo VARCHAR(255) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_acudiente_neonato FOREIGN KEY (neonato_id) REFERENCES neonato(id),
  INDEX idx_acudiente_neonato (neonato_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estudios de ecografía
CREATE TABLE ecografias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  neonato_id INT NOT NULL,
  fecha_hora DATETIME NOT NULL,
  uploader_medico_id INT NOT NULL,
  sede_id INT NULL,
  filepath VARCHAR(255) NOT NULL,
  mime_type VARCHAR(50),
  size_bytes BIGINT,
  thumbnail_path VARCHAR(255),
  dicom_metadata JSON,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ecografias_neonato FOREIGN KEY (neonato_id) REFERENCES neonato(id),
  CONSTRAINT fk_ecografias_medicos FOREIGN KEY (uploader_medico_id) REFERENCES medicos(id),
  CONSTRAINT fk_ecografias_sedes FOREIGN KEY (sede_id) REFERENCES sedes(id),
  INDEX idx_eco_neonato_fecha (neonato_id, fecha_hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Instancias por estudio
CREATE TABLE instancias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ecografia_id INT NOT NULL,
  sop_instance_uid VARCHAR(64) NOT NULL UNIQUE,
  filepath VARCHAR(255) NOT NULL,
  mime_type VARCHAR(50),
  size_bytes BIGINT,
  width INT,
  height INT,
  bit_depth TINYINT,
  duration_ms INT NULL,
  checksum_sha256 CHAR(64),
  uploaded_by INT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_instancias_ecografias FOREIGN KEY (ecografia_id) REFERENCES ecografias(id),
  CONSTRAINT fk_instancias_medicos FOREIGN KEY (uploaded_by) REFERENCES medicos(id),
  INDEX idx_instancia_ecografia (ecografia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Metadatos DICOM
CREATE TABLE metadatos_dicom (
  id INT AUTO_INCREMENT PRIMARY KEY,
  instancia_id INT NOT NULL,
  dicom_core_json JSON,
  manufacturer VARCHAR(100),
  model_name VARCHAR(100),
  software_versions VARCHAR(100),
  pixel_spacing_mm VARCHAR(20),
  transducer_freq_mhz DECIMAL(4,1),
  study_instance_uid VARCHAR(64),
  series_instance_uid VARCHAR(64),
  sop_instance_uid VARCHAR(64),
  CONSTRAINT fk_meta_instancias FOREIGN KEY (instancia_id) REFERENCES instancias(id),
  INDEX idx_meta_uids (study_instance_uid, series_instance_uid, sop_instance_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Reportes
CREATE TABLE reportes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ecografia_id INT NOT NULL UNIQUE,
  created_by_medico_id INT NOT NULL,
  updated_by_medico_id INT NULL,
  fecha_reporte DATETIME NOT NULL,
  titulo VARCHAR(255),
  contenido TEXT,
  hallazgos TEXT,
  conclusion TEXT,
  recomendaciones TEXT,
  firma_medico TEXT,
  estado ENUM('borrador','firmado','anulado') DEFAULT 'borrador',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reportes_ecografias FOREIGN KEY (ecografia_id) REFERENCES ecografias(id),
  CONSTRAINT fk_reportes_created_medicos FOREIGN KEY (created_by_medico_id) REFERENCES medicos(id),
  CONSTRAINT fk_reportes_updated_medicos FOREIGN KEY (updated_by_medico_id) REFERENCES medicos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Historial de reportes
CREATE TABLE reportes_historial (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reporte_id INT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  datos_json JSON NOT NULL,
  fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  medico_id INT NOT NULL,
  CONSTRAINT fk_historial_reportes FOREIGN KEY (reporte_id) REFERENCES reportes(id),
  CONSTRAINT fk_historial_medicos FOREIGN KEY (medico_id) REFERENCES medicos(id),
  INDEX idx_historial_reporte_version (reporte_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Auditoría
CREATE TABLE auditoria (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  accion ENUM('login','ver','crear','editar','borrar','exportar','firmar') NOT NULL,
  objeto_tipo VARCHAR(40),
  objeto_id INT,
  detalle_json JSON,
  ip VARCHAR(45),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auditoria_medicos FOREIGN KEY (usuario_id) REFERENCES medicos(id),
  INDEX idx_auditoria_objeto (objeto_tipo, objeto_id),
  INDEX idx_auditoria_usuario_time (usuario_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ========================================
-- DATOS MÍNIMOS PARA TESTING
-- ========================================

-- Roles básicos
INSERT INTO roles (nombre, descripcion) VALUES
('admin','Administración del sistema'),
('medico','Profesional médico habilitado');

-- Especialidades básicas para testing
INSERT INTO especialidades (nombre, descripcion) VALUES
('Neonatología','Atención del recién nacido y prematuro'),
('Radiología','Diagnóstico por imágenes'),
('Gestión Clínica','Dirección de servicios clínicos');

-- Sedes mínimas para testing
INSERT INTO sedes (nombre, institucion, ciudad, direccion) VALUES
('Sede Test Principal','Fundación Canguro','Bogotá','Calle Test 123'),
('Sede Test Secundaria','Fundación Canguro','Medellín','Carrera Test 456');

-- Médico de prueba para usar en tests
INSERT INTO medicos (rol_id, especialidad_id, sede_id, nombre, apellido, email, hash_password, activo) VALUES
(2, 1, 1, 'Dr. Test', 'Prueba', 'test@joeycare.com', 'testpassword123', TRUE);

-- ========================================
-- VERIFICACIÓN DE DATOS
-- ========================================
SELECT '✅ Base de datos joeycare_db_test creada exitosamente' AS 'ESTADO';
SELECT COUNT(*) AS 'Roles' FROM roles;
SELECT COUNT(*) AS 'Especialidades' FROM especialidades;
SELECT COUNT(*) AS 'Sedes' FROM sedes;
SELECT COUNT(*) AS 'Médicos' FROM medicos;
SELECT '🧪 Base de datos lista para testing' AS 'SIGUIENTE PASO';