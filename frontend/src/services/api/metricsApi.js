import http from './http';

export const metricsApi = {
  summary: () => http.get('/metrics').then((r) => r.data),
};
