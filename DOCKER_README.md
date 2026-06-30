# Docker Setup - Barbería App

Tu proyecto está listo para dockerizarse. Aquí está todo lo que necesitas.

## 📋 Archivos Nuevos

```
Front4/
├── 📄 Dockerfile              ← Define la imagen Docker
├── 📄 docker-compose.yml      ← Orquesta todo
├── 📄 nginx.conf              ← Config servidor web
├── 📄 .dockerignore           ← Excluye archivos del build
├── 📄 docker-build-push.sh    ← Script build+push (Unix)
├── 📄 docker-build-push.bat   ← Script build+push (Windows)
│
├── 📚 DOCKER_README.md        ← Este archivo
├── 📚 DOCKER_QUICK_START.md   ← Comienza aquí (5 min)
├── 📚 DOCKER_TUTORIAL.md      ← Tutorial completo
├── 📚 WSL_SETUP.md            ← Guía específica para WSL
```

## 🚀 Empezar Ahora: 3 Pasos

### 1. Verificar Docker
```bash
docker --version
docker-compose --version
```

### 2. Copiar Variables de Entorno
```bash
cp .env.example .env
# Edita .env si necesario
```

### 3. Ejecutar
```bash
docker-compose up -d
# Abre http://localhost:3000
```

---

## 📖 Documentación

### ⚡ **PRIMERO LEE ESTO:**
→ [**DOCKER_QUICK_START.md**](./DOCKER_QUICK_START.md) (5 minutos)

Para workflows rápidos y comandos esenciales.

---

### 📚 **Guías Detalladas:**

| Documento | Para Quién | Lectura |
|-----------|-----------|---------|
| [DOCKER_QUICK_START.md](./DOCKER_QUICK_START.md) | Cualquiera | 5 min |
| [DOCKER_TUTORIAL.md](./DOCKER_TUTORIAL.md) | Completo detallado | 20 min |
| [WSL_SETUP.md](./WSL_SETUP.md) | Usuarios WSL/Windows | 15 min |

---

## 🎯 Casos de Uso

### ✅ "Solo quiero correr la app en Docker"
```bash
docker-compose up -d
# Listo. http://localhost:3000
```

→ Lee [DOCKER_QUICK_START.md](./DOCKER_QUICK_START.md)

### ✅ "Quiero subir a Docker Hub"
```bash
./docker-build-push.sh 1.0.0 tu_usuario
# O en Windows
.\docker-build-push.bat 1.0.0 tu_usuario
```

→ Lee la sección [Subir a Docker Hub](./DOCKER_TUTORIAL.md#subir-a-docker-hub) del tutorial

### ✅ "Estoy en Windows y WSL, no sé qué hacer"
→ Lee [WSL_SETUP.md](./WSL_SETUP.md)

### ✅ "Necesito entender todo en detalle"
→ Lee [DOCKER_TUTORIAL.md](./DOCKER_TUTORIAL.md)

---

## ⚙️ Cómo Funciona

### Build Multi-Stage (Optimizado)

```dockerfile
Stage 1: Build
├─ node:22-alpine (builder)
├─ npm install
├─ npm run build
└─ output: /app/build

Stage 2: Production
├─ nginx:alpine (servidor)
├─ Copia /app/build
├─ Expone puerto 80
└─ Sirve SPA React
```

**Resultado:** Imagen ~120MB (vs ~500MB sin optimización)

### Docker Compose

Maneja:
- Build automático de imagen
- Iniciar/detener contenedor
- Variables de entorno (.env)
- Health checks
- Redes

---

## 🛠️ Comandos Rápidos

```bash
# Iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f barberia-frontend

# Detener
docker-compose down

# Reconstruir
docker-compose up --build -d

# Ver estado
docker-compose ps

# Limpiar volúmenes
docker-compose down -v
```

---

## 🐳 Docker Hub

### Subir Imagen

```bash
# Opción 1: Script automatizado
./docker-build-push.sh 1.0.0 tu_usuario

# Opción 2: Manual
docker login
docker build -t tu_usuario/barberia-frontend:1.0.0 .
docker push tu_usuario/barberia-frontend:1.0.0
```

### Usar en Otro Servidor

```bash
docker pull tu_usuario/barberia-frontend:1.0.0
docker run -d -p 80:80 tu_usuario/barberia-frontend:1.0.0
```

---

## 🏗️ Estructura Técnica

### Dockerfile
- **Base:** node:22-alpine (build) → nginx:alpine (production)
- **Build:** `npm run build` genera `/build`
- **Serve:** Nginx sirve SPA React con fallback a index.html
- **Health Check:** Verifica que Nginx responda

### nginx.conf
- Compression (gzip)
- Cache de assets (1 año)
- SPA routing (try_files)
- Security headers
- Tamaño máximo upload: 20MB

### docker-compose.yml
- Variables de entorno desde `.env`
- Health checks automáticos
- Network aislada
- Restart automático

---

## ❓ FAQ

**P: ¿Necesito Node.js instalado si uso Docker?**
R: No. Docker incluye Node dentro del contenedor.

**P: ¿Puedo editar código después de buildear?**
R: No directamente. El build genera archivos estáticos. Tienes 2 opciones:
1. Editar + hacer `docker-compose up --build`
2. Para desarrollo rápido, usa `npm run dev` (sin Docker)

**P: ¿Cómo paso variables de entorno?**
R: Usa archivo `.env` en la raíz del proyecto. Docker Compose lo lee automáticamente.

**P: ¿Puedo usar variables diferentes por ambiente?**
R: Sí, crea `.env.production` y usa: `docker build --build-arg ENV=production`
(Requiere modificar Dockerfile. Consulta [DOCKER_TUTORIAL.md](./DOCKER_TUTORIAL.md))

**P: ¿Qué pasa si el puerto 3000 está en uso?**
R: Edita `docker-compose.yml` línea 11: cambia `"3000:80"` a `"8080:80"`
Luego accede a `http://localhost:8080`

**P: ¿Puedo usar esto en producción?**
R: Sí. La imagen es pequeña, rápida y segura. Consideraciones:
- Usa HTTPS (reverse proxy con Let's Encrypt)
- Configura CORS si la API está en otro dominio
- Monitorea con health checks

---

## 🔍 Troubleshooting

### "docker: command not found"
- **Solución:** Instala Docker Desktop o Docker en WSL
- Ver: [WSL_SETUP.md](./WSL_SETUP.md)

### "Port 3000 already in use"
- **Solución:** Cambia puerto en `docker-compose.yml`
- Ver: [DOCKER_QUICK_START.md](./DOCKER_QUICK_START.md#troubleshooting-rápido)

### "Build falla por falta de variables"
- **Solución:** Asegúrate que `.env` exista
- ```bash
  cp .env.example .env
  # Edita .env con tus valores
  ```

### "App se ve en blanco en navegador"
- **Solución:** Ver logs
- ```bash
  docker-compose logs -f barberia-frontend
  ```

Ver más soluciones en [DOCKER_TUTORIAL.md#solución-de-problemas](./DOCKER_TUTORIAL.md#solución-de-problemas)

---

## 📊 Performance

### Tamaño de Imagen
- Sin optimización: ~500MB
- Con multi-stage build (tu setup): ~120MB
- Con Alpine Linux (ya lo haces): -50MB

### Velocidad
- Build inicial: ~2-3 minutos
- Build con caché: ~10 segundos
- Startup: <1 segundo
- SPA load: <500ms

---

## 🔐 Seguridad

✅ **Ya implementado:**
- Variables de entorno separadas de código
- Nginx bloquea acceso a archivos sensibles
- SPA routing previene exposición de rutas
- Alpine Linux (menos vulnerabilidades)

⚠️ **A considerar en producción:**
- HTTPS/TLS (reverse proxy)
- CORS headers configurados
- Rate limiting en Nginx
- Scanning de vulnerabilidades (`docker scan`)

---

## 📝 Próximos Pasos

1. ✅ Lee [DOCKER_QUICK_START.md](./DOCKER_QUICK_START.md)
2. ✅ Corre `docker-compose up -d`
3. ✅ Verifica `http://localhost:3000`
4. ✅ Sube a Docker Hub siguiendo [DOCKER_TUTORIAL.md#subir-a-docker-hub](./DOCKER_TUTORIAL.md#subir-a-docker-hub)
5. ✅ Deploya en servidor si necesitas

---

## 📞 Soporte

- Logs: `docker-compose logs -f`
- Inspeccionar contenedor: `docker exec -it barberia-frontend sh`
- Troubleshooting: [DOCKER_TUTORIAL.md](./DOCKER_TUTORIAL.md)
- WSL específico: [WSL_SETUP.md](./WSL_SETUP.md)

---

**¿Listo?** → [DOCKER_QUICK_START.md](./DOCKER_QUICK_START.md)
