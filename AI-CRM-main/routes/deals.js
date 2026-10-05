const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, '../data/deals.json');
const ACTIVITY_FILE = path.join(__dirname, '../data/activities.json');

const readData = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
const readActivities = () => JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf8'));
const writeActivities = (data) => fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(data, null, 2));

const addActivity = (type, message, contactName, icon) => {
  const activities = readActivities();
  activities.unshift({ id: `a${uuidv4().split('-')[0]}`, type, message, contactName, timestamp: new Date().toISOString(), icon });
  writeActivities(activities.slice(0, 50));
};

const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];

// GET all deals
router.get('/', (req, res) => {
  try {
    let deals = readData();
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
router.get('/pipeline', (req, res) => {
  try {
    const deals = readData();
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
router.get('/:id', (req, res) => {
  try {
    const deals = readData();
    const deal = deals.find(d => d.id === req.params.id);
    if (!deal) return res.status(404).json({ success: false, error: 'Deal not found' });
    res.json({ success: true, data: deal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create deal
router.post('/', (req, res) => {
  try {
    const deals = readData();
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
    writeData(deals);
    addActivity('deal_created', `New deal created: ${newDeal.title} — ₹${newDeal.value.toLocaleString()}`, newDeal.contactName, 'briefcase');
    res.status(201).json({ success: true, data: newDeal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update deal (also handles stage changes)
router.put('/:id', (req, res) => {
  try {
    const deals = readData();
    const idx = deals.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Deal not found' });

    const oldStage = deals[idx].stage;
    deals[idx] = { ...deals[idx], ...req.body, updatedAt: new Date().toISOString() };
    writeData(deals);

    if (req.body.stage && req.body.stage !== oldStage) {
      if (req.body.stage === 'Won') {
        addActivity('deal_won', `Deal '${deals[idx].title}' marked as Won — ₹${deals[idx].value.toLocaleString()}`, deals[idx].contactName, 'trophy');
      } else if (req.body.stage === 'Lost') {
        addActivity('deal_lost', `Deal '${deals[idx].title}' marked as Lost`, deals[idx].contactName, 'x-circle');
      } else {
        addActivity('deal_stage_changed', `Deal '${deals[idx].title}' moved to ${req.body.stage}`, deals[idx].contactName, 'trending-up');
      }
    }
    res.json({ success: true, data: deals[idx] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE deal
router.delete('/:id', (req, res) => {
  try {
    let deals = readData();
    const deal = deals.find(d => d.id === req.params.id);
    if (!deal) return res.status(404).json({ success: false, error: 'Deal not found' });
    deals = deals.filter(d => d.id !== req.params.id);
    writeData(deals);
    res.json({ success: true, message: 'Deal deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
