const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { readCollection, writeCollection } = require('../lib/storage');

// GET all tickets
router.get('/', async (req, res) => {
  try {
    let tickets = await readCollection('tickets');
    if (req.query.status) tickets = tickets.filter(t => t.status === req.query.status);
    if (req.query.priority) tickets = tickets.filter(t => t.priority === req.query.priority);
    // Sort by createdAt desc
    tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, data: tickets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET ticket stats
router.get('/stats', async (req, res) => {
  try {
    const tickets = await readCollection('tickets');
    const open = tickets.filter(t => t.status === 'open').length;
    const inProgress = tickets.filter(t => t.status === 'in-progress').length;
    const resolved = tickets.filter(t => t.status === 'resolved').length;
    const highPriority = tickets.filter(t => t.priority === 'high').length;
    const noFirstResponse = tickets.filter(t => !t.firstResponseAt && t.status !== 'resolved').length;

    // Avg resolution time (hours) for resolved tickets
    const resolvedTickets = tickets.filter(t => t.resolvedAt);
    const avgResolutionHours = resolvedTickets.length > 0
      ? Math.round(resolvedTickets.reduce((s, t) => {
          const created = new Date(t.createdAt);
          const resolved = new Date(t.resolvedAt);
          return s + ((resolved - created) / (1000 * 60 * 60));
        }, 0) / resolvedTickets.length)
      : 0;

    // By category
    const byCategory = {};
    tickets.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalTickets: tickets.length,
        open,
        inProgress,
        resolved,
        highPriority,
        noFirstResponse,
        avgResolutionHours,
        satisfactionScore: 4.2,
        byCategory
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single ticket
router.get('/:id', async (req, res) => {
  try {
    const tickets = await readCollection('tickets');
    const t = tickets.find(x => x.id === req.params.id);
    if (!t) return res.status(404).json({ success: false, error: 'Ticket not found' });
    res.json({ success: true, data: t });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create ticket
router.post('/', async (req, res) => {
  try {
    const tickets = await readCollection('tickets');
    const num = 1001 + tickets.length;
    const ticket = {
      id: 'tkt' + uuidv4().split('-')[0],
      ticketNumber: `TKT-${num}`,
      ...req.body,
      firstResponseAt: null,
      resolvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    tickets.push(ticket);
    await writeCollection('tickets', tickets);
    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update ticket
router.put('/:id', async (req, res) => {
  try {
    const tickets = await readCollection('tickets');
    const idx = tickets.findIndex(x => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Ticket not found' });
    // Auto-set resolvedAt when status changes to resolved
    const update = { ...req.body };
    if (update.status === 'resolved' && !tickets[idx].resolvedAt) {
      update.resolvedAt = new Date().toISOString();
    }
    tickets[idx] = { ...tickets[idx], ...update, updatedAt: new Date().toISOString() };
    await writeCollection('tickets', tickets);
    res.json({ success: true, data: tickets[idx] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE ticket
router.delete('/:id', async (req, res) => {
  try {
    let tickets = await readCollection('tickets');
    tickets = tickets.filter(x => x.id !== req.params.id);
    await writeCollection('tickets', tickets);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
