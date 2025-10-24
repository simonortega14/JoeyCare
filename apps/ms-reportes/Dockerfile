FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm i --omit=dev
COPY . .
ENV PORT=3004
EXPOSE 3004
CMD ["npm","start"]
