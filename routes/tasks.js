const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { readCollection, writeCollection } = require('../lib/storage');

const addActivity = async (type, message, contactName, icon) => {
  const activities = await readCollection('activities');
  activities.unshift({ id: `a${uuidv4().split('-')[0]}`, type, message, contactName, timestamp: new Date().toISOString(), icon });
  await writeCollection('activities', activities.slice(0, 50));
};

// GET all tasks
router.get('/', async (req, res) => {
  try {
    let tasks = await readCollection('tasks');
    const { status, priority, contactId, sort } = req.query;
    if (status) tasks = tasks.filter(t => t.status === status);
    if (priority) tasks = tasks.filter(t => t.priority === priority);
    if (contactId) tasks = tasks.filter(t => t.contactId === contactId);

    // Sort by due date by default
    tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    if (sort === 'priority') {
      const p = { high: 0, medium: 1, low: 2 };
      tasks.sort((a, b) => p[a.priority] - p[b.priority]);
    }

    res.json({ success: true, data: tasks, total: tasks.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET overdue tasks
router.get('/overdue', async (req, res) => {
  try {
    const tasks = await readCollection('tasks');
    const today = new Date().toISOString().split('T')[0];
    const overdue = tasks.filter(t => t.status === 'pending' && t.dueDate < today);
    res.json({ success: true, data: overdue, total: overdue.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single task
router.get('/:id', async (req, res) => {
  try {
    const tasks = await readCollection('tasks');
    const task = tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create task
router.post('/', async (req, res) => {
  try {
    const tasks = await readCollection('tasks');
    const newTask = {
      id: `t${uuidv4().split('-')[0]}`,
      ...req.body,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    tasks.unshift(newTask);
    await writeCollection('tasks', tasks);
    res.status(201).json({ success: true, data: newTask });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update task
router.put('/:id', async (req, res) => {
  try {
    const tasks = await readCollection('tasks');
    const idx = tasks.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Task not found' });

    const wasCompleted = tasks[idx].status !== 'completed' && req.body.status === 'completed';
    tasks[idx] = { ...tasks[idx], ...req.body, updatedAt: new Date().toISOString() };
    await writeCollection('tasks', tasks);

    if (wasCompleted) {
      await addActivity('task_completed', `Task '${tasks[idx].title}' completed`, tasks[idx].contactName, 'check-circle');
    }
    res.json({ success: true, data: tasks[idx] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE task
router.delete('/:id', async (req, res) => {
  try {
    let tasks = await readCollection('tasks');
    if (!tasks.find(t => t.id === req.params.id)) return res.status(404).json({ success: false, error: 'Task not found' });
    tasks = tasks.filter(t => t.id !== req.params.id);
    await writeCollection('tasks', tasks);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
