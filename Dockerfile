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
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  RUN yarn build
  
  # ---------- Production dependencies only ----------
  FROM base AS prune
  COPY --from=deps /app/node_modules ./node_modules
  COPY package.json yarn.lock ./
  RUN yarn workspaces focus --production || yarn install --frozen-lockfile --production
  
  # ---------- Final image ----------
  FROM node:22-alpine AS prod
  WORKDIR /app
  ENV NODE_ENV=production
  COPY --from=prune /app/node_modules ./node_modules
  COPY --from=build /app/dist ./dist
  COPY package.json ./
  CMD ["node", "dist/main"]
  