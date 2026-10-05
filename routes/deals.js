const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { readCollection, writeCollection } = require('../lib/storage');

const addActivity = async (type, message, contactName, icon) => {
  const activities = await readCollection('activities');
  activities.unshift({ id: `a${uuidv4().split('-')[0]}`, type, message, contactName, timestamp: new Date().toISOString(), icon });
  await writeCollection('activities', activities.slice(0, 50));
};

const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];

// GET all deals
router.get('/', async (req, res) => {
  try {
    let deals = await readCollection('deals');
    const { stage, search, sort } = req.query;
    if (stage) deals = deals.filter(d => d.stage === stage);
    if (search) {
      const s = search.toLowerCase();
      deals = deals.filter(d => d.title.toLowerCase().includes(s) || d.company.toLowerCase().includes(s));
    }
    if (sort === 'value') deals.sort((a, b) => b.value - a.value);
    if (sort === 'probability') deals.sort((a, b) => b.probability - a.probability);
    res.json({ success: true, data: deals, total: deals.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET pipeline grouped by stage
router.get('/pipeline', async (req, res) => {
  try {
    const deals = await readCollection('deals');
    const pipeline = {};
    STAGES.forEach(stage => {
      const stageDeals = deals.filter(d => d.stage === stage);
      pipeline[stage] = {
        deals: stageDeals,
        count: stageDeals.length,
        totalValue: stageDeals.reduce((sum, d) => sum + d.value, 0)
      };
    });
    res.json({ success: true, data: pipeline, stages: STAGES });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single deal
router.get('/:id', async (req, res) => {
  try {
    const deals = await readCollection('deals');
    const deal = deals.find(d => d.id === req.params.id);
    if (!deal) return res.status(404).json({ success: false, error: 'Deal not found' });
    res.json({ success: true, data: deal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create deal
router.post('/', async (req, res) => {
  try {
    const deals = await readCollection('deals');
    const newDeal = {
      id: `d${uuidv4().split('-')[0]}`,
      ...req.body,
      stage: req.body.stage || 'Lead',
      probability: req.body.probability || 10,
      currency: 'INR',
      lostReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    deals.unshift(newDeal);
    await writeCollection('deals', deals);
    await addActivity('deal_created', `New deal created: ${newDeal.title} — ₹${newDeal.value.toLocaleString()}`, newDeal.contactName, 'briefcase');
    res.status(201).json({ success: true, data: newDeal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update deal (also handles stage changes)
router.put('/:id', async (req, res) => {
  try {
    const deals = await readCollection('deals');
    const idx = deals.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Deal not found' });

    const oldStage = deals[idx].stage;
    deals[idx] = { ...deals[idx], ...req.body, updatedAt: new Date().toISOString() };
    await writeCollection('deals', deals);

    if (req.body.stage && req.body.stage !== oldStage) {
      if (req.body.stage === 'Won') {
        await addActivity('deal_won', `Deal '${deals[idx].title}' marked as Won — ₹${deals[idx].value.toLocaleString()}`, deals[idx].contactName, 'trophy');
      } else if (req.body.stage === 'Lost') {
        await addActivity('deal_lost', `Deal '${deals[idx].title}' marked as Lost`, deals[idx].contactName, 'x-circle');
      } else {
        await addActivity('deal_stage_changed', `Deal '${deals[idx].title}' moved to ${req.body.stage}`, deals[idx].contactName, 'trending-up');
      }
    }
    res.json({ success: true, data: deals[idx] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE deal
router.delete('/:id', async (req, res) => {
  try {
    let deals = await readCollection('deals');
    const deal = deals.find(d => d.id === req.params.id);
    if (!deal) return res.status(404).json({ success: false, error: 'Deal not found' });
    deals = deals.filter(d => d.id !== req.params.id);
    await writeCollection('deals', deals);
    res.json({ success: true, message: 'Deal deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
