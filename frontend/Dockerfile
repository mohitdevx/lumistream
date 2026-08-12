FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy root configs
COPY package.json pnpm-workspace.yaml* ./

# Copy frontend package.json and install dependencies
COPY frontend/package.json ./frontend/
RUN pnpm install --filter frontend

# Copy frontend codebase
COPY frontend/ ./frontend/

# Build React app
WORKDIR /usr/src/app/frontend
RUN pnpm build

# Serve stage
FROM nginx:alpine
COPY --from=build /usr/src/app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
