FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN pnpm exec tsc --noEmit false --outDir dist

FROM node:20-alpine

WORKDIR /app
ENV UPLOAD_DIR=/app/uploads/order-proofs

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/dist ./dist
RUN mkdir -p /app/uploads/order-proofs

EXPOSE 4000

CMD ["node", "dist/index.js"]
