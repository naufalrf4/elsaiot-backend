# -------- Base --------
  FROM node:22-alpine AS base
  WORKDIR /app
  ENV NODE_ENV=production
  RUN apk add --no-cache libc6-compat
  
  # -------- Dependencies --------
  FROM base AS deps
  COPY package.json yarn.lock ./
  RUN yarn install --frozen-lockfile
  
  # -------- Build --------
  FROM base AS build
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  # Add Nest CLI explicitly for build
  RUN yarn global add @nestjs/cli && yarn build
  
  # -------- Prune --------
  FROM base AS prune
  COPY package.json yarn.lock ./
  RUN yarn install --frozen-lockfile --production
  
  # -------- Production --------
  FROM node:22-alpine AS prod
  WORKDIR /app
  ENV NODE_ENV=production
  COPY --from=prune /app/node_modules ./node_modules
  COPY --from=build /app/dist ./dist
  COPY package.json ./
  CMD ["node", "dist/main"]
  