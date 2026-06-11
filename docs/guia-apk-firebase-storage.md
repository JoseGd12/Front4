# Guia: Subir APK a Firebase Storage

## Prerequisitos

- Tener Firebase CLI instalado (`npm install -g firebase-tools`)
- Proyecto Firebase configurado
- Archivo APK generado

## Opcion A: Desde Firebase Console (mas simple)

1. Ir a [Firebase Console](https://console.firebase.google.com)
2. Seleccionar el proyecto
3. Ir a **Storage** en el menu lateral
4. Crear carpeta `downloads/`
5. Subir el archivo APK con nombre `manito-barbershop.apk`
6. Click en el archivo subido > copiar **URL de descarga**
7. Configurar reglas de acceso publico (ver seccion Reglas)

## Opcion B: Desde Firebase CLI

```bash
# Login
firebase login

# Subir archivo (requiere gsutil)
gsutil cp ./manito-barbershop.apk gs://<TU-BUCKET>.appspot.com/downloads/manito-barbershop.apk

# Hacer publico
gsutil acl ch -u AllUsers:R gs://<TU-BUCKET>.appspot.com/downloads/manito-barbershop.apk
```

## Reglas de Storage

Agregar regla para lectura publica en la carpeta `downloads/`:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // APK publico
    match /downloads/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Resto de reglas existentes...
  }
}
```

## Opcion C: Servir desde `public/` (sin backend)

Si se prefiere no usar Firebase Storage, colocar el APK directamente en la carpeta `public/` del proyecto frontend:

```
Front4/
  public/
    downloads/
      manito-barbershop.apk
```

Vite sirve archivos de `public/` de forma estatica. El enlace `/downloads/manito-barbershop.apk` funcionara directamente sin configuracion adicional.

**Nota:** Esta opcion incluye el APK en el bundle de deploy. Si el APK es grande (>50MB), usar Firebase Storage.

## Actualizar la URL en el frontend

El boton de descarga en `src/features/dashboard/pages/LandingPage.tsx` apunta a:

```
/downloads/manito-barbershop.apk
```

- Si se usa **Opcion C** (public/): funciona tal cual
- Si se usa **Opcion A o B** (Firebase Storage): reemplazar el `href` con la URL completa de Firebase Storage:

```tsx
href="https://firebasestorage.googleapis.com/v0/b/<BUCKET>/o/downloads%2Fmanito-barbershop.apk?alt=media"
```

## Actualizar el APK

Para nuevas versiones:
1. Subir nuevo archivo con el mismo nombre (sobreescribe el anterior)
2. La URL se mantiene igual, usuarios descargan version nueva automaticamente

## Limitaciones

- Solo Android. iOS no permite instalacion fuera de App Store
- Usuario debe habilitar "Instalar desde fuentes desconocidas" en Ajustes > Seguridad
- No hay actualizaciones automaticas push
- Firebase Storage Free tier: 5GB almacenamiento, 1GB/dia descarga
