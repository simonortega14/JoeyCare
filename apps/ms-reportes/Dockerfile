FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src
RUN mkdir -p /app/storage/reportes
ENV PORT=3007
EXPOSE 3007

CMD ["npm", "start"]
