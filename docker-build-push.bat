@echo off
REM Script de ayuda para buildear y pushear a Docker Hub (Windows)
REM Uso: docker-build-push.bat [version] [usuario]

if "%~2"=="" (
    echo Uso: docker-build-push.bat ^<version^> ^<usuario_dockerhub^>
    echo Ejemplo: docker-build-push.bat 1.0.0 tu_usuario
    exit /b 1
)

setlocal enabledelayedexpansion

set VERSION=%~1
set DOCKER_USER=%~2
set IMAGE_NAME=barberia-frontend
set FULL_IMAGE=%DOCKER_USER%/%IMAGE_NAME%:%VERSION%
set LATEST_IMAGE=%DOCKER_USER%/%IMAGE_NAME%:latest

echo.
echo === Docker Build ^& Push ===
echo Imagen: %FULL_IMAGE%
echo.

REM Step 1: Build
echo [1/4] Construyendo imagen...
docker build -t %FULL_IMAGE% -t %LATEST_IMAGE% .
if %errorlevel% neq 0 (
    echo X Build falló
    exit /b 1
)
echo.
echo [OK] Build exitoso
echo.

REM Step 2: Login
echo [2/4] Verificando login en Docker Hub...
docker login
if %errorlevel% neq 0 (
    echo X Login falló
    exit /b 1
)
echo [OK] Login exitoso
echo.

REM Step 3: Push version
echo [3/4] Subiendo versión %VERSION%...
docker push %FULL_IMAGE%
if %errorlevel% neq 0 (
    echo X Push falló
    exit /b 1
)
echo [OK] Push de versión exitoso
echo.

REM Step 4: Push latest
echo [4/4] Subiendo tag 'latest'...
docker push %LATEST_IMAGE%
if %errorlevel% neq 0 (
    echo X Push de latest falló
    exit /b 1
)
echo [OK] Push de latest exitoso
echo.

echo === ¡Proceso completado! ===
echo Imagen disponible en: https://hub.docker.com/r/%DOCKER_USER%/%IMAGE_NAME%
echo.
echo Para descargar y ejecutar:
echo   docker run -p 3000:80 %FULL_IMAGE%
echo.

endlocal
