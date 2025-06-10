# ---------- Base image ----------
  FROM node:22-alpine AS base
  WORKDIR /app
  ENV NODE_ENV=production
  RUN apk add --no-cache libc6-compat
  
  # ---------- Dependencies ----------
  FROM base AS deps
  COPY package.json yarn.lock ./
  RUN yarn install --frozen-lockfile
  
  # ---------- Build ----------
  FROM base AS build
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  RUN yarn global add @nestjs/cli && yarn build
  
  # ---------- Production ----------
  FROM base AS prod
  WORKDIR /app
  ENV NODE_ENV=production
  COPY --from=deps /app/node_modules ./node_modules
  COPY --from=build /app/dist ./dist
  COPY package.json ./
  CMD ["node", "dist/main.js"]
  