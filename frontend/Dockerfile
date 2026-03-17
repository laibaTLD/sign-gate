# Frontend Dockerfile - Build only
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the app
RUN pnpm build

# Keep container running with a simple command
CMD ["tail", "-f", "/dev/null"]
