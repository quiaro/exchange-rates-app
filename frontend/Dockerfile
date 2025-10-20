# Stage 1: Build the application
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files from frontend
COPY frontend/package*.json ./frontend/

# Copy shared code first (since frontend depends on it)
COPY shared ./shared

# Install dependencies and build
WORKDIR /app/frontend
RUN npm ci
COPY frontend .
RUN npm run build

# Stage 2: Serve the application
FROM node:22-alpine

WORKDIR /app

# Install a simple static file server
RUN npm install -g serve

# Copy the built files from the builder stage
COPY --from=builder /app/frontend/dist ./dist

# Expose port
EXPOSE 5173

# Serve the app
CMD ["serve", "-s", "dist", "-l", "5173"]