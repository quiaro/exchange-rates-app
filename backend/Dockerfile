# Multi-stage build for NestJS application
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Create the proper directory structure
RUN mkdir -p backend shared

# Copy shared folder to the correct location (../shared from backend perspective)
COPY shared ./shared

# Copy backend package files
COPY backend/package*.json ./backend/

# Install dependencies
WORKDIR /app/backend
RUN npm ci --only=production && npm cache clean --force

# Copy backend source code
COPY backend/ .

# Verify the structure is correct
RUN ls -la && ls -la ../shared/

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Create the proper directory structure
RUN mkdir -p backend shared

# Copy shared folder
COPY shared ./shared

# Copy package files
COPY backend/package*.json ./backend/

# Install only production dependencies
WORKDIR /app/backend
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/backend/dist ./dist

# Change ownership to app user
RUN chown -R nestjs:nodejs /app
USER nestjs

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]
