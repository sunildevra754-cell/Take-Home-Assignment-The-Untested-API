const { request, app, createTask } = require('./helpers');

describe('PATCH /tasks/:id/assign', () => {
  it('assigns a task and returns the updated task', async () => {
    const { body: t } = await createTask();
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'Sunil' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: t.id, assignee: 'Sunil' });
  });

  it('persists the assignee (visible on next GET)', async () => {
    const { body: t } = await createTask();
    await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'Aman' });
    const res = await request(app).get('/tasks');
    const list = Array.isArray(res.body) ? res.body : res.body.tasks || res.body.data;
    expect(list.find((x) => x.id === t.id).assignee).toBe('Aman');
  });

  it('trims whitespace around the name', async () => {
    const { body: t } = await createTask();
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: '  Riya  ' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Riya');
  });

  it('returns 404 when task does not exist', async () => {
    const res = await request(app).patch('/tasks/nope/assign').send({ assignee: 'Sunil' });
    expect(res.status).toBe(404);
  });

  it.each([
    ['empty string', { assignee: '' }],
    ['whitespace only', { assignee: '   ' }],
    ['missing field', {}],
    ['number', { assignee: 123 }],
    ['null', { assignee: null }],
    ['array', { assignee: ['a'] }],
    ['too long (>100 chars)', { assignee: 'x'.repeat(101) }],
  ])('returns 400 for invalid assignee: %s', async (_label, body) => {
    const { body: t } = await createTask();
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it('allows reassigning an already-assigned task (design decision)', async () => {
    const { body: t } = await createTask();
    await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'First' });
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'Second' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Second');
  });

  it('does not modify other fields', async () => {
    const { body: t } = await createTask({ priority: 'high', description: 'keep me' });
    const res = await request(app).patch(`/tasks/${t.id}/assign`).send({ assignee: 'X' });
    expect(res.body).toMatchObject({ title: t.title, priority: 'high', description: 'keep me', status: t.status });
  });
});


