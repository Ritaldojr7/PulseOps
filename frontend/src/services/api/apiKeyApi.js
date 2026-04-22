import http from './http';

export const apiKeyApi = {
  list: () => http.get('/apikeys').then((r) => r.data),
  create: (name) => http.post('/apikeys', { name }).then((r) => r.data),
  revoke: (id) => http.post(`/apikeys/${id}/revoke`).then((r) => r.data),
  delete: (id) => http.delete(`/apikeys/${id}`).then((r) => r.data),
};
