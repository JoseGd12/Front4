# Etapa 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY vite.config.ts ./

# Instalar dependencias
RUN npm install

# Copiar variables de entorno para el build
COPY .env ./

# Copiar código fuente
COPY src ./src
COPY public ./public
COPY index.html ./

# Build de la aplicación
RUN npm run build

# Etapa 2: Production - Servir con Nginx
FROM nginx:alpine

# Copiar archivo de configuración de Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar archivos buildeados desde la etapa anterior
COPY --from=builder /app/build /usr/share/nginx/html

# Exponer puerto
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/index.html || exit 1

# Comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
