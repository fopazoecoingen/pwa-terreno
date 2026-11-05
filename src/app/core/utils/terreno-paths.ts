export function sanitizarSegmentoBlob(valor: string): string {
  let limpio = (valor ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9\-_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (!limpio) limpio = 'terreno';
  return limpio.length > 120 ? limpio.slice(0, 120) : limpio;
}

export function subcarpetaBlobParaRegistro(nombreTerreno: string, servicioId?: number | null): string {
  const base = sanitizarSegmentoBlob(nombreTerreno);
  if (!servicioId || servicioId <= 0) return base;
  return sanitizarSegmentoBlob(`servicio${servicioId}_${base}`);
}
