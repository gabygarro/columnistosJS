FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
RUN echo "import('./dist/scripts/sendDms.js').then(module => \
  module.handler() \
    .then(() => process.exit(0)) \
    .catch((e) => { console.error(e); process.exit(1); }) \
);" > run.mjs
CMD ["node", "--no-warnings", "run.mjs"]
