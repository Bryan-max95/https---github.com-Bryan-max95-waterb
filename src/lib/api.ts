const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

async function request(endpoint: string, options: any = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response: Response;
  const requestUrl = `${API_URL}${endpoint}`;
  try {
    response = await fetch(requestUrl, { ...options, headers });
  } catch {
    if (API_URL && requestUrl.startsWith(API_URL)) {
      const fallbackUrl = requestUrl.replace(API_URL, '');
      try {
        response = await fetch(fallbackUrl, { ...options, headers });
      } catch {
        throw new Error('No se pudo conectar con el servidor API. Verifica que el servidor este activo en el mismo puerto de la app.');
      }
    } else {
      throw new Error('No se pudo conectar con el servidor API. Verifica que el servidor este activo en el mismo puerto de la app.');
    }
  }
  const contentType = response.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const raw = await response.text();
    if (raw.trim().startsWith('<!DOCTYPE') || raw.trim().startsWith('<html')) {
      throw new Error('El servidor devolvio HTML en vez de JSON. Verifica NEXT_PUBLIC_API_URL y que el backend este activo.');
    }
    throw new Error(raw || 'Respuesta invalida del servidor');
  }

  if (!response.ok) {
    const message = data?.message || 'Error en la petición';
    const detail = data?.error ? ` | ${data.error}` : '';
    throw new Error(`${message}${detail}`);
  }

  return data;
}

export const api = {
  get: (endpoint: string) => request(endpoint, { method: 'GET' }),
  post: (endpoint: string, body: any) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint: string, body: any) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint: string) => request(endpoint, { method: 'DELETE' }),
};
