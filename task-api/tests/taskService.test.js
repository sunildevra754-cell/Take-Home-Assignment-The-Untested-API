

describe('taskService', () => {
  let service;

  beforeEach(() => {
    jest.resetModules();
    service = require('../src/services/taskService');
  });

  describe('create', () => {
    it('creates a task with default values', () => {
      const task = service.create({ title: 'Write tests' });

      expect(task).toMatchObject({
        title: 'Write tests',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: null,
        completedAt: null,
      });
      expect(task.id).toEqual(expect.any(String));
      expect(new Date(task.createdAt).toString()).not.toBe('Invalid Date');
    });

    it('uses the values that are passed in', () => {
      const task = service.create({
        title: 'Ship',
        description: 'release',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2030-01-01T00:00:00.000Z',
      });

      expect(task).toMatchObject({
        description: 'release',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2030-01-01T00:00:00.000Z',
      });
    });

    it('gives every task a different id', () => {
      const a = service.create({ title: 'A' });
      const b = service.create({ title: 'B' });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('getAll', () => {
    it('returns an empty list when there are no tasks', () => {
      expect(service.getAll()).toEqual([]);
    });

    it('returns all created tasks', () => {
      service.create({ title: 'A' });
      service.create({ title: 'B' });
      expect(service.getAll().map((t) => t.title)).toEqual(['A', 'B']);
    });

    it('returns a copy, so changing the list does not change the store', () => {
      service.create({ title: 'A' });
      const list = service.getAll();
      list.pop();
      expect(service.getAll()).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('finds an existing task', () => {
      const task = service.create({ title: 'A' });
      expect(service.findById(task.id)).toEqual(task);
    });

    it('returns undefined for an unknown id', () => {
      expect(service.findById('nope')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    beforeEach(() => {
      service.create({ title: 'A', status: 'todo' });
      service.create({ title: 'B', status: 'in_progress' });
      service.create({ title: 'C', status: 'done' });
    });

    it('returns only tasks with that exact status', () => {
      const result = service.getByStatus('todo');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('A');
    });

    it('does not match partial status text', () => {
      expect(service.getByStatus('do')).toEqual([]);
      expect(service.getByStatus('progress')).toEqual([]);
    });

    it('returns an empty list for an unknown status', () => {
      expect(service.getByStatus('banana')).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) service.create({ title: `T${i}` });
    });

    it('page 1 starts at the first task', () => {
      const titles = service.getPaginated(1, 2).map((t) => t.title);
      expect(titles).toEqual(['T1', 'T2']);
    });

    it('page 2 continues after page 1', () => {
      const titles = service.getPaginated(2, 2).map((t) => t.title);
      expect(titles).toEqual(['T3', 'T4']);
    });

    it('last page can have fewer items than the limit', () => {
      const titles = service.getPaginated(3, 2).map((t) => t.title);
      expect(titles).toEqual(['T5']);
    });

    it('returns an empty list for a page past the end', () => {
      expect(service.getPaginated(10, 2)).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('returns zero counts when there are no tasks', () => {
      expect(service.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    it('counts tasks by status', () => {
      service.create({ title: 'A', status: 'todo' });
      service.create({ title: 'B', status: 'todo' });
      service.create({ title: 'C', status: 'in_progress' });
      service.create({ title: 'D', status: 'done' });

      expect(service.getStats()).toMatchObject({ todo: 2, in_progress: 1, done: 1 });
    });

    it('counts open tasks with a past due date as overdue', () => {
      service.create({ title: 'late', dueDate: '2000-01-01T00:00:00.000Z' });
      service.create({ title: 'future', dueDate: '2999-01-01T00:00:00.000Z' });
      service.create({ title: 'no date' });

      expect(service.getStats().overdue).toBe(1);
    });

    it('does not count done tasks as overdue', () => {
      service.create({ title: 'old done', status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });
      expect(service.getStats().overdue).toBe(0);
    });
  });

  describe('update', () => {
    it('changes only the given fields', () => {
      const task = service.create({ title: 'Old', priority: 'low' });
      const updated = service.update(task.id, { title: 'New' });

      expect(updated).toMatchObject({ id: task.id, title: 'New', priority: 'low' });
      expect(service.findById(task.id).title).toBe('New');
    });

    it('returns null for an unknown id', () => {
      expect(service.update('nope', { title: 'x' })).toBeNull();
    });
  });

  describe('remove', () => {
    it('removes an existing task and returns true', () => {
      const task = service.create({ title: 'A' });
      expect(service.remove(task.id)).toBe(true);
      expect(service.getAll()).toHaveLength(0);
    });

    it('returns false for an unknown id', () => {
      expect(service.remove('nope')).toBe(false);
    });
  });

  describe('completeTask', () => {
    it('sets status to done and sets completedAt', () => {
      const task = service.create({ title: 'A' });
      const done = service.completeTask(task.id);

      expect(done.status).toBe('done');
      expect(new Date(done.completedAt).toString()).not.toBe('Invalid Date');
      expect(service.findById(task.id).status).toBe('done');
    });

    it('keeps the priority and other fields unchanged', () => {
      const task = service.create({ title: 'A', priority: 'high', description: 'keep' });
      const done = service.completeTask(task.id);

      expect(done).toMatchObject({ priority: 'high', description: 'keep', title: 'A' });
    });

    it('returns null for an unknown id', () => {
      expect(service.completeTask('nope')).toBeNull();
    });
  });

  describe('assignTask', () => {
    it('stores the assignee on the task', () => {
      const task = service.create({ title: 'A' });
      const assigned = service.assignTask(task.id, 'Sunil');

      expect(assigned.assignee).toBe('Sunil');
      expect(service.findById(task.id).assignee).toBe('Sunil');
    });

    it('trims spaces around the name', () => {
      const task = service.create({ title: 'A' });
      expect(service.assignTask(task.id, '  Riya  ').assignee).toBe('Riya');
    });

    it('can re-assign a task that already has an assignee', () => {
      const task = service.create({ title: 'A' });
      service.assignTask(task.id, 'First');
      expect(service.assignTask(task.id, 'Second').assignee).toBe('Second');
    });

    it('does not change other fields', () => {
      const task = service.create({ title: 'A', priority: 'high' });
      const assigned = service.assignTask(task.id, 'X');
      expect(assigned).toMatchObject({ title: 'A', priority: 'high', status: 'todo' });
    });

    it('returns null for an unknown id', () => {
      expect(service.assignTask('nope', 'X')).toBeNull();
    });
  });
});