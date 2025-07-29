# Use Bun image
FROM oven/bun:1-alpine

# Install necessary packages
RUN apk add --no-cache netcat-openbsd

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install all dependencies
RUN bun install

# Copy application files
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build the application
RUN bun run build

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Waiting for database to be ready..."' >> /app/start.sh && \
    echo 'until nc -z mysql 3306; do' >> /app/start.sh && \
    echo '  echo "Waiting for MySQL..."' >> /app/start.sh && \
    echo '  sleep 2' >> /app/start.sh && \
    echo 'done' >> /app/start.sh && \
    echo 'echo "Database is ready, running migrations..."' >> /app/start.sh && \
    echo 'bunx prisma db push' >> /app/start.sh && \
    echo 'echo "Starting application..."' >> /app/start.sh && \
    echo 'bun run preview' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application with migration
CMD ["/app/start.sh"]