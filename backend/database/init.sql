-- Base de datos
CREATE DATABASE IF NOT EXISTS joeycare_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;
USE joeycare_db;

-- Limpieza ordenada
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS auditoria;
DROP TABLE IF EXISTS informes;
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
  activo BOOLEAN DEFAULT TRUE,
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
  documento INT NOT NULL,
  sexo ENUM('M','F','X') NULL,
  fecha_nacimiento DATE,
  edad_gestacional_sem TINYINT,
  edad_corregida_sem TINYINT,
  peso_nacimiento_g SMALLINT,
  peso_actual_g SMALLINT NULL,
  perimetro_cefalico DECIMAL(5,2) NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE acudiente (
  id INT AUTO_INCREMENT PRIMARY KEY,
  neonato_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  parentesco ENUM('P','M','H','O') NULL,
  telefono VARCHAR(20) NOT NULL,
  correo VARCHAR(150) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_acudiente_neonato FOREIGN KEY (neonato_id) REFERENCES neonato(id),
  INDEX idx_acudiente_neonato (neonato_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estudios de ecografía (examen)
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

-- Instancias por estudio (imagen fija o cine)
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

-- Metadatos DICOM por instancia
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

-- Informe 1:1 por ecografía, firmado por médico
CREATE TABLE informes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ecografia_id INT NOT NULL UNIQUE,
  medico_id INT NOT NULL,
  fecha_informe DATETIME NOT NULL,
  hallazgos TEXT,
  conclusion TEXT,
  estado ENUM('borrador','firmado','anulado') DEFAULT 'borrador',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_informes_ecografias FOREIGN KEY (ecografia_id) REFERENCES ecografias(id),
  CONSTRAINT fk_informes_medicos FOREIGN KEY (medico_id) REFERENCES medicos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Auditoría de acciones
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

-- Roles (solo admin y medico)
INSERT INTO roles (nombre, descripcion) VALUES
('admin','Administración del sistema'),
('medico','Profesional médico habilitado');

-- Especialidades relevantes
INSERT INTO especialidades (nombre, descripcion) VALUES
('Neonatología','Atención del recién nacido y prematuro'),
('Radiología','Diagnóstico por imágenes'),
('Radiología Pediátrica','Imágenes en población pediátrica'),
('Neurosonología','Ultrasonido del sistema nervioso'),
('Neurología Pediátrica','Neurología en infancia'),
('Medicina Materno-Fetal','Atención perinatal y fetal'),
('Pediatría','Cuidado integral del niño'),
('Ecografía Diagnóstica','Ultrasonido diagnóstico general'),
('Ultrasonido Pediátrico','Ultrasonido en niños'),
('Medicina Fetal y Neonatal','Puente materno-fetal-neonatal'),
('Sonografía Médica','Práctica de ultrasonido'),
('Gestión Clínica','Dirección de servicios clínicos');

-- -------------------------
-- SEED DE SEDES (10+)
-- -------------------------
INSERT INTO sedes (nombre, institucion, ciudad, direccion) VALUES
('Sede Principal','Fundación Canguro','Bogotá','Cra 1 #1-01'),
('Hospital del Este','Fundación Canguro','Bogotá','Calle 2 #2-02'),
('Clínica Norte','Fundación Canguro','Bogotá','Av 7 #120-15'),
('Centro Neonatal Andino','Fundación Canguro','Tunja','Calle 25 #8-30'),
('Unidad Materno-Infantil Caribe','Fundación Canguro','Barranquilla','Cra 53 #84-20'),
('Clínica del Río','Fundación Canguro','Medellín','Transv 32 #45-90'),
('Sede Pacífico','Fundación Canguro','Cali','Calle 5 #36-12'),
('Hospital Central del Café','Fundación Canguro','Manizales','Cra 23 #64-50'),
('Unidad de Imagen Pediátrica','Fundación Canguro','Bucaramanga','Calle 36 #27-10'),
('Centro Perinatal Sur','Fundación Canguro','Neiva','Cra 8 #12-40'),
('Sede Altos de la Sabana','Fundación Canguro','Sincelejo','Av 25 #40-22'),
('Clínica del Mar','Fundación Canguro','Santa Marta','Cra 4 #26-18');

-- -------------------------
-- SEED DE MÉDICOS (1 admin + 14 médicos)
-- Nota: rol_id = 1 (admin), rol_id = 2 (medico)
--       especialidad_id según orden insertado arriba
-- -------------------------
INSERT INTO medicos (rol_id, especialidad_id, sede_id, nombre, apellido, email, hash_password)
VALUES
-- Admin (usa especialidad de Gestión Clínica)
(1, 12, 1, 'Carlos', 'López', 'carlos.lopez@joeycare.com', '123456'),

-- Médicos clínicos
(2, 1,  1, 'Juan',  'Pérez',  'juan.perez@joeycare.com',  '123456'),
(2, 4,  1, 'Miguel', 'Torres',   'miguel.torres@joeycare.com',  '123456'),
(2, 3,  3, 'Ana',    'Gómez',    'ana.gomez@joeycare.com',     '123456'),
(2, 2,  6, 'Javier', 'Hernández','javier.hernandez@joeycare.com','123456'),
(2, 5,  3, 'Sofía',  'Martínez', 'sofia.martinez@joeycare.com', '123456'),
(2, 6,  2, 'Diego',  'Suárez',   'diego.suarez@joeycare.com',   '123456'),
(2, 7,  7, 'María',  'Paredes',  'maria.paredes@joeycare.com',  '123456'),
(2, 8,  8, 'Hugo',   'Beltrán',  'hugo.beltran@joeycare.com',   '123456'),
(2, 9,  9, 'Paula',  'Rojas',    'paula.rojas@joeycare.com',    '123456'),
(2, 10, 10,'Andrés', 'Cano',     'andres.cano@joeycare.com',    '123456'),
(2, 1,  11,'Claudia','Vega',     'claudia.vega@joeycare.com',   '123456'),
(2, 4,  12,'Ricardo','Molina',   'ricardo.molina@joeycare.com', '123456'),
(2, 3,  4, 'Natalia','Quintero', 'natalia.quintero@joeycare.com','123456'),
(2, 2,  5, 'Felipe', 'Arango',   'felipe.arango@joeycare.com',  '123456');

-- -------------------------
-- SEED DE NEONATOS (PACIENTES) - 24+ filas
-- -------------------------
INSERT INTO neonato (nombre, apellido, documento, sexo, fecha_nacimiento, edad_gestacional_sem, edad_corregida_sem, peso_nacimiento_g, peso_actual_g, perimetro_cefalico)
VALUES
('María','García',101010,'F','2022-10-25',34,36,2200,2700,32.4),
('Pedro','Martínez',101020,'M','2023-01-15',35,38,2300,2850,33.0),
('Sofía','Rodríguez',101030,'F','2021-08-01',33,40,2100,3000,34.2),
('Luis','Hernández',101040,'M','2024-03-01',32,36,2000,2450,31.8),
('Valentina','López',101050,'F','2023-11-20',34,37,2180,2620,32.1),
('Sebastián','Gómez',101060,'M','2022-07-12',35,39,2400,2980,33.8),
('Camila','Pérez',101070,'F','2024-04-08',31,35,1900,2320,31.2),
('Mateo','Sánchez',101080,'M','2023-09-05',36,38,2550,2900,33.5),
('Lucía','Díaz',101090,'F','2021-12-30',33,39,2050,2870,33.9),
('Samuel','Torres',101100,'M','2022-03-22',34,37,2220,2700,32.6),
('Isabella','Ramírez',101110,'F','2024-01-18',32,34,1980,2280,31.0),
('Emiliano','Castaño',101120,'M','2023-05-27',35,38,2360,2810,33.2),
('Antonella','Muñoz',101130,'F','2022-11-14',34,36,2210,2680,32.3),
('Thiago','Rojas',101140,'M','2021-10-09',33,41,2080,3050,34.6),
('Emma','Vargas',101150,'F','2023-02-02',36,38,2580,2920,33.4),
('Benjamín','Rivera',101160,'M','2024-05-11',31,33,1850,2200,30.8),
('Regina','Mendoza',101170,'F','2023-07-19',35,37,2420,2760,32.9),
('Martín','Navarro',101180,'M','2022-08-28',34,37,2250,2710,32.7),
('Victoria','Guerrero',101190,'F','2021-06-06',33,40,2120,2990,34.1),
('Gael','Ortega',101200,'M','2022-09-13',35,38,2390,2840,33.1),
('Salomé','Peña',101210,'F','2023-12-24',32,34,1960,2250,30.9),
('Joaquín','Cortés',101220,'M','2023-03-03',36,39,2600,3010,34.0),
('Allison','Luna',101230,'F','2024-02-26',31,33,1830,2180,30.7),
('Santiago','Valencia',101240,'M','2022-01-07',34,36,2205,2660,32.0),
('Zoe','Ibáñez',101250,'F','2021-09-21',33,40,2105,2960,34.3),
('Dylan','Camacho',101260,'M','2023-06-17',35,37,2410,2750,32.8),
('Abigail','Cárdenas',101270,'F','2022-04-29',34,37,2230,2690,32.5),
('Iker','Salazar',101280,'M','2024-06-09',31,32,1800,2100,30.2),
('Julieta','Mejía',101290,'F','2023-08-31',36,38,2570,2930,33.6),
('Emilio','Prieto',101300,'M','2022-02-14',34,36,2190,2640,31.9);

-- -------------------------
-- CONSULTAS DE VERIFICACIÓN
-- -------------------------
SELECT '--- ROLES ---' AS 'ESTADO DE DATOS';
SELECT id, nombre, descripcion FROM roles;

SELECT '--- ESPECIALIDADES ---' AS 'ESTADO DE DATOS';
SELECT id, nombre FROM especialidades;

SELECT '--- SEDES ---' AS 'ESTADO DE DATOS';
SELECT id, nombre, institucion, ciudad FROM sedes;

SELECT '--- MEDICOS ---' AS 'ESTADO DE DATOS';
SELECT id, nombre, apellido, email, rol_id, sede_id, especialidad_id FROM medicos;

SELECT '--- NEONATOS (PACIENTES) ---' AS 'ESTADO DE DATOS';
SELECT id, nombre, apellido, documento, sexo, fecha_nacimiento FROM neonato;
