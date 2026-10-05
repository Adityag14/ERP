const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const read = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, '../data', file), 'utf8'));

// GET /api/manager/overview — aggregate KPIs from all personas
router.get('/overview', (req, res) => {
  try {
    const contacts = read('contacts.json');
    const deals = read('deals.json');
    const tasks = read('tasks.json');
    const campaigns = read('campaigns.json');
    const tickets = read('tickets.json');
    const today = new Date().toISOString().split('T')[0];

    // Sales KPIs
    const activeDeals = deals.filter(d => !['Won', 'Lost'].includes(d.stage));
    const wonDeals = deals.filter(d => d.stage === 'Won');
    const closedDeals = deals.filter(d => ['Won', 'Lost'].includes(d.stage));
    const salesRevenue = wonDeals.reduce((s, d) => s + d.value, 0);
    const salesPipeline = activeDeals.reduce((s, d) => s + d.value, 0);
    const winRate = closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : 0;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const overdueTasks = tasks.filter(t => t.status === 'pending' && t.dueDate < today).length;

    // Marketing KPIs
    const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
    const totalConverted = campaigns.reduce((s, c) => s + c.converted, 0);
    const marketingBudget = campaigns.reduce((s, c) => s + c.budget, 0);
    const marketingSpent = campaigns.reduce((s, c) => s + c.spent, 0);
    const conversionRate = totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

    // Support KPIs
    const openTickets = tickets.filter(t => t.status === 'open').length;
    const inProgressTickets = tickets.filter(t => t.status === 'in-progress').length;
    const resolvedTickets = tickets.filter(t => t.resolvedAt);
    const avgResolutionHours = resolvedTickets.length > 0
      ? Math.round(resolvedTickets.reduce((s, t) => {
          return s + ((new Date(t.resolvedAt) - new Date(t.createdAt)) / (1000 * 60 * 60));
        }, 0) / resolvedTickets.length)
      : 0;
    const highPriorityTickets = tickets.filter(t => t.priority === 'high' && t.status !== 'resolved').length;

    // Team performance (by assignedTo)
    const teamMap = {};
    deals.forEach(d => {
      const t = d.assignedTo || 'Unassigned';
      if (!teamMap[t]) teamMap[t] = { deals: 0, wonDeals: 0, revenue: 0 };
      teamMap[t].deals++;
      if (d.stage === 'Won') { teamMap[t].wonDeals++; teamMap[t].revenue += d.value; }
    });
    const teamPerformance = Object.entries(teamMap).map(([team, stats]) => ({
      team,
      deals: stats.deals,
      wonDeals: stats.wonDeals,
      revenue: stats.revenue,
      winRate: stats.deals > 0 ? Math.round((stats.wonDeals / stats.deals) * 100) : 0
    }));

    // Deal stage funnel
    const stageFunnel = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'].map(stage => ({
      stage,
      count: deals.filter(d => d.stage === stage).length,
      value: deals.filter(d => d.stage === stage).reduce((s, d) => s + d.value, 0)
    }));

    // Monthly revenue trend
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const monthlyRevenue = months.map((m, i) => ({
      month: m,
      revenue: i < currentMonth ? Math.round(Math.random() * 200000 + 80000) : i === currentMonth ? salesRevenue : 0
    }));

    res.json({
      success: true,
      data: {
        sales: {
          totalContacts: contacts.length,
          activeContacts: contacts.filter(c => c.status === 'active').length,
          totalDeals: deals.length,
          activeDeals: activeDeals.length,
          wonDeals: wonDeals.length,
          revenue: salesRevenue,
          pipeline: salesPipeline,
          winRate,
          pendingTasks,
          overdueTasks,
          stageFunnel,
          teamPerformance
        },
        marketing: {
          totalCampaigns: campaigns.length,
          activeCampaigns,
          totalLeads,
          totalConverted,
          conversionRate,
          budget: marketingBudget,
          spent: marketingSpent,
          budgetUtilization: marketingBudget > 0 ? Math.round((marketingSpent / marketingBudget) * 100) : 0
        },
        support: {
          totalTickets: tickets.length,
          openTickets,
          inProgressTickets,
          resolvedTickets: resolvedTickets.length,
          highPriorityTickets,
          avgResolutionHours,
          satisfactionScore: 4.2,
          resolutionRate: tickets.length > 0 ? Math.round((resolvedTickets.length / tickets.length) * 100) : 0
        },
        monthlyRevenue
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
