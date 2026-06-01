FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server ./server
COPY src ./src
COPY scripts ./scripts

RUN node scripts/build.js

WORKDIR /app/dist

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server/server.js"]
