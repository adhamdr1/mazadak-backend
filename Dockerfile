# Multi-stage production build for Mazadak Backend
# Stage 1: Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies (clean install)
RUN npm ci

# Copy application source code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Stage 2: Production runner
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy only production dependencies and compiled output
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Expose port (default 3000)
EXPOSE 3000

# Run compiled NestJS app
CMD ["node", "dist/main.js"]
