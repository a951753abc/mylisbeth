# Stage 1: Build React frontend
FROM node:22-alpine AS builder

WORKDIR /app

# Install root dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Install client dependencies and build
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Stage 2: Production image
FROM node:22-alpine

WORKDIR /app

# Copy server dependencies from builder
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy server source
COPY server/ ./server/

# Copy built frontend
COPY --from=builder /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/index.js"]
