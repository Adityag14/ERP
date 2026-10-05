const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ACTIVITY_FILE = path.join(__dirname, '../data/activities.json');
const readData = () => JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf8'));

router.get('/', (req, res) => {
  try {
    const activities = readData();
    const limit = parseInt(req.query.limit) || 20;
    res.json({ success: true, data: activities.slice(0, limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
