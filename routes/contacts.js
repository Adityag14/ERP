const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { readCollection, writeCollection } = require('../lib/storage');

const addActivity = async (type, message, contactName, icon) => {
  const activities = await readCollection('activities');
  activities.unshift({
    id: `a${uuidv4().split('-')[0]}`,
    type,
    message,
    contactName,
    timestamp: new Date().toISOString(),
    icon
  });
  await writeCollection('activities', activities.slice(0, 50));
};

// GET all contacts
router.get('/', async (req, res) => {
  try {
    let contacts = await readCollection('contacts');
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
router.get('/:id', async (req, res) => {
  try {
    const contacts = await readCollection('contacts');
    const contact = contacts.find(c => c.id === req.params.id);
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });
    res.json({ success: true, data: contact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create contact
router.post('/', async (req, res) => {
  try {
    const contacts = await readCollection('contacts');
    const newContact = {
      id: `c${uuidv4().split('-')[0]}`,
      ...req.body,
      leadScore: req.body.leadScore || 50,
      tags: req.body.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    contacts.unshift(newContact);
    await writeCollection('contacts', contacts);
    await addActivity('contact_created', `New contact added: ${newContact.name} from ${newContact.company}`, newContact.name, 'user-plus');
    res.status(201).json({ success: true, data: newContact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update contact
router.put('/:id', async (req, res) => {
  try {
    const contacts = await readCollection('contacts');
    const idx = contacts.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Contact not found' });
    contacts[idx] = { ...contacts[idx], ...req.body, updatedAt: new Date().toISOString() };
    await writeCollection('contacts', contacts);
    res.json({ success: true, data: contacts[idx] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE contact
router.delete('/:id', async (req, res) => {
  try {
    let contacts = await readCollection('contacts');
    const contact = contacts.find(c => c.id === req.params.id);
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });
    contacts = contacts.filter(c => c.id !== req.params.id);
    await writeCollection('contacts', contacts);
    await addActivity('contact_deleted', `Contact removed: ${contact.name}`, contact.name, 'user-minus');
    res.json({ success: true, message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
