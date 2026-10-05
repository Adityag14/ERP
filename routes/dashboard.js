const express = require('express');
const router = express.Router();
const { readCollection } = require('../lib/storage');

// GET dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [contacts, deals, tasks] = await Promise.all([
      readCollection('contacts'),
      readCollection('deals'),
      readCollection('tasks'),
    ]);
    const today = new Date().toISOString().split('T')[0];

    const activeDeals = deals.filter(d => !['Won', 'Lost'].includes(d.stage));
    const wonDeals = deals.filter(d => d.stage === 'Won');
    const revenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const pipeline = activeDeals.reduce((sum, d) => sum + d.value, 0);
    const overdueTasks = tasks.filter(t => t.status === 'pending' && t.dueDate < today);
    const todayTasks = tasks.filter(t => t.status === 'pending' && t.dueDate === today);

    // Win rate
    const closedDeals = deals.filter(d => ['Won', 'Lost'].includes(d.stage));
    const winRate = closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : 0;

    // Avg deal size
    const avgDealSize = wonDeals.length > 0 ? Math.round(revenue / wonDeals.length) : 0;

    // Lead score distribution
    const highLeads = contacts.filter(c => c.leadScore >= 80).length;
    const medLeads = contacts.filter(c => c.leadScore >= 50 && c.leadScore < 80).length;
    const lowLeads = contacts.filter(c => c.leadScore < 50).length;

    // Deal stage counts for chart
    const stageData = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'].map(stage => ({
      stage,
      count: deals.filter(d => d.stage === stage).length,
      value: deals.filter(d => d.stage === stage).reduce((sum, d) => sum + d.value, 0)
    }));

    // Monthly revenue (mock based on won deals)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const monthlyRevenue = months.map((m, i) => ({
      month: m,
      revenue: i <= currentMonth ? Math.round(Math.random() * 200000 + 50000) : 0
    }));
    // Set current month from actual won deals
    monthlyRevenue[currentMonth].revenue = revenue;

    res.json({
      success: true,
      data: {
        totalContacts: contacts.length,
        activeContacts: contacts.filter(c => c.status === 'active').length,
        totalDeals: deals.length,
        activeDeals: activeDeals.length,
        wonDeals: wonDeals.length,
        revenue,
        pipeline,
        winRate,
        avgDealSize,
        pendingTasks: tasks.filter(t => t.status === 'pending').length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        overdueTasks: overdueTasks.length,
        todayTasks: todayTasks.length,
        highLeads,
        medLeads,
        lowLeads,
        stageData,
        monthlyRevenue
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
