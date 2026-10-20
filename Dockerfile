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
ENV PORT=7860

# Copy only production dependencies and compiled output
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Non-root user with UID 1000 for Hugging Face Spaces compatibility
RUN chown -R 1000:1000 /app
USER 1000

# Expose port (7860 is default for Hugging Face Spaces)
EXPOSE 7860

# Run compiled NestJS app
CMD ["node", "dist/main.js"]
