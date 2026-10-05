const express = require('express');
const router = express.Router();
const { readCollection } = require('../lib/storage');

router.get('/', async (req, res) => {
  try {
    const activities = await readCollection('activities');
    const limit = parseInt(req.query.limit) || 20;
    res.json({ success: true, data: activities.slice(0, limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
