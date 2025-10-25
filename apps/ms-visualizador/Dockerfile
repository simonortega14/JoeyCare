# Etapa base
FROM node:20-alpine

WORKDIR /app

# Copiar package y lock primero para aprovechar cache
COPY package.json ./

RUN npm install --only=production

# Copiar código
COPY src ./src
COPY .env.example ./.env.example

EXPOSE 3003

CMD ["node", "src/server.js"]
