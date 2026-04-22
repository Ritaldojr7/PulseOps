import http from './http';

export const authApi = {
  login: (email, password) =>
    http.post('/auth/login', { email, password }).then((r) => r.data),
  register: (fullName, email, password) =>
    http.post('/auth/register', { fullName, email, password }).then((r) => r.data),
};
