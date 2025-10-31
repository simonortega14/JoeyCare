FROM node:20-alpine

# 1. Carpeta de trabajo dentro del contenedor
WORKDIR /usr/src/app

# 2. Copiamos manifest de dependencias primero (para cachear npm install)
COPY package.json package-lock.json* ./

# 3. Instalamos dependencias de producción
RUN npm install --omit=dev

# 4. Copiamos el código fuente
COPY src ./src

# 5. Vars por defecto dentro del contenedor
ENV PORT=3002
ENV STORAGE_ROOT=/var/joeycare/storage/ecografias
# crea el directorio para asegurar que multer pueda escribir
RUN mkdir -p /var/joeycare/storage/ecografias

# 6. Exponer puerto interno
EXPOSE 3002

# 7. Comando de arranque
CMD ["npm", "start"]
