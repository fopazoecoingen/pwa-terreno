/**
 * Desarrollo local apuntando a API de producción.
 * En Network verás `https://ecoingen-api-produccion.azurewebsites.net/api/...`.
 *
 * Para API local (`dotnet run`): cambia apiBaseUrl/apiUrl a https://localhost:5001
 * (y asegúrate de que CORS incluya http://localhost:4210).
 */
export const environment = {
  production: false,
  apiBaseUrl: 'https://ecoingen-api-produccion.azurewebsites.net',
  apiUrl: 'https://ecoingen-api-produccion.azurewebsites.net/api/',
  appName: 'Ecoingen Terreno',
  version: '1.0.0',
  blobCuenta: 'ecoingenblobproduccion',
  terrenoBlobContenedor: 'imagenes-terreno',
};
