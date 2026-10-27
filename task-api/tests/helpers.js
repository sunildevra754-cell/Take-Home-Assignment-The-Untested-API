const request = require('supertest');
const app = require('../src/app');

const extractList = (body) =>
  Array.isArray(body) ? body : body.tasks || body.data || body.items || [];

const createTask = async (overrides = {}) => {
  const res = await request(app)
    .post('/tasks')
    .send({ title: `Task ${Math.random().toString(36).slice(2, 8)}`, ...overrides });
  return res;
};

module.exports = { request, app, extractList, createTask };
