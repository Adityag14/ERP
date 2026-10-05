const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { readCollection } = require('../lib/storage');

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY in your .env file.');
  }
  return new GoogleGenerativeAI(apiKey);
};

const getModel = () => getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' });

// POST: AI Chat Assistant
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message is required' });

    const [contacts, deals] = await Promise.all([readCollection('contacts'), readCollection('deals')]);

    const crmContext = `
You are an AI assistant embedded in a professional CRM system. You help sales teams manage contacts, deals, and tasks effectively.

Current CRM Data Summary:
- Total Contacts: ${contacts.length}
- Active Deals: ${deals.filter(d => !['Won', 'Lost'].includes(d.stage)).length}
- Won Deals: ${deals.filter(d => d.stage === 'Won').length}
- Total Pipeline Value: ₹${deals.filter(d => !['Won','Lost'].includes(d.stage)).reduce((s,d) => s+d.value, 0).toLocaleString()}

${context ? `Additional Context: ${context}` : ''}

User question: ${message}

Provide concise, actionable, and professional advice. Format responses with clear sections when needed.`;

    const model = getModel();
    const result = await model.generateContent(crmContext);
    const response = result.response.text();
    res.json({ success: true, response });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST: Generate Email Draft
router.post('/email-draft', async (req, res) => {
  try {
    const { contactId, purpose, tone } = req.body;
    const contacts = await readCollection('contacts');
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });

    const prompt = `Write a professional sales email for the following:
Contact: ${contact.name}, ${contact.jobTitle} at ${contact.company}
Purpose: ${purpose || 'Follow up on previous conversation'}
Tone: ${tone || 'professional and friendly'}
Lead Score: ${contact.leadScore}/100
Last Note: ${contact.notes || 'No previous notes'}

Generate a compelling, personalized email with:
- Subject line
- Greeting
- Body (2-3 paragraphs)
- Call to action
- Professional sign-off

Format as:
Subject: [subject line]

[email body]`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    res.json({ success: true, email: result.response.text(), contact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST: Lead Scoring & Insights
router.post('/lead-insights', async (req, res) => {
  try {
    const { contactId } = req.body;
    const [contacts, deals] = await Promise.all([readCollection('contacts'), readCollection('deals')]);

    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });

    const contactDeals = deals.filter(d => d.contactId === contactId);

    const prompt = `Analyze this lead and provide actionable insights:

Contact Details:
- Name: ${contact.name}
- Company: ${contact.company}
- Job Title: ${contact.jobTitle}
- Status: ${contact.status}
- Lead Score: ${contact.leadScore}/100
- Source: ${contact.source}
- Tags: ${contact.tags.join(', ')}
- Last Contact: ${contact.lastContact}
- Next Follow-up: ${contact.nextFollowUp}
- Notes: ${contact.notes}

Associated Deals: ${JSON.stringify(contactDeals, null, 2)}

Provide:
1. **Lead Quality Assessment** (3-4 sentences)
2. **Key Opportunities** (bullet points)
3. **Risk Factors** (bullet points)
4. **Recommended Next Actions** (numbered, prioritized)
5. **Suggested Lead Score** (0-100 with reasoning)

Be specific and data-driven.`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    res.json({ success: true, insights: result.response.text(), contact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST: Deal Analysis
router.post('/deal-analysis', async (req, res) => {
  try {
    const { dealId } = req.body;
    const deals = await readCollection('deals');
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return res.status(404).json({ success: false, error: 'Deal not found' });

    const prompt = `Analyze this sales deal and provide strategic recommendations:

Deal Details:
- Title: ${deal.title}
- Company: ${deal.company}
- Value: ₹${deal.value.toLocaleString()}
- Stage: ${deal.stage}
- Probability: ${deal.probability}%
- Expected Close: ${deal.expectedCloseDate}
- Description: ${deal.description}
- Products: ${deal.products.join(', ')}

Provide:
1. **Deal Health Score** (0-10 with explanation)
2. **Win Probability Assessment** (current vs. realistic)
3. **Key Deal Risks** (bullet points)
4. **Strategies to Advance** (numbered recommendations)
5. **Negotiation Tips** (if applicable)

Be concise and actionable.`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    res.json({ success: true, analysis: result.response.text(), deal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST: Smart Summary
router.post('/summary', async (req, res) => {
  try {
    const [contacts, deals] = await Promise.all([readCollection('contacts'), readCollection('deals')]);

    const wonDeals = deals.filter(d => d.stage === 'Won');
    const activeDeals = deals.filter(d => !['Won','Lost'].includes(d.stage));
    const revenue = wonDeals.reduce((s, d) => s + d.value, 0);
    const pipeline = activeDeals.reduce((s, d) => s + d.value, 0);

    const prompt = `Generate a concise executive CRM summary report for today (${new Date().toDateString()}):

Data:
- Total Contacts: ${contacts.length} (${contacts.filter(c=>c.status==='active').length} active)
- Total Deals: ${deals.length} (${wonDeals.length} won, ${deals.filter(d=>d.stage==='Lost').length} lost)
- Revenue Closed: ₹${revenue.toLocaleString()}
- Active Pipeline: ₹${pipeline.toLocaleString()}
- Win Rate: ${deals.filter(d=>['Won','Lost'].includes(d.stage)).length > 0 ? Math.round(wonDeals.length/deals.filter(d=>['Won','Lost'].includes(d.stage)).length*100) : 0}%

Top Active Deals:
${activeDeals.slice(0,3).map(d => `- ${d.title}: ₹${d.value.toLocaleString()} (${d.stage}, ${d.probability}%)`).join('\n')}

High-Value Contacts:
${contacts.filter(c=>c.leadScore>=80).slice(0,3).map(c=>`- ${c.name} at ${c.company} (Score: ${c.leadScore})`).join('\n')}

Generate a 4-5 sentence executive summary with key insights, wins, and immediate priorities. Keep it crisp and business-focused.`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    res.json({ success: true, summary: result.response.text() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
