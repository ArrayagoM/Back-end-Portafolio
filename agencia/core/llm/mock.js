// Proveedor nulo: sin IA. Los agentes deben caer a heurísticas.
export function createMock() {
  return {
    name: 'mock',
    available: false,
    async complete() { return ''; },
    async completeJSON() { return {}; },
  };
}
