# ========== Etapa 1: Build del frontend ==========
FROM node:20-alpine AS build
WORKDIR /app

# copiar solo package.json / lock primero para cachear deps
COPY package*.json ./

# instala dependencias en modo clean
RUN npm ci

# ahora sí copiamos el resto del código fuente
COPY . .

# compila la app (Vite/React) a /app/dist
RUN npm run build


# ========== Etapa 2: Nginx sirviendo el build ==========
FROM nginx:alpine

# copiamos el build estático que generó la etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html

# copiamos nuestra config de nginx con el proxy a los microservicios
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# aseguramos que nginx quede en foreground (modo contenedor)
CMD ["nginx", "-g", "daemon off;"]
