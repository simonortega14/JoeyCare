# Docker Setup for JoeyCare

Este documento explica cómo ejecutar la aplicación JoeyCare usando Docker.

## Arquitectura Docker

La aplicación se ejecuta en tres contenedores:
- **MySQL**: Base de datos
- **Backend**: API REST en Node.js/Express
- **Frontend**: SPA en React servida con Nginx

## Requisitos Previos

- Docker Engine 20.10+
- Docker Compose 2.0+

## Inicio Rápido

1. **Clonar el repositorio** (si no está ya clonado)

2. **Construir e iniciar los servicios**:
   ```bash
   docker-compose up --build
   ```

3. **Acceder a la aplicación**:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:4000
   - Base de datos: localhost:3307 (mapeado desde contenedor 3306)

## Servicios Detallados

### MySQL
- **Imagen**: mysql:8.0
- **Base de datos**: joeycare
- **Usuario**: joeycare_user
- **Contraseña**: joeycare_password
- **Volumen**: mysql_data (persistente)

### Backend
- **Puerto**: 4000
- **Variables de entorno**:
  - DB_HOST: mysql
  - DB_USER: joeycare_user
  - DB_PASSWORD: joeycare_password
  - DB_NAME: joeycare
- **Volumen**: uploads_data (para archivos subidos)

### Frontend
- **Puerto**: 3000
- **Build**: Multi-stage con Node.js y Nginx

## Comandos Útiles

```bash
# Construir imágenes
docker-compose build

# Iniciar en segundo plano
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Limpiar volúmenes
docker-compose down -v

# Ejecutar tests en backend
docker-compose exec backend npm test
```

## Desarrollo

Para desarrollo con hot reload, modifica los Dockerfiles para usar bind mounts:

```yaml
# En docker-compose.yml, para backend:
volumes:
  - ./backend:/app
  - /app/node_modules
```

## Variables de Entorno

Crea un archivo `.env` en la raíz para personalizar:

```env
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_DATABASE=joeycare
MYSQL_USER=joeycare_user
MYSQL_PASSWORD=your_password
```

## Solución de Problemas

- **Puerto ocupado**: Cambia los puertos en docker-compose.yml
- **Base de datos no inicia**: Verifica logs con `docker-compose logs mysql`
- **Backend no conecta**: Espera a que MySQL esté healthy
- **Archivos no se suben**: Verifica permisos del volumen uploads_data

## Producción

Para producción:
1. Configura variables de entorno seguras
2. Usa secrets de Docker
3. Configura reverse proxy (nginx/Traefik)
4. Implementa healthchecks
5. Configura logging centralizado