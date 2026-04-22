import http from './http';

export const alertApi = {
  list: (params = {}) => http.get('/alerts', { params }).then((r) => r.data),
  get: (id) => http.get(`/alerts/${id}`).then((r) => r.data),
  acknowledge: (id) => http.post(`/alerts/${id}/acknowledge`).then((r) => r.data),
  resolve: (id) => http.post(`/alerts/${id}/resolve`).then((r) => r.data),
};
