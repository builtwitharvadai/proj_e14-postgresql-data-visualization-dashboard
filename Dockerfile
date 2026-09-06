# ============================================================================
# Base Stage - Common setup shared by all stages
# ============================================================================
FROM node:18-alpine AS base

WORKDIR /app

COPY package*.json ./

# ============================================================================
# Development Stage - Includes dev dependencies for hot-reload workflow
# ============================================================================
FROM base AS development

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ============================================================================
# Build Stage - Compile TypeScript to JavaScript
# ============================================================================
FROM base AS build

RUN npm ci

COPY . .

RUN npm run build

# ============================================================================
# Production Stage - Minimal runtime image with compiled artifacts only
# ============================================================================
FROM node:18-alpine AS production

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY --from=build /app/dist ./dist

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]
