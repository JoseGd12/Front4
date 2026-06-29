#!/bin/bash

# Script de ayuda para buildear y pushear a Docker Hub
# Uso: ./docker-build-push.sh [version] [usuario]

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validar argumentos
if [ $# -lt 2 ]; then
    echo -e "${RED}Uso: ./docker-build-push.sh <version> <usuario_dockerhub>${NC}"
    echo -e "Ejemplo: ./docker-build-push.sh 1.0.0 tu_usuario"
    exit 1
fi

VERSION=$1
DOCKER_USER=$2
IMAGE_NAME="barberia-frontend"
FULL_IMAGE="${DOCKER_USER}/${IMAGE_NAME}:${VERSION}"
LATEST_IMAGE="${DOCKER_USER}/${IMAGE_NAME}:latest"

echo -e "${YELLOW}=== Docker Build & Push ===${NC}"
echo "Imagen: $FULL_IMAGE"
echo ""

# Step 1: Build
echo -e "${YELLOW}[1/4] Construyendo imagen...${NC}"
if docker build -t "$FULL_IMAGE" -t "$LATEST_IMAGE" .; then
    echo -e "${GREEN}✓ Build exitoso${NC}"
else
    echo -e "${RED}✗ Build falló${NC}"
    exit 1
fi

echo ""

# Step 2: Verificar login
echo -e "${YELLOW}[2/4] Verificando login en Docker Hub...${NC}"
if docker login; then
    echo -e "${GREEN}✓ Login exitoso${NC}"
else
    echo -e "${RED}✗ Login falló${NC}"
    exit 1
fi

echo ""

# Step 3: Push version
echo -e "${YELLOW}[3/4] Subiendo versión $VERSION...${NC}"
if docker push "$FULL_IMAGE"; then
    echo -e "${GREEN}✓ Push de versión exitoso${NC}"
else
    echo -e "${RED}✗ Push falló${NC}"
    exit 1
fi

echo ""

# Step 4: Push latest
echo -e "${YELLOW}[4/4] Subiendo tag 'latest'...${NC}"
if docker push "$LATEST_IMAGE"; then
    echo -e "${GREEN}✓ Push de latest exitoso${NC}"
else
    echo -e "${RED}✗ Push de latest falló${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== ¡Proceso completado! ===${NC}"
echo -e "Imagen disponible en: ${GREEN}https://hub.docker.com/r/${DOCKER_USER}/${IMAGE_NAME}${NC}"
echo ""
echo "Para descargar y ejecutar:"
echo -e "  ${YELLOW}docker run -p 3000:80 ${FULL_IMAGE}${NC}"
echo ""
