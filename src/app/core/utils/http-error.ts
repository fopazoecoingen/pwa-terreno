export function mensajeErrorHttp(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback;
  const e = err as { error?: unknown; message?: string; status?: number };
  const body = e.error;
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    if (typeof o['message'] === 'string' && o['message'].trim()) return o['message'].trim();
    if (typeof o['Message'] === 'string' && o['Message'].trim()) return o['Message'].trim();
    if (typeof o['title'] === 'string' && o['title'].trim()) return o['title'].trim();
  }
  if (typeof e.message === 'string' && e.message.trim() && !e.message.startsWith('Http failure')) {
    return e.message.trim();
  }
  if (e.status === 0) return 'Sin conexión con el servidor. Revisa tu red.';
  if (e.status === 401) return 'Sesión expirada. Vuelve a iniciar sesión.';
  if (e.status === 403) return 'No tienes permiso para esta acción.';
  return fallback;
}
