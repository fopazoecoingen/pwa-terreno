# Ecoingen Terreno (PWA)

Clon web/PWA de `app-terreno` (Flutter/Android) para que el equipo pueda usarlo también en **iPhone/iPad** e instalarlo desde el navegador.

## Qué incluye (v1)

- Login SSO (misma API que la app móvil)
- Panel de módulos
- **Terreno**: nuevo registro con fotos (cámara/galería), mis servicios, listado y detalle
- **Offline (IndexedDB)**: borradores, cola de envío, fotos locales y sync al recuperar red
- Caché de servicios y registros del servidor para consulta sin conexión
- **Carpetas de arranque**: explorar y descargar archivos
- Manifest + service worker (instalable como PWA)

## Offline

1. **Guardar borrador**: queda en el teléfono (texto + fotos)
2. **Encolar envío** sin red: estado `pendiente`
3. Al volver internet (o botón Sync): crea el registro en API y sube fotos al Blob
4. Sin red, “Mis registros” muestra locales + última lista del servidor en caché

Aún no porta croquis ni dictado por voz del Flutter.

## Cómo correr

1. Levanta la API local (`dotnet run` en `gestion-ambiental.api`, puertos 5000/5001).
2. En la PWA:

```bash
cd pwa-terreno
npm install
npm start
```

Abre `http://localhost:4210`.

En desarrollo apunta a `https://localhost:5001/api/...` (CORS con origen `http://localhost:4210`).

Si el navegador bloquea el certificado local, abre una vez `https://localhost:5001` y acepta la excepción.

- QA Azure: `npm run start:qa`
- Producción Azure: `npm run start:azure`
- Build prod: `npm run build`

## Instalar en el teléfono

1. Publica el build (`dist/`) en HTTPS (Static Web App / IIS / nginx)
2. En **Android (Chrome)**: “Instalar app” / Agregar a pantalla de inicio
3. En **iOS (Safari)**: Compartir → **Agregar a pantalla de inicio**

## API

Por defecto apunta a producción (`ecoingen-api-produccion`), igual que `app-terreno`.
Cambia `src/environments/environment*.ts` si necesitas local/QA.
