FROM node:20-alpine

WORKDIR /app

# Les sources viennent du dossier dashboard/ à la racine du repo
COPY package*.json ./
RUN npm ci --silent --omit=dev

COPY . .

EXPOSE 9000

CMD ["node", "server.js"]
