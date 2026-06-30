# Guía Completa: Docker en WSL2 (Windows + WSL)

Esta guía te enseña cómo configurar Docker para trabajar con tu proyecto desde Windows o WSL2.

---

## Configuración Inicial: Opción A (Recomendado) - Docker Desktop + WSL2

### Paso 1: Instalar WSL2

Si aún no lo tienes:

```powershell
# En PowerShell como Administrador
wsl --install

# Reinicia la máquina
# Luego, instala una distribución (Ubuntu es la más común)
wsl --install -d Ubuntu
```

Verifica:
```powershell
wsl --list --verbose
# Deberías ver Ubuntu con VERSION 2
```

### Paso 2: Instalar Docker Desktop

1. Descarga desde: https://www.docker.com/products/docker-desktop
2. Ejecuta el instalador
3. **IMPORTANTE:** Durante la instalación, marca:
   - ✓ "Install required Windows components for WSL 2"
   - ✓ "Use WSL 2 instead of Hyper-V"

4. Reinicia tu máquina

### Paso 3: Habilitar Integración WSL2 en Docker Desktop

1. Abre **Docker Desktop**
2. Ve a **Settings** (rueda de engranaje)
3. **Resources** → **WSL integration**
4. Habilita tu distribución (Ubuntu, etc.)
5. Click **Apply & Restart**

### Paso 4: Verificar que Funciona

```powershell
# En PowerShell
docker --version
docker run hello-world

# Si funciona, debería descargar y ejecutar un contenedor
```

```bash
# En WSL (abre una terminal Ubuntu)
wsl

# Dentro de WSL
docker --version
docker run hello-world
```

---

## Configuración Alternativa: Opción B - Docker Solo en WSL2 (Sin Docker Desktop)

Si prefieres no instalar Docker Desktop:

### Paso 1: Instalar WSL2 (igual que arriba)

```powershell
wsl --install
# Reinicia
wsl --install -d Ubuntu
```

### Paso 2: Instalar Docker en WSL2

```bash
# Abre terminal WSL (Ubuntu)
wsl

# Dentro de WSL
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar tu usuario al grupo docker
sudo usermod -aG docker $USER

# Reinicia la sesión de WSL
exit
wsl

# Verifica
docker --version
```

### Paso 3: Iniciar Docker (cada vez que abras WSL)

```bash
# Si Docker no está corriendo
sudo systemctl start docker

# Verificar
docker ps
```

**Nota:** Con esta opción, Docker corre DENTRO de WSL2. Debe estar ejecutándose para usar docker desde Windows PowerShell.

---

## Trabajar desde Windows o WSL

### Opción 1: Desde PowerShell/CMD (Windows)

```powershell
# Navega a tu proyecto
cd C:\Users\josed\OneDrive\Escritorio\front4v2\Front4

# Usa Docker normalmente
docker-compose up -d
docker-compose logs -f

# Accede a http://localhost:3000
```

**Prerequisito:** Docker Desktop debe estar ejecutándose (lo ves en system tray)

### Opción 2: Desde Terminal WSL (Ubuntu)

```bash
# Abre terminal WSL (Ubuntu desde Start Menu o)
wsl

# Navega al proyecto (la ruta Windows está en /mnt/)
cd /mnt/c/Users/josed/OneDrive/Escritorio/front4v2/Front4

# Usa Docker normalmente
docker-compose up -d
docker-compose logs -f

# Accede a http://localhost:3000 (desde Windows)
```

### Comparativa

| Aspecto | PowerShell | WSL2 |
|--------|-----------|------|
| Rendimiento | Bueno | Mejor |
| Docker Desktop requerido | Sí | Opcional |
| Acceso a archivos | Rápido | Rápido |
| Comandos Linux | No | Sí |
| Desarrollo Node/Linux | No ideal | Perfecto |

**Recomendación:** Usa WSL2 si haces desarrollo activo. PowerShell si solo necesitas build/deploy.

---

## Guía Paso a Paso: Mi Primer Docker en WSL

### Escenario: Necesito correr la app en Docker desde Windows

```powershell
# 1. Abre PowerShell
cd C:\Users\josed\OneDrive\Escritorio\front4v2\Front4

# 2. Asegúrate de que Docker Desktop está corriendo
#    (busca el ícono de ballena en la bandeja del sistema)

# 3. Copia el .env
Copy-Item .env.example .env

# 4. Ejecuta
docker-compose up -d

# 5. Verifica
docker-compose ps

# 6. Abre navegador
# http://localhost:3000

# 7. Ver logs si algo falla
docker-compose logs -f

# 8. Detener cuando termines
docker-compose down
```

---

## Guía Paso a Paso: Mi Primer Docker en WSL Terminal

### Escenario: Trabajo desde terminal Ubuntu (WSL)

```bash
# 1. Abre terminal Ubuntu (desde Start Menu o PowerShell con 'wsl')
wsl

# 2. Navega al proyecto
cd /mnt/c/Users/josed/OneDrive/Escritorio/front4v2/Front4

# 3. Verifica Docker está listo
docker ps

# 4. Copia .env (si estás en Opción B, Docker corre en WSL)
cp .env.example .env

# 5. Ejecuta
docker-compose up -d

# 6. Ve logs
docker-compose logs -f

# 7. Abre navegador desde Windows (la misma máquina)
# http://localhost:3000

# 8. Desde WSL, puedes hacer pruebas también
curl http://localhost

# 9. Cuando termines
docker-compose down
```

---

## Performance: Tips para WSL2

### Habilitar WSL2 en Docker Desktop (Ya cubierto)

Si no lo hiciste, vuelve a **Docker Desktop → Settings → Resources → WSL integration**

### Evitar Problemas de Rendimiento

1. **NO** Clonar el proyecto dentro de WSL en `/home/usuario/`
   - ✗ Lento: Clonar en `/home/ubuntu/barberia/`
   - ✓ Rápido: Usar desde `/mnt/c/Users/.../` (Windows NTFS)

2. **No** ejecutar Docker en WSL si usas Docker Desktop
   - Docker Desktop ya usa WSL2 de fondo
   - No necesitas instalar Docker dentro de WSL si usas Desktop

3. **Git en WSL**: Si necesitas git dentro de WSL
   ```bash
   sudo apt update
   sudo apt install git -y
   ```

### Asignar Más Recursos a WSL

Si WSL es lento, puedes darle más CPU/RAM:

Crea o edita `C:\Users\josed\.wslconfig`:
```ini
[wsl2]
memory=4GB      # RAM máxima para WSL
processors=4    # Núcleos de CPU
swap=2GB
localhostForwarding=true
```

Reinicia WSL:
```powershell
wsl --shutdown
wsl
```

---

## Problemas Comunes en WSL

### Error: "Cannot connect to Docker daemon"

**Causa:** Docker Desktop no está corriendo o no está integrado con WSL

**Solución:**
1. Abre Docker Desktop (desde Start Menu)
2. Ve a Settings → Resources → WSL integration
3. Marca tu distribución
4. Click Apply & Restart

```bash
# Verifica
docker ps
```

### Error: "permission denied while trying to connect to Docker daemon socket"

**En WSL:**
```bash
# Usuario no está en grupo docker
sudo usermod -aG docker $USER

# Reinicia sesión
exit
wsl
```

**En Windows PowerShell:**
- Docker Desktop necesita permisos de administrador
- Ejecuta PowerShell **Como Administrador**

### Rutas Lentas en WSL

Si accedes a archivos desde WSL en `/mnt/c/...` y es lento:

```bash
# Clona el proyecto DENTRO de WSL
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/tu-repo/barberia.git

# Usa desde ahí (más rápido)
cd barberia
docker-compose up
```

**Nota:** Los archivos estarán en WSL. Si necesitas editarlos desde VS Code en Windows, instala VS Code Remote:
- Extensión "Remote - WSL" en VS Code
- Abrirá archivos WSL directamente

### WSL Usa Demasiada RAM

WSL acumula memoria con el tiempo. Libérala:

```powershell
# Desde PowerShell como Administrador
wsl --shutdown

# WSL se reinicia automáticamente cuando lo uses nuevamente
wsl
```

---

## Docker Compose en WSL: Tips Especiales

### .env en WSL

Si editas `.env` desde Windows, funciona normalmente. Si desde WSL:

```bash
# Desde WSL, edita .env
nano .env

# O copia desde .env.example
cp .env.example .env
nano .env  # Edita con nano
```

### Volúmenes en WSL

`docker-compose.yml` puede tener volúmenes:

```yaml
services:
  frontend:
    volumes:
      - ./src:/app/src
      - node_modules:/app/node_modules
```

**Esto funciona normalmente en WSL2.**

### Redes en Docker Compose en WSL

Por defecto, `docker-compose` crea una network aislada. Los contenedores se comunican entre ellos:

```yaml
services:
  frontend:
    # Puede hablar con backend en http://backend:3001
    environment:
      - API_URL=http://backend:3001
```

Desde tu máquina (Windows o WSL), accede a través de `localhost`:
```
http://localhost:3000   # frontend
http://localhost:3001   # backend (si existe)
```

---

## Alias y Atajos (Opcional)

### En PowerShell (Windows)

Edita tu perfil:
```powershell
# Abre o crea tu perfil
notepad $PROFILE

# Agrega estos alias
function dc { docker-compose @args }
function dcup { docker-compose up -d }
function dcdown { docker-compose down }
function dclogs { docker-compose logs -f }

# Guarda y reinicia PowerShell
```

Ahora puedes:
```powershell
dc up -d
dclogs
dc down
```

### En WSL Bash

```bash
# Edita ~/.bashrc
nano ~/.bashrc

# Agrega al final
alias dc='docker-compose'
alias dcup='docker-compose up -d'
alias dcdown='docker-compose down'
alias dclogs='docker-compose logs -f'

# Guarda (Ctrl+O, Enter, Ctrl+X)
source ~/.bashrc
```

---

## Checklist: WSL + Docker Completo

### Instalación Inicial
- [ ] WSL2 instalado (`wsl --version` muestra v2)
- [ ] Docker Desktop instalado (o Docker en WSL)
- [ ] Docker Desktop integrado con WSL (`Docker Desktop → Settings → WSL integration`)
- [ ] `docker --version` funciona desde PowerShell Y desde WSL

### Primer Run
- [ ] `.env` creado en el proyecto
- [ ] `docker-compose up -d` se ejecuta sin errores
- [ ] `docker ps` muestra el contenedor corriendo
- [ ] `http://localhost:3000` muestra la app

### Producción
- [ ] Cuenta Docker Hub creada
- [ ] `docker login` funciona
- [ ] Imagen buildeada con versión correcta
- [ ] `docker push` exitoso
- [ ] Imagen visible en `hub.docker.com/repositories`

---

## Recursos

- [WSL Installation](https://learn.microsoft.com/en-us/windows/wsl/install)
- [Docker Desktop WSL2](https://docs.docker.com/desktop/wsl/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [WSL Best Practices](https://learn.microsoft.com/en-us/windows/wsl/setup/environment)

---

¿Listo para empezar? Sigue [DOCKER_QUICK_START.md](./DOCKER_QUICK_START.md)
