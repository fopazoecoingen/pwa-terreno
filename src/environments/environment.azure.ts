/** Apunta directo a Azure Producción (requiere CORS con el origen de la PWA). */
export const environment = {
  production: false,
  apiBaseUrl: 'https://ecoingen-api-produccion.azurewebsites.net',
  apiUrl: 'https://ecoingen-api-produccion.azurewebsites.net/api/',
  appName: 'Ecoingen Terreno',
  version: '1.0.0',
  blobCuenta: 'ecoingenblobproduccion',
  terrenoBlobContenedor: 'imagenes-terreno',
};
