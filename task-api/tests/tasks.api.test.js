const { request, app, extractList, createTask } = require('./helpers');

describe('POST /tasks', () => {
  it('creates a task with defaults (happy path)', async () => {
    const res = await createTask({ title: 'Write tests', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Write tests', priority: 'high' });
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.createdAt).toEqual(expect.any(String));
    expect(res.body.completedAt).toBeNull();
  });

  it('rejects missing title', async () => {
    const res = await request(app).post('/tasks').send({ priority: 'low' });
    expect(res.status).toBe(400);
  });

  it('rejects empty / whitespace-only title', async () => {
    const res = await createTask({ title: '   ' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid priority', async () => {
    const res = await createTask({ priority: 'urgent-ish' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid status', async () => {
    const res = await createTask({ status: 'banana' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid dueDate', async () => {
    const res = await createTask({ dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });
});

describe('GET /tasks', () => {
  it('returns a list containing created tasks', async () => {
    const created = await createTask({ title: 'list-me' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(extractList(res.body).map((t) => t.id)).toContain(created.body.id);
  });

  it('filters by status (exact match, no partial matches)', async () => {
    const a = await createTask({ title: 'filter-a' });
    const defaultStatus = a.body.status;
    const res = await request(app).get(`/tasks?status=${defaultStatus}`);
    expect(res.status).toBe(200);
    const list = extractList(res.body);
    expect(list.length).toBeGreaterThan(0);
    list.forEach((t) => expect(t.status).toBe(defaultStatus));
  });

  it('returns empty list / 400 for unknown status instead of crashing', async () => {
    const res = await request(app).get('/tasks?status=does-not-exist');
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) expect(extractList(res.body)).toHaveLength(0);
  });

  describe('pagination', () => {
    beforeAll(async () => {
      for (let i = 0; i < 5; i++) await createTask({ title: `page-${i}` });
    });

    it('page 1 starts at the very first item', async () => {
      const all = extractList((await request(app).get('/tasks')).body);
      const p1 = extractList((await request(app).get('/tasks?page=1&limit=2')).body);
      expect(p1).toHaveLength(2);
      expect(p1[0].id).toBe(all[0].id); // offset bug yahan pakda jayega
    });

    it('page 2 does not overlap page 1', async () => {
      const p1 = extractList((await request(app).get('/tasks?page=1&limit=2')).body);
      const p2 = extractList((await request(app).get('/tasks?page=2&limit=2')).body);
      const ids1 = p1.map((t) => t.id);
      p2.forEach((t) => expect(ids1).not.toContain(t.id));
    });

    it('page beyond range returns empty list', async () => {
      const res = await request(app).get('/tasks?page=9999&limit=10');
      expect(res.status).toBe(200);
      expect(extractList(res.body)).toHaveLength(0);
    });

    it('handles invalid page/limit gracefully', async () => {
      const res = await request(app).get('/tasks?page=-1&limit=abc');
      expect([200, 400]).toContain(res.status);
    });
  });
});

describe('PUT /tasks/:id', () => {
  it('fully updates a task', async () => {
    const { body: t } = await createTask({ title: 'old' });
    const res = await request(app)
      .put(`/tasks/${t.id}`)
      .send({ title: 'new title', description: 'updated', priority: 'low' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: t.id, title: 'new title', priority: 'low' });
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).put('/tasks/unknown-id').send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid payload', async () => {
    const { body: t } = await createTask();
    const res = await request(app).put(`/tasks/${t.id}`).send({ title: '' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  it('deletes a task and returns 204', async () => {
    const { body: t } = await createTask();
    const res = await request(app).delete(`/tasks/${t.id}`);
    expect(res.status).toBe(204);
    const list = extractList((await request(app).get('/tasks')).body);
    expect(list.map((x) => x.id)).not.toContain(t.id);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/tasks/unknown-id');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  it('marks task complete and sets completedAt', async () => {
    const { body: t } = await createTask({ priority: 'high' });
    const res = await request(app).patch(`/tasks/${t.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.completedAt).toEqual(expect.any(String));
    expect(res.body.status).not.toBe(t.status);
  });

  it('does not change priority when completing', async () => {
    const { body: t } = await createTask({ priority: 'high' });
    const res = await request(app).patch(`/tasks/${t.id}/complete`);
    expect(res.body.priority).toBe('high'); // priority reset bug check
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).patch('/tasks/unknown-id/complete');
    expect(res.status).toBe(404);
  });
});

describe('GET /tasks/stats', () => {
  it('returns counts by status and overdue count', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ overdue: expect.any(Number) }));
  });

  it('counts a past-due open task as overdue', async () => {
    const before = (await request(app).get('/tasks/stats')).body.overdue;
    await createTask({ dueDate: '2000-01-01T00:00:00.000Z' });
    const after = (await request(app).get('/tasks/stats')).body.overdue;
    expect(after).toBe(before + 1);
  });

  it('does NOT count a completed past-due task as overdue', async () => {
    const { body: t } = await createTask({ dueDate: '2000-01-01T00:00:00.000Z' });
    await request(app).patch(`/tasks/${t.id}/complete`);
    const stats = (await request(app).get('/tasks/stats')).body;
    const before = stats.overdue;
    // ek aur completed past-due task add karo: overdue change nahi hona chahiye
    const { body: t2 } = await createTask({ dueDate: '2000-01-01T00:00:00.000Z' });
    await request(app).patch(`/tasks/${t2.id}/complete`);
    const after = (await request(app).get('/tasks/stats')).body.overdue;
    expect(after).toBe(before);
  });
});
