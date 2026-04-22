import http from './http';

export const serviceApi = {
  list: () => http.get('/services').then((r) => r.data),
  get: (name) => http.get(`/services/${encodeURIComponent(name)}`).then((r) => r.data),
};
