export function mensajeErrorHttp(err: unknown, fallback: string): string {
  if (err instanceof Error && !(err as { status?: number }).status) {
    // Error de negocio / sync (no HTTP): conservar mensaje.
    if (err.message && !err.message.startsWith('Http failure')) return err.message;
  }
  if (!err || typeof err !== 'object') {
    if (typeof err === 'string' && err.trim()) return err.trim();
    return fallback;
  }
  const e = err as { error?: unknown; message?: string; status?: number; statusText?: string };
  const body = e.error;
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    if (typeof o['message'] === 'string' && o['message'].trim()) return o['message'].trim();
    if (typeof o['Message'] === 'string' && o['Message'].trim()) return o['Message'].trim();
    if (typeof o['title'] === 'string' && o['title'].trim()) return o['title'].trim();
    if (typeof o['status'] === 'string' && o['status'].trim()) return o['status'].trim();
  }
  if (typeof e.message === 'string' && e.message.trim() && !e.message.startsWith('Http failure')) {
    return e.message.trim();
  }
  if (e.status === 0) return 'Sin conexión con el servidor. Revisa tu red o CORS.';
  if (e.status === 401) return 'Sesión expirada. Vuelve a iniciar sesión.';
  if (e.status === 403) return 'No tienes permiso para esta acción.';
  if (e.status === 413) return 'La foto es demasiado grande para subirla.';
  if (typeof e.status === 'number' && e.status > 0) {
    return `${fallback} (HTTP ${e.status}${e.statusText ? ` ${e.statusText}` : ''})`;
  }
  return fallback;
}
