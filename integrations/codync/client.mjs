const DEFAULT_URL = 'http://127.0.0.1:19222';

export function createCodyncClient({ baseUrl = DEFAULT_URL, token, fetchImpl = fetch } = {}) {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('Codync endpoint must be a loopback HTTP origin');
  }
  const origin = parsed.origin;

  async function request(path, { protectedCall = false, body } = {}) {
    if (protectedCall && !token) throw new Error('Codync token required');
    const response = await fetchImpl(origin + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(protectedCall ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Codync request failed (${response.status})`);
    return response.json();
  }

  return {
    health: () => request('/health'),
    call: (method, args = {}) => {
      if (!/^[A-Za-z][A-Za-z0-9]*$/.test(method)) return Promise.reject(new Error('invalid method'));
      return request(`/api/${method}`, { protectedCall: true, body: args });
    },
    // Read-only roster snapshot; `since: 0` returns all current bots.
    bots: async () => {
      const snapshot = await request('/api/sync', { protectedCall: true, body: { since: 0 } });
      if (!Array.isArray(snapshot.bots)) throw new Error('Invalid Codync sync response');
      return snapshot.bots;
    },
    history: (botId, limit = 100) => {
      if (!botId || typeof botId !== 'string') return Promise.reject(new Error('botId required'));
      return request('/api/history', { protectedCall: true, body: { botId, limit } });
    },
  };
}
