const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const FILE = path.join(__dirname, '../data/campaigns.json');
const read = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));
const write = (data) => fs.writeFileSync(FILE, JSON.stringify(data, null, 2));

// GET all campaigns
router.get('/', (req, res) => {
  try {
    let campaigns = read();
    if (req.query.status) campaigns = campaigns.filter(c => c.status === req.query.status);
    res.json({ success: true, data: campaigns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET campaign stats
router.get('/stats', (req, res) => {
  try {
    const campaigns = read();
    const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
    const totalConverted = campaigns.reduce((s, c) => s + c.converted, 0);
    const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
    const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
    const conversionRate = totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const avgOpenRate = campaigns.filter(c => c.leads > 0).reduce((s, c) => s + Math.round((c.opened / c.leads) * 100), 0) / (campaigns.filter(c => c.leads > 0).length || 1);
    const avgClickRate = campaigns.filter(c => c.opened > 0).reduce((s, c) => s + Math.round((c.clicked / c.opened) * 100), 0) / (campaigns.filter(c => c.opened > 0).length || 1);
    res.json({
      success: true,
      data: {
        totalCampaigns: campaigns.length,
        activeCampaigns,
        totalLeads,
        totalConverted,
        conversionRate,
        totalBudget,
        totalSpent,
        budgetUtilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
        avgOpenRate: Math.round(avgOpenRate),
        avgClickRate: Math.round(avgClickRate)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single campaign
router.get('/:id', (req, res) => {
  try {
    const campaigns = read();
    const c = campaigns.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ success: false, error: 'Campaign not found' });
    res.json({ success: true, data: c });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create campaign
router.post('/', (req, res) => {
  try {
    const campaigns = read();
    const campaign = {
      id: 'camp' + uuidv4().split('-')[0],
      ...req.body,
      leads: 0, opened: 0, clicked: 0, converted: 0, spent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    campaigns.push(campaign);
    write(campaigns);
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update campaign
router.put('/:id', (req, res) => {
  try {
    const campaigns = read();
    const idx = campaigns.findIndex(x => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Campaign not found' });
    campaigns[idx] = { ...campaigns[idx], ...req.body, updatedAt: new Date().toISOString() };
    write(campaigns);
    res.json({ success: true, data: campaigns[idx] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE campaign
router.delete('/:id', (req, res) => {
  try {
    let campaigns = read();
    campaigns = campaigns.filter(x => x.id !== req.params.id);
    write(campaigns);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
