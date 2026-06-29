# Quick Start: Dockerizar en 5 Minutos

## TLDR: Pasos Esenciales

### 1. Verificar Docker está instalado
```bash
docker --version
docker-compose --version
```

### 2. Copiar .env
```bash
cp .env.example .env
# Editar .env si es necesario
```

### 3. Build y Run con Docker Compose
```bash
docker-compose up -d
```

### 4. Acceder
Abre navegador en `http://localhost:3000`

---

## Arquivos Nuevos Creados

| Archivo | Propósito |
|---------|-----------|
| `Dockerfile` | Define cómo construir la imagen Docker |
| `docker-compose.yml` | Orquesta el contenedor |
| `nginx.conf` | Configura servidor web Nginx |
| `.dockerignore` | Excluye archivos de la imagen |
| `docker-build-push.sh` | Script para subir a Docker Hub (Linux/Mac) |
| `docker-build-push.bat` | Script para subir a Docker Hub (Windows) |
| `DOCKER_TUTORIAL.md` | Tutorial completo |

---

## Workflows Rápidos

### A. Desarrollo Local (Sin Docker)
```bash
npm install
npm run dev
# http://localhost:3000
```

### B. Desarrollo con Docker
```bash
docker-compose up -d
docker-compose logs -f
# http://localhost:3000
```

### C. Subir a Docker Hub

#### Linux/Mac:
```bash
chmod +x docker-build-push.sh
./docker-build-push.sh 1.0.0 tu_usuario
```

#### Windows (PowerShell):
```powershell
.\docker-build-push.bat 1.0.0 tu_usuario
```

#### Manual:
```bash
# 1. Login
docker login

# 2. Build con tag
docker build -t tu_usuario/barberia-frontend:1.0.0 .

# 3. Push
docker push tu_usuario/barberia-frontend:1.0.0

# 4. Verificar en https://hub.docker.com/repositories
```

---

## Comandos Más Comunes

```bash
# Iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down

# Reconstruir
docker-compose up --build -d

# Limpiar todo
docker-compose down -v

# Ver si está corriendo
docker ps
```

---

## WSL: Configuración Específica

### Si Usas WSL2 + Docker Desktop

1. **Habilitar WSL2 en Docker Desktop:**
   - Abre Docker Desktop → Settings
   - Ve a "Resources" → "WSL integration"
   - Habilita tu distribución (Ubuntu, Debian, etc.)

2. **Abrir Terminal WSL:**
   ```powershell
   # En PowerShell de Windows
   wsl

   # O abre Ubuntu/Debian desde Start Menu
   ```

3. **Usar desde WSL:**
   ```bash
   cd /mnt/c/Users/josed/OneDrive/Escritorio/front4v2/Front4
   docker-compose up -d
   ```

### Si Usas Solamente WSL2 + Docker en WSL

```bash
# Dentro de WSL2
sudo systemctl start docker

# El resto es igual
docker-compose up -d
```

---

## Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `docker: command not found` | Docker Desktop no instalado o no iniciado |
| `port 3000 already in use` | Cambiar puerto: `docker-compose.yml` line 11: `"8080:80"` |
| `permission denied` | `sudo usermod -aG docker $USER` (WSL) |
| Build falla | Verifica que `.env` exista y tenga variables |
| App en blanco | Revisa logs: `docker-compose logs -f` |

---

## Próximo: Tutorial Completo

Para más detalles, lee [DOCKER_TUTORIAL.md](./DOCKER_TUTORIAL.md)

---

## Checklists Mínimos

✓ Docker instalado  
✓ `.env` creado (copia de `.env.example`)  
✓ `docker-compose up -d` se ejecuta sin errores  
✓ Accede a `http://localhost:3000` y ves la app  
✓ `docker-compose logs` no muestra errores  

→ **Listo para subir a Docker Hub**

✓ Cuenta en Docker Hub creada  
✓ `docker login` funciona  
✓ Imagen buildeada con tag correcto  
✓ `docker push` completado exitosamente  

→ **Imagen disponible para cualquier servidor**
