FROM public.ecr.aws/docker/library/node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src
COPY runbooks ./runbooks

RUN npm install typescript && npm run build && npm uninstall typescript

EXPOSE 8080

ENV PORT=8080

CMD ["node", "dist/index.js"]
