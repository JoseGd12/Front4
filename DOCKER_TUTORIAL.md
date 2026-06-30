# Tutorial Completo: Dockerizar Frontend de Barbería

Este documento te guía paso a paso para dockerizar tu aplicación React usando Docker, Docker Compose y WSL.

## Tabla de Contenidos
1. [Requisitos Previos](#requisitos-previos)
2. [Instalación de Docker en WSL](#instalación-de-docker-en-wsl)
3. [Estructura de Archivos](#estructura-de-archivos)
4. [Construcción y Despliegue Local](#construcción-y-despliegue-local)
5. [Subir a Docker Hub](#subir-a-docker-hub)
6. [Comandos Útiles](#comandos-útiles)
7. [Solución de Problemas](#solución-de-problemas)

---

## Requisitos Previos

**En Windows 11:**
- Windows Subsystem for Linux 2 (WSL2) instalado
- Docker Desktop para Windows (con WSL2)
- Git Bash o PowerShell

**En WSL2:**
- Docker instalado
- Node.js (opcional, si vas a hacer build en WSL)

---

## Instalación de Docker en WSL

### Opción 1: Docker Desktop (Recomendado)

1. **Descarga Docker Desktop para Windows:**
   - Ve a [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
   - Descarga la versión Windows

2. **Instala Docker Desktop:**
   - Ejecuta el instalador
   - Asegúrate de que "WSL2" esté habilitado durante la instalación
   - Reinicia tu máquina

3. **Verifica la instalación:**
   ```bash
   docker --version
   docker run hello-world
   ```

### Opción 2: Instalar Docker Directly en WSL2

Si prefieres usar solo WSL2 sin Docker Desktop:

```bash
# En WSL2
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar tu usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Verificar
docker --version
```

---

## Estructura de Archivos

Ya tienes listos en tu proyecto:
```
Front4/
├── Dockerfile          ← Multi-stage build
├── nginx.conf          ← Configuración de Nginx
├── docker-compose.yml  ← Orquestación de contenedores
├── .env.example        ← Variables de entorno
├── package.json
├── vite.config.ts
├── src/
├── public/
└── index.html
```

---

## Construcción y Despliegue Local

### Paso 1: Preparar Variables de Entorno

```bash
# Copia el archivo de ejemplo
cp .env.example .env

# Edita .env con tus valores reales
# (abre con tu editor favorito y llena los valores)
```

### Paso 2: Build Manual (Sin Docker Compose)

```bash
# Construir la imagen Docker
docker build -t barberia-frontend:latest .

# Ejecutar el contenedor
docker run -p 3000:80 barberia-frontend:latest

# Accede a http://localhost:3000
```

### Paso 3: Usar Docker Compose (Recomendado)

**Iniciar los servicios:**
```bash
# En el directorio del proyecto (donde está docker-compose.yml)
docker-compose up -d
```

**Ver logs:**
```bash
docker-compose logs -f barberia-frontend
```

**Detener servicios:**
```bash
docker-compose down
```

**Reconstruir después de cambios:**
```bash
docker-compose up --build -d
```

### Paso 4: Verificar que Funciona

Abre tu navegador en `http://localhost:3000`

---

## Subir a Docker Hub

### Paso 1: Crear Cuenta en Docker Hub

1. Ve a [hub.docker.com](https://hub.docker.com)
2. Crea una cuenta gratuita
3. Confirma tu email

### Paso 2: Login desde Terminal

```bash
# PowerShell o WSL2
docker login

# Te pedirá:
# Username: tu_usuario_dockerhub
# Password: tu_contraseña
```

### Paso 3: Buildear con Tag de Docker Hub

```bash
# Formato: docker build -t usuario/nombre:version .
docker build -t tu_usuario/barberia-frontend:1.0.0 .

# También con 'latest' (opcional)
docker build -t tu_usuario/barberia-frontend:latest .
```

### Paso 4: Subir a Docker Hub

```bash
# Push la versión específica
docker push tu_usuario/barberia-frontend:1.0.0

# Push el tag latest (si lo creaste)
docker push tu_usuario/barberia-frontend:latest
```

### Paso 5: Verificar en Docker Hub

1. Abre [hub.docker.com/repositories](https://hub.docker.com/repositories)
2. Verifica que tu imagen aparezca
3. Debería ser visible como público (o privado, según prefieras)

---

## Usar Imagen desde Docker Hub

### Local:
```bash
# Descargar y ejecutar
docker run -p 3000:80 tu_usuario/barberia-frontend:latest
```

### En Otro Servidor:
```bash
# Pull la imagen
docker pull tu_usuario/barberia-frontend:latest

# Ejecutar
docker run -d -p 80:80 tu_usuario/barberia-frontend:latest
```

### Con Docker Compose:
```yaml
version: '3.8'
services:
  frontend:
    image: tu_usuario/barberia-frontend:latest
    ports:
      - "3000:80"
    restart: unless-stopped
```

---

## Cambiar Entre Entornos

### Desarrollo (con recarga automática)

```bash
# Directamente con Vite (sin Docker)
npm install
npm run dev
```

### Producción (Docker)

```bash
docker-compose up -d
```

---

## Comandos Útiles

### Listar y Gestionar Imágenes
```bash
# Listar imágenes locales
docker images

# Eliminar imagen
docker rmi nombre:tag

# Ver historial de construcción
docker history barberia-frontend:latest
```

### Gestionar Contenedores
```bash
# Listar contenedores ejecutándose
docker ps

# Listar todos los contenedores (incluyendo detenidos)
docker ps -a

# Ver logs en tiempo real
docker logs -f nombre_contenedor

# Ejecutar comando en contenedor activo
docker exec -it nombre_contenedor sh

# Detener contenedor
docker stop nombre_contenedor

# Reiniciar contenedor
docker restart nombre_contenedor

# Eliminar contenedor
docker rm nombre_contenedor
```

### Docker Compose
```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Ver estado de servicios
docker-compose ps

# Detener todo
docker-compose down

# Eliminar volúmenes también
docker-compose down -v

# Reconstruir imágenes
docker-compose build --no-cache

# Ejecutar comando en servicio
docker-compose exec barberia-frontend sh
```

### Optimizar Tamaño
```bash
# Eliminar imágenes no usadas
docker image prune -a

# Eliminar contenedores detenidos
docker container prune

# Ver uso de disco
docker system df
```

---

## Solución de Problemas

### Error: "Cannot connect to Docker daemon"

**En Windows:**
```bash
# Asegúrate que Docker Desktop esté ejecutándose
# Abre Docker Desktop desde el menú de inicio
```

**En WSL2:**
```bash
# Reinicia Docker
sudo systemctl restart docker

# O si no está instalado en WSL
# Usa Docker Desktop de Windows en su lugar
```

### Error: "Port 3000 already in use"

```bash
# Encuentra qué está usando el puerto
netstat -ano | findstr :3000  # Windows CMD

# O usa un puerto diferente
docker run -p 8080:80 barberia-frontend:latest

# Luego accede a http://localhost:8080
```

### Error: Build Falla por Variables de Entorno

Las variables Vite deben incluirse en tiempo de build. El docker-compose.yml usa `${VARIABLE}` que requiere un archivo `.env`:

```bash
# Asegúrate de tener .env en la raíz del proyecto
cat .env

# Si falta, copia de .env.example
cp .env.example .env
```

### Imagen Muy Grande

Optimiza el Dockerfile:
```dockerfile
# Usa alpine en lugar de full node image
FROM node:22-alpine  # Ya lo haces ✓

# Limpia npm cache
RUN npm ci --only=production && npm cache clean --force
```

### Nginx Muestra 502 Bad Gateway

Verifica que los archivos estén buildeados correctamente:
```bash
# Entra al contenedor
docker exec -it barberia-frontend sh

# Verifica que /usr/share/nginx/html tenga contenido
ls -la /usr/share/nginx/html/

# Si está vacío, el build falló
```

---

## Workflow Recomendado

### 1. Desarrollo Local (sin Docker)
```bash
npm install
npm run dev
# Accede a http://localhost:3000
```

### 2. Testing con Docker Localmente
```bash
docker-compose up --build -d
# Accede a http://localhost:3000
docker-compose logs -f
```

### 3. Subir a Docker Hub
```bash
docker build -t tu_usuario/barberia-frontend:1.0.0 .
docker push tu_usuario/barberia-frontend:1.0.0
```

### 4. En Servidor de Producción
```bash
# SSH al servidor
ssh usuario@servidor

# Clone o descarga docker-compose.yml y .env
docker pull tu_usuario/barberia-frontend:1.0.0
docker run -d -p 80:80 tu_usuario/barberia-frontend:1.0.0
```

---

## Configuración Avanzada

### Nginx con HTTPS (Let's Encrypt)

Actualiza `nginx.conf`:
```nginx
server {
    listen 443 ssl http2;
    server_name tu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    # ... resto de configuración
}

# Redirect HTTP a HTTPS
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$server_name$request_uri;
}
```

### Multi-Stage Build Optimizado

Ya lo tienes en el Dockerfile. Ventajas:
- Build stage: instala deps y compila
- Runtime stage: solo incluye archivos necesarios
- Imagen final ~100MB (vs ~500MB sin optimization)

### Pasar Variables en Runtime

```bash
# En lugar de .env, puedes pasar variables al ejecutar
docker run -e VITE_API_BASE_URL=https://api.ejemplo.com \
           -p 3000:80 \
           barberia-frontend:latest
```

Nota: Vite necesita que las variables estén en build time, así que esto no funcionará directamente. Para runtime variables, necesitarías usar un script en Nginx o Next.js.

---

## Checklists

### Antes de Subir a Docker Hub
- [ ] `.env` tiene valores correctos
- [ ] `docker build` se completa sin errores
- [ ] `docker run` funciona localmente
- [ ] La app es accesible en navegador
- [ ] Todos los assets (CSS, JS, imágenes) cargan correctamente

### Antes de Desplegar a Producción
- [ ] Imagen está en Docker Hub
- [ ] `docker pull` funciona en servidor
- [ ] `docker run` se inicia sin errores en servidor
- [ ] Health check pasa
- [ ] Certificados SSL configurados (si es necesario)
- [ ] Variables de entorno configuradas correctamente

---

## Referencias

- [Documentación Docker](https://docs.docker.com/)
- [Docker Hub](https://hub.docker.com)
- [WSL Documentation](https://learn.microsoft.com/en-us/windows/wsl/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Vite Documentation](https://vitejs.dev/)

---

**¿Preguntas o problemas?** Revisa la sección de [Solución de Problemas](#solución-de-problemas) o crea un issue en tu repositorio.
