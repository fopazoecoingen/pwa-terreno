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

/** Extrae solo el nombre de carpeta; acepta JSON legacy de URLs (como el API). */
export function normalizarCarpetaBlobStorage(
  blobStorage: string,
  nombreTerreno: string,
): string {
  const t = (blobStorage ?? '').trim();
  if (!t || t === '[]') return sanitizarSegmentoBlob(nombreTerreno);

  if (t.startsWith('[')) {
    try {
      const urls = JSON.parse(t) as unknown;
      if (Array.isArray(urls) && urls.length > 0) {
        const first = String(urls[0] ?? '');
        const path = new URL(first).pathname.replace(/^\/+/, '');
        const segmentos = path.split('/');
        const idx = segmentos.indexOf('imagenes-terreno');
        if (idx >= 0 && idx + 1 < segmentos.length) {
          return segmentos[idx + 1].slice(0, 120);
        }
      }
    } catch {
      /* legacy */
    }
    return sanitizarSegmentoBlob(nombreTerreno);
  }

  return t.length > 120 ? t.slice(0, 120) : t;
}
