FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm i --omit=dev
COPY . .
ENV PORT=3002
EXPOSE 3002
CMD ["npm","start"]
