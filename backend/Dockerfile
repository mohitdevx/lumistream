FROM node:20-alpine

# Install FFmpeg for HLS transcoding
RUN apk add --no-cache ffmpeg python3 make g++ openssl libc6-compat

WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy root configurations
COPY package.json pnpm-workspace.yaml* ./

# Copy backend package.json and install all dependencies (including dev for building)
COPY backend/package.json ./backend/
RUN pnpm install --filter backend

# Copy backend codebase
COPY backend/ ./backend/

# Run prisma generate & compile TypeScript
WORKDIR /usr/src/app/backend
RUN npx prisma generate
RUN pnpm build

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
