/** Safari/iOS: Blobs de cámara/IndexedDB a veces llegan vacíos al multipart. */

export async function materializarBlob(
  origen: Blob,
  mimeType?: string,
): Promise<Blob> {
  const type = (mimeType || origen.type || 'image/jpeg').trim() || 'image/jpeg';
  const buffer = await origen.arrayBuffer();
  if (!buffer.byteLength) {
    throw new Error('La foto está vacía en el teléfono. Vuelve a seleccionarla.');
  }
  return new Blob([buffer], { type });
}

export async function blobAFile(
  origen: Blob,
  nombreArchivo: string,
  mimeType?: string,
): Promise<File> {
  const blob = await materializarBlob(origen, mimeType);
  const type = blob.type || 'image/jpeg';
  const nombre = normalizarNombreFoto(nombreArchivo, type);
  try {
    return new File([blob], nombre, { type, lastModified: Date.now() });
  } catch {
    // Safari muy antiguo: File constructor puede fallar; FormData acepta Blob+nombre.
    return Object.assign(blob, { name: nombre, lastModified: Date.now() }) as File;
  }
}

export function normalizarNombreFoto(nombre: string | undefined, mime: string): string {
  const base = (nombre || 'foto.jpg').trim() || 'foto.jpg';
  if (/\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(base)) return base;
  if (mime.includes('png')) return `${base}.png`;
  if (mime.includes('webp')) return `${base}.webp`;
  if (mime.includes('heic') || mime.includes('heif')) return `${base}.heic`;
  return `${base}.jpg`;
}
