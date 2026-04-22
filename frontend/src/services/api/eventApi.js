import http from './http';

export const eventApi = {
  ingest: (event) => http.post('/events', event).then((r) => r.data),
};
