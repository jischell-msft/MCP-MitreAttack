FROM node:18-alpine

WORKDIR /app

# Install development tools
RUN apk add --no-cache \
    bash \
    git \
    curl

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Expose port
EXPOSE 3000

# Set environment to development
ENV NODE_ENV=development

# Start the application in development mode
CMD ["npm", "run", "dev"]
