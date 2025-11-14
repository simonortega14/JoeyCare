# JoeyCare - Fase 1: API Gateway y Auth Service

Esta fase implementa la migración inicial a arquitectura de microservicios con API Gateway y Auth Service.

## Arquitectura Implementada

```
Frontend (React) → API Gateway (Port 3000) → Auth Service (Port 3001)
                                      → Monolithic Backend (Port 4000) - Para otras rutas
```

## Servicios

### API Gateway
- **Puerto**: 3000
- **Funciones**:
  - Punto único de entrada para todas las APIs
  - Autenticación JWT para rutas protegidas
  - Rate limiting
  - Routing a microservicios
  - CORS y seguridad básica

### Auth Service
- **Puerto**: 3001
- **Funciones**:
  - Login de usuarios
  - Validación de credenciales
  - Generación de tokens JWT
  - Registro de usuarios (para administradores)
  - Auditoría de accesos

## Instalación y Ejecución

### Prerrequisitos
- Node.js 18+
- MySQL 8.0+
- Base de datos `joeycare_db` creada y populada

### Pasos

1. **Instalar dependencias del API Gateway**:
   ```bash
   cd backend/api-gateway
   npm install
   ```

2. **Instalar dependencias del Auth Service**:
   ```bash
   cd backend/microservices/auth-service
   npm install
   ```

3. **Asegurar que MySQL esté corriendo** y la base de datos `joeycare_db` exista.

4. **Iniciar Auth Service**:
   ```bash
   cd backend/microservices/auth-service
   npm start
   ```

5. **Iniciar API Gateway** (en terminal separado):
   ```bash
   cd backend/api-gateway
   npm start
   ```

6. **Actualizar configuración del frontend** para usar el API Gateway:
   - Cambiar la URL base de axios de `http://localhost:4000` a `http://localhost:3000`

## Endpoints Disponibles

### API Gateway
- `GET /health` - Health check
- `POST /api/auth/login` - Login (proxy al Auth Service)
- `POST /api/auth/register` - Registro (proxy al Auth Service)
- `POST /api/auth/logout` - Logout (proxy al Auth Service)
- `POST /api/auth/validate` - Validar token (proxy al Auth Service)

### Auth Service Directo (para testing)
- `GET /health` - Health check del Auth Service
- `POST /auth/login` - Login directo
- `POST /auth/register` - Registro directo
- `POST /auth/validate` - Validar token directo
- `POST /auth/logout` - Logout directo

## Usuarios de Prueba

Los siguientes usuarios están disponibles en la base de datos de seed:

- **Admin**: carlos.lopez@joeycare.com / 123456
- **Médico**: juan.perez@joeycare.com / 123456
- **Médico**: miguel.torres@joeycare.com / 123456

## Testing

### Health Checks
```bash
# API Gateway
curl http://localhost:3000/health

# Auth Service
curl http://localhost:3001/health
```

### Login
```bash
# Crear archivo login.json
echo '{"email":"juan.perez@joeycare.com","password":"123456"}' > login.json

# Login via API Gateway
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d @login.json
```

## Configuración

### Variables de Entorno

#### API Gateway (.env)
```
API_GATEWAY_PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=joeycare-api-gateway-secret-key-2024
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:4000
PATIENT_SERVICE_URL=http://localhost:4000
STUDY_SERVICE_URL=http://localhost:4000
REPORT_SERVICE_URL=http://localhost:4000
```

#### Auth Service (.env)
```
AUTH_SERVICE_PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=joeycare_db
JWT_SECRET=joeycare-auth-service-secret-key-2024
JWT_EXPIRES_IN=24h
```

## Próximos Pasos (Fase 2)

1. Migrar User Service
2. Migrar Patient Service
3. Implementar service discovery
4. Agregar monitoring y logging centralizado
5. Implementar comunicación asíncrona con message broker

## Notas de Desarrollo

- La base de datos compartida se mantiene por simplicidad inicial
- Los servicios usan JWT para autenticación entre ellos
- Rate limiting implementado para prevenir abuso
- Logging básico incluido para debugging
- Arquitectura preparada para escalado horizontal