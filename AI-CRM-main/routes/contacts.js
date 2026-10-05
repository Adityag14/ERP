const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, '../data/contacts.json');
const ACTIVITY_FILE = path.join(__dirname, '../data/activities.json');

const readData = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

const readActivities = () => JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf8'));
const writeActivities = (data) => fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(data, null, 2));

const addActivity = (type, message, contactName, icon) => {
  const activities = readActivities();
  activities.unshift({
    id: `a${uuidv4().split('-')[0]}`,
    type,
    message,
    contactName,
    timestamp: new Date().toISOString(),
    icon
  });
  writeActivities(activities.slice(0, 50)); // Keep last 50
};

// GET all contacts
router.get('/', (req, res) => {
  try {
    let contacts = readData();
    const { search, status, tag, sort } = req.query;

    if (search) {
      const s = search.toLowerCase();
      contacts = contacts.filter(c =>
        c.name.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s) ||
        c.company.toLowerCase().includes(s)
      );
    }
    if (status) contacts = contacts.filter(c => c.status === status);
    if (tag) contacts = contacts.filter(c => c.tags && c.tags.includes(tag));
    if (sort === 'leadScore') contacts.sort((a, b) => b.leadScore - a.leadScore);
    if (sort === 'name') contacts.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'newest') contacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: contacts, total: contacts.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single contact
router.get('/:id', (req, res) => {
  try {
    const contacts = readData();
    const contact = contacts.find(c => c.id === req.params.id);
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });
    res.json({ success: true, data: contact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create contact
router.post('/', (req, res) => {
  try {
    const contacts = readData();
    const newContact = {
      id: `c${uuidv4().split('-')[0]}`,
      ...req.body,
      leadScore: req.body.leadScore || 50,
      tags: req.body.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    contacts.unshift(newContact);
    writeData(contacts);
    addActivity('contact_created', `New contact added: ${newContact.name} from ${newContact.company}`, newContact.name, 'user-plus');
    res.status(201).json({ success: true, data: newContact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update contact
router.put('/:id', (req, res) => {
  try {
    const contacts = readData();
    const idx = contacts.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Contact not found' });
    contacts[idx] = { ...contacts[idx], ...req.body, updatedAt: new Date().toISOString() };
    writeData(contacts);
    res.json({ success: true, data: contacts[idx] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE contact
router.delete('/:id', (req, res) => {
  try {
    let contacts = readData();
    const contact = contacts.find(c => c.id === req.params.id);
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });
    contacts = contacts.filter(c => c.id !== req.params.id);
    writeData(contacts);
    addActivity('contact_deleted', `Contact removed: ${contact.name}`, contact.name, 'user-minus');
    res.json({ success: true, message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
