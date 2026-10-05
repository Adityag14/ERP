/* ============================================================
   CRM Pro — Main Application JavaScript
   Senior Professional Implementation
============================================================ */

'use strict';

// ── State ────────────────────────────────────────────────
const State = {
  currentPage: 'dashboard',
  persona: 'sales',
  contacts: [],
  deals: [],
  tasks: [],
  dashboardStats: null,
  charts: {},
};

// ── API Layer ────────────────────────────────────────────
const API = {
  base: '/api',

  async get(endpoint) {
    const res = await fetch(`${this.base}${endpoint}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  async post(endpoint, data) {
    const res = await fetch(`${this.base}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  async put(endpoint, data) {
    const res = await fetch(`${this.base}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  async delete(endpoint) {
    const res = await fetch(`${this.base}${endpoint}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },
};

// ── Navigation ───────────────────────────────────────────
function navigateTo(page) {
  if (State.persona !== 'sales' && page !== 'ai' && page !== 'dashboard') {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    document.getElementById('page-persona-data').classList.add('active');
    document.getElementById('page-title').textContent = personaPages[State.persona].pages[page];
    document.getElementById('add-btn').style.display = 'none';
    State.currentPage = page;
    loadPersonaPage(page);
    return;
  }

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navItem = document.querySelector(`[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  // Update pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  document.getElementById('add-btn').style.display = State.persona === 'sales' ? '' : 'none';
  if (State.persona !== 'sales') {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    if (page === 'dashboard') {
      document.getElementById('page-title').textContent = personaPages[State.persona].pages.dashboard;
      document.getElementById('add-btn').style.display = 'none';
      loadPersonaDashboard();
      State.currentPage = page;
      return;
    }
  }

  // Update header title
  const titles = { dashboard: 'Dashboard', contacts: 'Contacts', deals: 'Pipeline', tasks: 'Tasks', ai: 'AI Assistant' };
  document.getElementById('page-title').textContent = titles[page] || page;

  // Update add button label
  const addLabels = { contacts: 'Add Contact', deals: 'Add Deal', tasks: 'Add Task', dashboard: 'Quick Add', ai: 'AI Tools' };
  document.getElementById('add-btn').lastChild.textContent = addLabels[page] || 'Add New';

  State.currentPage = page;

  // Load page data
  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'contacts': loadContacts(); break;
    case 'deals': loadPipeline(); break;
    case 'tasks': loadTasks(); break;
    case 'ai': loadAIPage(); break;
  }
}

const personaPages = {
    marketing: {
      pages: { dashboard: 'Marketing Dashboard', campaigns: 'Campaign Performance', leads: 'Marketing Leads', ai: 'AI Assistant' },
      nav: [['dashboard', '📊', 'Overview'], ['campaigns', '📣', 'Campaigns'], ['leads', '🎯', 'Leads'], ['ai', '🤖', 'AI Assistant']],
    },
    support: {
      pages: { dashboard: 'Support Dashboard', tickets: 'Support Tickets', customers: 'Customers', ai: 'AI Assistant' },
      nav: [['dashboard', '📊', 'Overview'], ['tickets', '🎫', 'Tickets'], ['customers', '👥', 'Customers'], ['ai', '🤖', 'AI Assistant']],
    },
    manager: {
      pages: { dashboard: 'Executive Overview', sales: 'Sales Performance', marketing: 'Marketing Performance', support: 'Support Performance', teams: 'Team Performance', ai: 'AI Assistant' },
      nav: [['dashboard', '📊', 'Overview'], ['sales', '💼', 'Sales'], ['marketing', '📣', 'Marketing'], ['support', '🎧', 'Support'], ['teams', '👥', 'Teams'], ['ai', '🤖', 'AI Assistant']],
    },
  };

  function renderPersonaNavigation(config) {
    const nav = document.querySelector('.sidebar-nav');
    nav.innerHTML = `<span class="nav-section-label">Workspace</span>${config.nav.map(([page, icon, label]) =>
      `<div class="nav-item${page === 'dashboard' ? ' active' : ''}" data-page="${page}" role="button" tabindex="0" onclick="navigateTo('${page}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();navigateTo('${page}')}"><span aria-hidden="true">${icon}</span>${label}</div>`
    ).join('')}`;
  }

  function personaStat(label, value, detail, icon) {
    return `<div class="stat-card"><div class="stat-header"><div class="stat-icon purple">${icon}</div></div><div class="stat-value">${value}</div><div class="stat-label">${label}</div>${detail ? `<div class="persona-stat-detail">${detail}</div>` : ''}</div>`;
  }

  function personaTable(headers, rows) {
    return `<div class="table-wrap"><div class="persona-table-scroll"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td colspan="${headers.length}"><div class="empty-state"><div class="empty-text">No records to display</div></div></td></tr>`}</tbody></table></div></div>`;
  }

  function personaSection(title, description, content) {
    return `<div class="section-header"><div><div class="section-title">${title}</div><div class="section-sub">${description}</div></div></div>${content}`;
  }

  function renderPersonaDashboardShell(title, subtitle, stats, chartPanels, tableContent) {
    document.getElementById('page-dashboard').innerHTML = `
      <div class="persona-welcome"><div><div class="section-title">${title}</div><div class="section-sub">${subtitle}</div></div></div>
      <div class="stats-grid persona-stats">${stats.join('')}</div>
      <div class="dashboard-grid persona-charts">${chartPanels.map(panel => `<div class="chart-card"><div class="chart-header"><span class="chart-title">${panel.title}</span></div><div class="chart-container"><canvas id="${panel.id}"></canvas></div></div>`).join('')}</div>
      ${tableContent ? `<div class="persona-table-section">${tableContent}</div>` : ''}
    `;
  }

  function renderPersonaChart(id, type, labels, datasets, options = {}) {
    if (State.charts[id]) State.charts[id].destroy();
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const theme = getChartTheme();
    State.charts[id] = new Chart(canvas.getContext('2d'), {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: theme.label, font: { family: 'Inter', size: 11 } } } },
        scales: type === 'doughnut' ? undefined : {
          x: { grid: { color: theme.grid }, ticks: { color: theme.label } },
          y: { beginAtZero: true, grid: { color: theme.grid }, ticks: { color: theme.label } },
        },
        ...options,
      },
    });
  }

  async function loadPersonaDashboard() {
    document.getElementById('page-dashboard').innerHTML = '<div class="ai-loading"><div class="spinner"></div> Loading workspace dashboard…</div>';
    try {
      if (State.persona === 'marketing') {
        const [statsResponse, campaignsResponse] = await Promise.all([API.get('/campaigns/stats'), API.get('/campaigns')]);
        const stats = statsResponse.data;
        const campaigns = campaignsResponse.data;
        const campaignRows = campaigns.slice(0, 5).map(c => `<tr><td>${escHtml(c.name)}</td><td>${statusBadge(c.status)}</td><td>${c.leads}</td><td>${c.leads ? Math.round(c.opened / c.leads * 100) : 0}%</td><td>${c.converted}</td><td>${formatCurrency(c.spent)} / ${formatCurrency(c.budget)}</td></tr>`);
        renderPersonaDashboardShell('Marketing at a glance', 'Campaign reach, engagement and conversion performance.', [
          personaStat('Active Campaigns', stats.activeCampaigns, `${stats.totalCampaigns} total campaigns`, '📣'),
          personaStat('Leads Generated', stats.totalLeads, `${stats.totalConverted} converted`, '🎯'),
          personaStat('Average Open Rate', `${stats.avgOpenRate}%`, `${stats.avgClickRate}% click rate`, '✉️'),
          personaStat('Budget Utilized', `${stats.budgetUtilization}%`, `${formatCurrency(stats.totalSpent)} of ${formatCurrency(stats.totalBudget)}`, '💰'),
        ], [{ id: 'persona-chart-primary', title: 'Campaign Leads & Conversions' }, { id: 'persona-chart-secondary', title: 'Campaign Engagement' }],
        personaSection('Recent campaigns', 'Latest campaign results at a glance.', personaTable(['Campaign', 'Status', 'Leads', 'Open Rate', 'Conversions', 'Spend'], campaignRows)));
        renderPersonaChart('persona-chart-primary', 'bar', campaigns.map(c => c.name), [
          { label: 'Leads', data: campaigns.map(c => c.leads), backgroundColor: 'rgba(245,158,11,0.75)' },
          { label: 'Conversions', data: campaigns.map(c => c.converted), backgroundColor: 'rgba(16,185,129,0.75)' },
        ]);
        renderPersonaChart('persona-chart-secondary', 'doughnut', ['Opened', 'Not Opened'], [
          { data: [campaigns.reduce((sum, c) => sum + c.opened, 0), Math.max(stats.totalLeads - campaigns.reduce((sum, c) => sum + c.opened, 0), 0)], backgroundColor: ['#f59e0b', '#283144'], borderWidth: 0 },
        ]);
        return;
      }

      if (State.persona === 'support') {
        const [statsResponse, ticketsResponse] = await Promise.all([API.get('/tickets/stats'), API.get('/tickets')]);
        const stats = statsResponse.data;
        const tickets = ticketsResponse.data;
        const rows = tickets.slice(0, 5).map(t => `<tr><td>${escHtml(t.ticketNumber)}</td><td>${escHtml(t.subject)}</td><td>${escHtml(t.company)}</td><td>${statusBadge(t.status)}</td><td>${priorityBadge(t.priority)}</td><td>${escHtml(t.assignedTo)}</td></tr>`);
        renderPersonaDashboardShell('Support operations', 'Customer queue health, response workload and resolution speed.', [
          personaStat('Open Tickets', stats.open, `${stats.inProgress} in progress`, '🎫'),
          personaStat('High Priority', stats.highPriority, `${stats.noFirstResponse} awaiting first response`, '🚨'),
          personaStat('Resolved Tickets', stats.resolved, `${stats.totalTickets} total tickets`, '✅'),
          personaStat('Avg. Resolution', `${stats.avgResolutionHours}h`, `Customer satisfaction ${stats.satisfactionScore}/5`, '⏱️'),
        ], [{ id: 'persona-chart-primary', title: 'Tickets by Category' }, { id: 'persona-chart-secondary', title: 'Ticket Status' }],
        personaSection('Priority queue', 'Recently updated customer issues requiring attention.', personaTable(['Ticket', 'Subject', 'Customer', 'Status', 'Priority', 'Assigned To'], rows)));
        renderPersonaChart('persona-chart-primary', 'bar', Object.keys(stats.byCategory), [
          { label: 'Tickets', data: Object.values(stats.byCategory), backgroundColor: 'rgba(16,185,129,0.75)' },
        ]);
        renderPersonaChart('persona-chart-secondary', 'doughnut', ['Open', 'In Progress', 'Resolved'], [
          { data: [stats.open, stats.inProgress, stats.resolved], backgroundColor: ['#ef4444', '#f59e0b', '#10b981'], borderWidth: 0 },
        ]);
        return;
      }

      const { data } = await API.get('/manager/overview');
      renderPersonaDashboardShell('Business overview', 'A unified view of sales, marketing and customer support.', [
        personaStat('Revenue Won', formatCurrency(data.sales.revenue), `${data.sales.wonDeals} deals closed`, '💰'),
        personaStat('Sales Pipeline', formatCurrency(data.sales.pipeline), `${data.sales.activeDeals} active deals`, '📈'),
        personaStat('Marketing Leads', data.marketing.totalLeads, `${data.marketing.activeCampaigns} active campaigns`, '🎯'),
        personaStat('Open Tickets', data.support.openTickets, `${data.support.highPriorityTickets} high priority`, '🎫'),
      ], [{ id: 'persona-chart-primary', title: 'Monthly Revenue' }, { id: 'persona-chart-secondary', title: 'Team Deal Performance' }],
      personaSection('Team performance', 'Sales results by team.', personaTable(['Team', 'Deals', 'Won', 'Win Rate', 'Revenue'], data.sales.teamPerformance.map(team => `<tr><td>${escHtml(team.team)}</td><td>${team.deals}</td><td>${team.wonDeals}</td><td>${team.winRate}%</td><td>${formatCurrency(team.revenue)}</td></tr>`))));
      renderPersonaChart('persona-chart-primary', 'bar', data.monthlyRevenue.map(m => m.month), [
        { label: 'Revenue', data: data.monthlyRevenue.map(m => m.revenue), backgroundColor: 'rgba(99,102,241,0.75)' },
      ]);
      renderPersonaChart('persona-chart-secondary', 'bar', data.sales.teamPerformance.map(team => team.team), [
        { label: 'Deals', data: data.sales.teamPerformance.map(team => team.deals), backgroundColor: 'rgba(232,121,249,0.75)' },
        { label: 'Won', data: data.sales.teamPerformance.map(team => team.wonDeals), backgroundColor: 'rgba(16,185,129,0.75)' },
      ]);
    } catch (err) {
      console.error('Failed to load persona dashboard', err);
      showToast('Failed to load workspace dashboard', 'error');
    }
  }

  async function loadPersonaPage(page) {
    const container = document.getElementById('page-persona-data');
    container.innerHTML = '<div class="ai-loading"><div class="spinner"></div> Loading workspace data…</div>';
    try {
      if (State.persona === 'marketing' && page === 'campaigns') {
        const [statsResponse, campaignsResponse] = await Promise.all([API.get('/campaigns/stats'), API.get('/campaigns')]);
        const stats = statsResponse.data;
        const campaigns = campaignsResponse.data;
        container.innerHTML = personaSection('Campaign performance', `${stats.activeCampaigns} active · ${stats.totalLeads} leads · ${stats.conversionRate}% conversion`, personaTable(
          ['Campaign', 'Type', 'Status', 'Leads', 'Open Rate', 'Click Rate', 'Conversions', 'Budget', 'Spent'],
          campaigns.map(c => `<tr><td><strong>${escHtml(c.name)}</strong><div class="persona-table-secondary">${escHtml(c.targetAudience || '')}</div></td><td>${escHtml(c.type)}</td><td>${statusBadge(c.status)}</td><td>${c.leads}</td><td>${c.leads ? Math.round(c.opened / c.leads * 100) : 0}%</td><td>${c.opened ? Math.round(c.clicked / c.opened * 100) : 0}%</td><td>${c.converted}</td><td>${formatCurrency(c.budget)}</td><td>${formatCurrency(c.spent)}</td></tr>`)));
        return;
      }
      if (State.persona === 'support' && page === 'tickets') {
        const [statsResponse, ticketsResponse] = await Promise.all([API.get('/tickets/stats'), API.get('/tickets')]);
        const stats = statsResponse.data;
        container.innerHTML = personaSection('Customer support queue', `${stats.open} open · ${stats.inProgress} in progress · ${stats.noFirstResponse} awaiting first response`, personaTable(
          ['Ticket', 'Subject', 'Customer', 'Category', 'Priority', 'Status', 'Channel', 'Assigned To', 'Created'],
          ticketsResponse.data.map(t => `<tr><td>${escHtml(t.ticketNumber)}</td><td><strong>${escHtml(t.subject)}</strong><div class="persona-table-secondary">${escHtml(t.description)}</div></td><td>${escHtml(t.contactName)}<div class="persona-table-secondary">${escHtml(t.company)}</div></td><td>${escHtml(t.category)}</td><td>${priorityBadge(t.priority)}</td><td>${statusBadge(t.status)}</td><td>${escHtml(t.channel)}</td><td>${escHtml(t.assignedTo)}</td><td>${formatDate(t.createdAt)}</td></tr>`)));
        return;
      }
      if (State.persona === 'marketing' && page === 'leads' || State.persona === 'support' && page === 'customers') {
        const response = await API.get('/contacts');
        const label = State.persona === 'marketing' ? 'Campaign leads' : 'Customers';
        container.innerHTML = personaSection(label, `${response.total} CRM contacts`, personaTable(
          ['Contact', 'Company', 'Status', 'Lead Score', 'Source', 'Assigned To'],
          response.data.map(c => `<tr><td><strong>${escHtml(c.name)}</strong><div class="persona-table-secondary">${escHtml(c.email)}</div></td><td>${escHtml(c.company)}</td><td>${statusBadge(c.status)}</td><td>${c.leadScore}</td><td>${escHtml(c.source || '—')}</td><td>${escHtml(c.assignedTo || '—')}</td></tr>`)));
        return;
      }
      if (State.persona === 'manager') {
        const { data } = await API.get('/manager/overview');
        if (page === 'sales') {
          const dealsResponse = await API.get('/deals');
          container.innerHTML = personaSection('Sales performance', `${data.sales.activeDeals} active deals · ${data.sales.winRate}% win rate · ${formatCurrency(data.sales.pipeline)} pipeline`, personaTable(
            ['Deal', 'Company', 'Stage', 'Value', 'Probability', 'Owner', 'Expected Close'],
            dealsResponse.data.map(d => `<tr><td><strong>${escHtml(d.title)}</strong><div class="persona-table-secondary">${escHtml(d.contactName)}</div></td><td>${escHtml(d.company)}</td><td>${statusBadge(d.stage)}</td><td>${formatCurrency(d.value)}</td><td>${d.probability}%</td><td>${escHtml(d.assignedTo || '—')}</td><td>${formatDate(d.expectedCloseDate)}</td></tr>`)));
          return;
        }
        if (page === 'marketing') {
          const campaigns = (await API.get('/campaigns')).data;
          container.innerHTML = personaSection('Marketing performance', `${data.marketing.activeCampaigns} active campaigns · ${data.marketing.conversionRate}% conversion · ${formatCurrency(data.marketing.spent)} spent`, personaTable(
            ['Campaign', 'Type', 'Status', 'Leads', 'Conversions', 'Budget', 'Spent'],
            campaigns.map(c => `<tr><td><strong>${escHtml(c.name)}</strong></td><td>${escHtml(c.type)}</td><td>${statusBadge(c.status)}</td><td>${c.leads}</td><td>${c.converted}</td><td>${formatCurrency(c.budget)}</td><td>${formatCurrency(c.spent)}</td></tr>`)));
          return;
        }
        if (page === 'support') {
          const tickets = (await API.get('/tickets')).data;
          container.innerHTML = personaSection('Support performance', `${data.support.openTickets} open tickets · ${data.support.highPriorityTickets} high priority · ${data.support.avgResolutionHours}h average resolution`, personaTable(
            ['Ticket', 'Subject', 'Customer', 'Status', 'Priority', 'Channel', 'Assigned To'],
            tickets.map(t => `<tr><td>${escHtml(t.ticketNumber)}</td><td><strong>${escHtml(t.subject)}</strong></td><td>${escHtml(t.company)}</td><td>${statusBadge(t.status)}</td><td>${priorityBadge(t.priority)}</td><td>${escHtml(t.channel)}</td><td>${escHtml(t.assignedTo)}</td></tr>`)));
          return;
        }
        if (page === 'teams') {
          container.innerHTML = personaSection('Team performance', 'Deal volume, closed revenue and win rate by sales team.', personaTable(
            ['Team', 'Deals', 'Won Deals', 'Revenue', 'Win Rate'],
            data.sales.teamPerformance.map(team => `<tr><td><strong>${escHtml(team.team)}</strong></td><td>${team.deals}</td><td>${team.wonDeals}</td><td>${formatCurrency(team.revenue)}</td><td>${team.winRate}%</td></tr>`)));
          return;
        }
      }
    } catch (err) {
      console.error(`Failed to load ${page} workspace data`, err);
      container.innerHTML = '<div class="empty-state"><div class="empty-text">Workspace data could not be loaded. Please try again.</div></div>';
      showToast('Failed to load workspace data', 'error');
    }
  }

  function statusBadge(status) {
    const safeStatus = escHtml(status || 'unknown');
    return `<span class="badge badge-${safeStatus.toLowerCase().replace(/[^a-z0-9-]/g, '')}">${safeStatus}</span>`;
  }

  function priorityBadge(priority) {
    const safePriority = escHtml(priority || 'normal');
    return `<span class="badge badge-${safePriority.toLowerCase().replace(/[^a-z0-9-]/g, '')}">${cap(safePriority)}</span>`;
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? escHtml(value) : date.toLocaleDateString();
}

function openAddModal() {
  switch (State.currentPage) {
    case 'contacts': openContactModal(); break;
    case 'deals': openDealModal(); break;
    case 'tasks': openTaskModal(); break;
    default: openContactModal();
  }
}

// ── Dashboard ────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [statsRes, activitiesRes] = await Promise.all([
      API.get('/dashboard/stats'),
      API.get('/activities?limit=8'),
    ]);

    const stats = statsRes.data;
    State.dashboardStats = stats;

    // Stat cards
    document.getElementById('stat-contacts').textContent = stats.totalContacts;
    document.getElementById('stat-deals').textContent = stats.activeDeals;
    document.getElementById('stat-revenue').textContent = formatCurrency(stats.revenue);
    document.getElementById('stat-winrate').textContent = `${stats.winRate}%`;
    document.getElementById('stat-pipeline').textContent = formatCurrency(stats.pipeline);
    document.getElementById('stat-overdue').textContent = stats.overdueTasks;
    document.getElementById('stat-avg-deal').textContent = formatCurrency(stats.avgDealSize);
    document.getElementById('stat-hot-leads').textContent = stats.highLeads;

    document.getElementById('contacts-change').textContent = `↑ ${stats.activeContacts} active`;
    document.getElementById('deals-change').textContent = `${stats.wonDeals} won`;
    document.getElementById('win-rate-change').textContent = `${stats.wonDeals} closed`;
    document.getElementById('win-rate-change').className = `stat-change ${stats.winRate >= 50 ? 'positive' : 'negative'}`;

    // Update tasks badge
    document.getElementById('tasks-badge').textContent = stats.pendingTasks;

    // Render activities
    renderActivities(activitiesRes.data);

    // Charts
    renderCharts(stats);

    // AI Summary
    loadAISummary();
  } catch (err) {
    showToast('Failed to load dashboard', 'error');
    console.error(err);
  }
}

function renderActivities(activities) {
  const feed = document.getElementById('activity-feed');
  if (!activities.length) {
    feed.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">No recent activity</div></div>';
    return;
  }

  const iconMap = {
    trophy: '🏆', 'user-plus': '👤', 'check-circle': '✅',
    'trending-up': '📈', 'file-text': '📝', briefcase: '💼',
    'x-circle': '❌', 'user-minus': '🗑️',
  };

  feed.innerHTML = activities.map(a => `
    <div class="activity-item">
      <div class="activity-icon ${a.type}">${iconMap[a.icon] || '📌'}</div>
      <div class="activity-content">
        <div class="activity-msg">${a.message}</div>
        <div class="activity-time">${timeAgo(a.timestamp)}</div>
      </div>
    </div>
  `).join('');
}

async function loadActivities() {
  try {
    const res = await API.get('/activities?limit=8');
    renderActivities(res.data);
  } catch (err) { showToast('Failed to refresh activities', 'error'); }
}

function renderCharts(stats) {
  const theme = getChartTheme();
  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: theme.label, font: { family: 'Inter', size: 11 } } } },
  };

  // Revenue Chart
  if (State.charts.revenue) State.charts.revenue.destroy();
  const revCtx = document.getElementById('revenue-chart').getContext('2d');
  State.charts.revenue = new Chart(revCtx, {
    type: 'bar',
    data: {
      labels: stats.monthlyRevenue.map(m => m.month),
      datasets: [{
        label: 'Revenue (₹)',
        data: stats.monthlyRevenue.map(m => m.revenue),
        backgroundColor: (ctx) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, 'rgba(99,102,241,0.8)');
          gradient.addColorStop(1, 'rgba(139,92,246,0.2)');
          return gradient;
        },
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { grid: { color: theme.grid }, ticks: { color: theme.label, font: { size: 10 } } },
        y: { grid: { color: theme.grid }, ticks: { color: theme.label, font: { size: 10 }, callback: v => `₹${(v/1000).toFixed(0)}k` } },
      },
      plugins: { ...chartDefaults.plugins, legend: { display: false } },
    },
  });

  // Pipeline Doughnut Chart
  if (State.charts.pipeline) State.charts.pipeline.destroy();
  const pipCtx = document.getElementById('pipeline-chart').getContext('2d');
  const stageColors = ['#6366f1','#3b82f6','#f59e0b','#a855f7','#10b981','#ef4444'];
  State.charts.pipeline = new Chart(pipCtx, {
    type: 'doughnut',
    data: {
      labels: stats.stageData.map(s => s.stage),
      datasets: [{
        data: stats.stageData.map(s => s.count),
        backgroundColor: stageColors,
        borderColor: theme.border,
        borderWidth: 3,
        hoverBorderColor: theme.border,
      }],
    },
    options: {
      ...chartDefaults,
      cutout: '70%',
      plugins: {
        legend: { position: 'right', labels: { color: theme.label, font: { family: 'Inter', size: 11 }, padding: 14 } },
      },
    },
  });

  // Lead Score Chart
  if (State.charts.leads) State.charts.leads.destroy();
  const leadsCtx = document.getElementById('leads-chart').getContext('2d');
  State.charts.leads = new Chart(leadsCtx, {
    type: 'bar',
    data: {
      labels: ['High (80+)', 'Medium (50–79)', 'Low (<50)'],
      datasets: [{
        data: [stats.highLeads, stats.medLeads, stats.lowLeads],
        backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(245,158,11,0.7)', 'rgba(239,68,68,0.7)'],
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      ...chartDefaults,
      indexAxis: 'y',
      scales: {
        x: { grid: { color: theme.grid }, ticks: { color: theme.label, font: { size: 10 } } },
        y: { grid: { display: false }, ticks: { color: theme.label, font: { size: 10 } } },
      },
      plugins: { ...chartDefaults.plugins, legend: { display: false } },
    },
  });
}

async function loadAISummary() {
  const el = document.getElementById('ai-summary-text');
  el.innerHTML = '<div class="ai-loading"><div class="spinner"></div> Generating AI summary…</div>';
  try {
    const res = await API.post('/ai/summary', {});
    if (res.success) {
      el.textContent = res.summary;
    } else {
      el.textContent = '⚠️ AI summary unavailable — configure your Gemini API key in .env file to enable AI features.';
    }
  } catch (err) {
    el.textContent = '⚠️ AI features require a valid Gemini API key. Add GEMINI_API_KEY to your .env file and restart the server.';
  }
}

// ── Contacts ─────────────────────────────────────────────
async function loadContacts() {
  try {
    const params = buildContactParams();
    const res = await API.get(`/contacts?${params}`);
    State.contacts = res.data;
    renderContactsTable(res.data);
    document.getElementById('contacts-count').textContent = `${res.total} contact${res.total !== 1 ? 's' : ''}`;
    document.getElementById('contacts-total').textContent = `${res.total} result${res.total !== 1 ? 's' : ''}`;
  } catch (err) {
    showToast('Failed to load contacts', 'error');
  }
}

function buildContactParams() {
  const params = new URLSearchParams();
  const search = document.getElementById('contact-search')?.value;
  const status = document.getElementById('contact-status-filter')?.value;
  const sort = document.getElementById('contact-sort')?.value;
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (sort) params.set('sort', sort);
  return params.toString();
}

let contactFilterTimer;
function filterContacts() {
  clearTimeout(contactFilterTimer);
  contactFilterTimer = setTimeout(loadContacts, 300);
}

function renderContactsTable(contacts) {
  const tbody = document.getElementById('contacts-table-body');
  if (!contacts.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">No contacts found</div></div></td></tr>`;
    return;
  }

  tbody.innerHTML = contacts.map(c => `
    <tr>
      <td>
        <div class="contact-cell">
          <div class="contact-avatar" style="background:${avatarColor(c.name)}">${initials(c.name)}</div>
          <div>
            <div class="contact-name">${escHtml(c.name)}</div>
            <div class="contact-email">${escHtml(c.email)}</div>
          </div>
        </div>
      </td>
      <td>
        <div style="font-weight:500;color:var(--text-primary);">${escHtml(c.company)}</div>
        <div style="font-size:0.72rem;color:var(--text-muted);">${escHtml(c.jobTitle || '')}</div>
      </td>
      <td><span class="badge badge-${c.status}">${cap(c.status)}</span></td>
      <td>
        <div class="score-bar">
          <div class="score-track">
            <div class="score-fill ${c.leadScore >= 80 ? 'high' : c.leadScore >= 50 ? 'medium' : 'low'}" style="width:${c.leadScore}%"></div>
          </div>
          <span class="score-num">${c.leadScore}</span>
        </div>
      </td>
      <td>${(c.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}</td>
      <td style="color:var(--text-muted);font-size:0.8rem;">${c.lastContact || '—'}</td>
      <td style="color:var(--text-muted);font-size:0.8rem;${isOverdue(c.nextFollowUp) ? 'color:var(--danger)!important;' : ''}">${c.nextFollowUp || '—'}</td>
      <td>
        <div class="row-actions">
          <button class="action-btn" title="Edit" onclick="editContact('${c.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn" title="AI Insights" onclick="openLeadInsights('${c.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </button>
          <button class="action-btn danger" title="Delete" onclick="deleteContact('${c.id}', '${escHtml(c.name)}')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openContactModal(contact = null) {
  document.getElementById('contact-modal-title').textContent = contact ? 'Edit Contact' : 'Add Contact';
  document.getElementById('contact-edit-id').value = contact?.id || '';
  document.getElementById('c-name').value = contact?.name || '';
  document.getElementById('c-email').value = contact?.email || '';
  document.getElementById('c-phone').value = contact?.phone || '';
  document.getElementById('c-company').value = contact?.company || '';
  document.getElementById('c-jobtitle').value = contact?.jobTitle || '';
  document.getElementById('c-status').value = contact?.status || 'prospect';
  document.getElementById('c-source').value = contact?.source || 'Website';
  document.getElementById('c-score').value = contact?.leadScore ?? 50;
  document.getElementById('c-followup').value = contact?.nextFollowUp || '';
  document.getElementById('c-assigned').value = contact?.assignedTo || 'Sales Team A';
  document.getElementById('c-tags').value = (contact?.tags || []).join(', ');
  document.getElementById('c-notes').value = contact?.notes || '';
  openModal('contact-modal');
}

async function saveContact() {
  const id = document.getElementById('contact-edit-id').value;
  const name = document.getElementById('c-name').value.trim();
  const email = document.getElementById('c-email').value.trim();
  const company = document.getElementById('c-company').value.trim();
  if (!name || !email || !company) { showToast('Name, email & company are required', 'error'); return; }

  const payload = {
    name, email,
    phone: document.getElementById('c-phone').value.trim(),
    company,
    jobTitle: document.getElementById('c-jobtitle').value.trim(),
    status: document.getElementById('c-status').value,
    source: document.getElementById('c-source').value,
    leadScore: parseInt(document.getElementById('c-score').value) || 50,
    nextFollowUp: document.getElementById('c-followup').value,
    assignedTo: document.getElementById('c-assigned').value,
    tags: document.getElementById('c-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    notes: document.getElementById('c-notes').value.trim(),
  };

  try {
    if (id) {
      await API.put(`/contacts/${id}`, payload);
      showToast('Contact updated successfully', 'success');
    } else {
      await API.post('/contacts', payload);
      showToast('Contact added successfully', 'success');
    }
    closeModal('contact-modal');
    loadContacts();
  } catch (err) {
    showToast('Failed to save contact', 'error');
  }
}

async function editContact(id) {
  try {
    const res = await API.get(`/contacts/${id}`);
    openContactModal(res.data);
  } catch (err) { showToast('Failed to load contact', 'error'); }
}

async function deleteContact(id, name) {
  if (!confirm(`Delete contact "${name}"? This cannot be undone.`)) return;
  try {
    await API.delete(`/contacts/${id}`);
    showToast('Contact deleted', 'success');
    loadContacts();
  } catch (err) { showToast('Failed to delete contact', 'error'); }
}

function openLeadInsights(contactId) {
  navigateTo('ai');
  setTimeout(() => {
    document.getElementById('lead-contact-select').value = contactId;
    analyzeLeadInsights();
  }, 500);
}

// ── Pipeline ─────────────────────────────────────────────
async function loadPipeline() {
  try {
    const res = await API.get('/deals/pipeline');
    State.deals = Object.values(res.data).flatMap(s => s.deals);
    renderPipeline(res.data, res.stages);

    const total = State.deals.length;
    const active = State.deals.filter(d => !['Won','Lost'].includes(d.stage));
    const pipeline = active.reduce((s, d) => s + d.value, 0);
    document.getElementById('pipeline-summary').textContent = `${total} deals · Active pipeline: ${formatCurrency(pipeline)}`;
  } catch (err) {
    showToast('Failed to load pipeline', 'error');
  }
}

function renderPipeline(pipeline, stages) {
  const stageColors = { Lead: 'lead', Qualified: 'qualified', Proposal: 'proposal', Negotiation: 'negotiation', Won: 'won', Lost: 'lost' };
  const board = document.getElementById('pipeline-board');

  board.innerHTML = stages.map(stage => {
    const data = pipeline[stage];
    const cards = data.deals.map(d => `
      <div class="deal-card" onclick="openDealDetail('${d.id}')">
        <div class="deal-card-title">${escHtml(d.title)}</div>
        <div class="deal-card-company">${escHtml(d.company)}</div>
        <div class="deal-card-footer">
          <span class="deal-value">${formatCurrency(d.value)}</span>
          <span class="deal-prob">${d.probability}%</span>
        </div>
      </div>
    `).join('');

    return `
      <div class="pipeline-col ${stage.toLowerCase()}">
        <div class="pipeline-col-header">
          <div class="col-stage-label">
            <div class="stage-dot ${stageColors[stage]}"></div>
            ${stage}
          </div>
          <div class="col-stats">
            <span class="col-count">${data.count}</span>
            <span class="col-value">${formatCurrency(data.totalValue)}</span>
          </div>
        </div>
        <div class="pipeline-cards">
          ${cards || '<div style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:10px;">No deals</div>'}
        </div>
      </div>
    `;
  }).join('');
}

async function openDealDetail(id) {
  try {
    const res = await API.get(`/deals/${id}`);
    const d = res.data;
    document.getElementById('deal-detail-title').textContent = d.title;
    document.getElementById('deal-detail-body').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div><span style="color:var(--text-muted);font-size:0.78rem;">Company</span><div style="font-weight:600;margin-top:2px;">${escHtml(d.company)}</div></div>
        <div><span style="color:var(--text-muted);font-size:0.78rem;">Contact</span><div style="font-weight:600;margin-top:2px;">${escHtml(d.contactName)}</div></div>
        <div><span style="color:var(--text-muted);font-size:0.78rem;">Deal Value</span><div style="font-weight:700;font-size:1.1rem;color:var(--text-primary);margin-top:2px;">${formatCurrency(d.value)}</div></div>
        <div><span style="color:var(--text-muted);font-size:0.78rem;">Stage</span><div style="margin-top:2px;"><span class="badge badge-${d.stage.toLowerCase()}">${d.stage}</span></div></div>
        <div><span style="color:var(--text-muted);font-size:0.78rem;">Win Probability</span>
          <div class="progress-bar" style="margin-top:4px;"><div class="progress-fill" style="width:${d.probability}%"></div></div>
          <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:2px;">${d.probability}%</div>
        </div>
        <div><span style="color:var(--text-muted);font-size:0.78rem;">Expected Close</span><div style="font-weight:600;margin-top:2px;">${d.expectedCloseDate}</div></div>
      </div>
      ${d.description ? `<div style="background:var(--bg-input);border-radius:var(--radius-md);padding:12px;font-size:0.85rem;color:var(--text-secondary);">${escHtml(d.description)}</div>` : ''}
      ${d.lostReason ? `<div style="background:var(--danger-bg);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-md);padding:12px;margin-top:12px;font-size:0.82rem;color:var(--danger);">Lost: ${escHtml(d.lostReason)}</div>` : ''}
    `;

    // Stage change actions
    const stages = ['Lead','Qualified','Proposal','Negotiation','Won','Lost'].filter(s => s !== d.stage);
    document.getElementById('deal-detail-footer').innerHTML = `
      <div style="flex:1;display:flex;gap:8px;flex-wrap:wrap;">
        <span style="font-size:0.78rem;color:var(--text-muted);align-self:center;">Move to:</span>
        ${stages.slice(0,4).map(s => `<button class="btn btn-secondary btn-sm" onclick="moveDeal('${d.id}','${s}')">${s}</button>`).join('')}
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteDeal('${d.id}')">Delete</button>
    `;

    openModal('deal-detail-modal');
  } catch (err) { showToast('Failed to load deal', 'error'); }
}

async function moveDeal(id, stage) {
  const probability = { Lead: 10, Qualified: 25, Proposal: 50, Negotiation: 75, Won: 100, Lost: 0 };
  try {
    await API.put(`/deals/${id}`, { stage, probability: probability[stage] });
    showToast(`Deal moved to ${stage}`, 'success');
    closeModal('deal-detail-modal');
    loadPipeline();
  } catch (err) { showToast('Failed to update deal', 'error'); }
}

async function deleteDeal(id) {
  if (!confirm('Delete this deal?')) return;
  try {
    await API.delete(`/deals/${id}`);
    showToast('Deal deleted', 'success');
    closeModal('deal-detail-modal');
    loadPipeline();
  } catch (err) { showToast('Failed to delete deal', 'error'); }
}

function openDealModal(deal = null) {
  document.getElementById('deal-modal-title').textContent = deal ? 'Edit Deal' : 'Add Deal';
  document.getElementById('deal-edit-id').value = deal?.id || '';
  document.getElementById('d-title').value = deal?.title || '';
  document.getElementById('d-contact').value = deal?.contactName || '';
  document.getElementById('d-company').value = deal?.company || '';
  document.getElementById('d-value').value = deal?.value || '';
  document.getElementById('d-stage').value = deal?.stage || 'Lead';
  document.getElementById('d-probability').value = deal?.probability || 25;
  document.getElementById('d-closedate').value = deal?.expectedCloseDate || '';
  document.getElementById('d-description').value = deal?.description || '';
  openModal('deal-modal');
}

async function saveDeal() {
  const id = document.getElementById('deal-edit-id').value;
  const title = document.getElementById('d-title').value.trim();
  if (!title) { showToast('Deal title is required', 'error'); return; }

  const payload = {
    title,
    contactName: document.getElementById('d-contact').value.trim(),
    company: document.getElementById('d-company').value.trim(),
    value: parseFloat(document.getElementById('d-value').value) || 0,
    stage: document.getElementById('d-stage').value,
    probability: parseInt(document.getElementById('d-probability').value) || 0,
    expectedCloseDate: document.getElementById('d-closedate').value,
    description: document.getElementById('d-description').value.trim(),
  };

  try {
    if (id) {
      await API.put(`/deals/${id}`, payload);
      showToast('Deal updated', 'success');
    } else {
      await API.post('/deals', payload);
      showToast('Deal created', 'success');
    }
    closeModal('deal-modal');
    if (State.currentPage === 'deals') loadPipeline();
  } catch (err) { showToast('Failed to save deal', 'error'); }
}

// ── Tasks ────────────────────────────────────────────────
async function loadTasks() {
  try {
    const params = new URLSearchParams();
    const status = document.getElementById('task-status-filter')?.value;
    const priority = document.getElementById('task-priority-filter')?.value;
    const type = document.getElementById('task-type-filter')?.value;
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);

    const res = await API.get(`/tasks?${params}`);
    let tasks = res.data;
    if (type) tasks = tasks.filter(t => t.type === type);

    State.tasks = tasks;
    renderTasksList(tasks);

    const pending = tasks.filter(t => t.status === 'pending').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const overdue = tasks.filter(t => t.status === 'pending' && isOverdue(t.dueDate)).length;
    document.getElementById('tasks-summary').textContent = `${pending} pending · ${completed} completed · ${overdue} overdue`;
    document.getElementById('tasks-badge').textContent = pending;

    // Task stats
    document.getElementById('task-stats').innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:0.82rem;">
        <span style="color:var(--text-muted);">Pending</span><strong>${pending}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.82rem;">
        <span style="color:var(--text-muted);">Completed</span><strong style="color:var(--success);">${completed}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.82rem;">
        <span style="color:var(--text-muted);">Overdue</span><strong style="color:var(--danger);">${overdue}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.82rem;">
        <span style="color:var(--text-muted);">Total</span><strong>${tasks.length}</strong>
      </div>
    `;
  } catch (err) { showToast('Failed to load tasks', 'error'); }
}

function filterTasks() { loadTasks(); }

function renderTasksList(tasks) {
  const list = document.getElementById('tasks-list');
  if (!tasks.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">No tasks found</div></div>';
    return;
  }

  const typeIcon = { call: '📞', email: '✉️', meeting: '🤝', task: '📋' };

  list.innerHTML = tasks.map(t => {
    const overdue = isOverdue(t.dueDate) && t.status === 'pending';
    return `
    <div class="task-item ${t.status === 'completed' ? 'completed' : ''}">
      <div class="task-check ${t.status === 'completed' ? 'checked' : ''}" onclick="toggleTask('${t.id}', '${t.status}')">
        ${t.status === 'completed' ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </div>
      <div class="task-body">
        <div class="task-title ${t.status === 'completed' ? 'done' : ''}">${typeIcon[t.type] || '📋'} ${escHtml(t.title)}</div>
        <div class="task-meta">
          <span class="badge badge-${t.priority}">${cap(t.priority)}</span>
          <span class="task-due ${overdue ? 'overdue' : ''}">${overdue ? '⚠️ Overdue: ' : '📅 '}${t.dueDate}</span>
          ${t.contactName ? `<span class="task-contact">👤 ${escHtml(t.contactName)}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="action-btn danger" title="Delete" onclick="deleteTask('${t.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>
  `}).join('');
}

async function toggleTask(id, currentStatus) {
  const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  try {
    await API.put(`/tasks/${id}`, { status: newStatus });
    showToast(newStatus === 'completed' ? 'Task completed! ✅' : 'Task reopened', 'success');
    loadTasks();
  } catch (err) { showToast('Failed to update task', 'error'); }
}

function openTaskModal() {
  document.getElementById('t-title').value = '';
  document.getElementById('t-priority').value = 'medium';
  document.getElementById('t-type').value = 'call';
  document.getElementById('t-due').value = '';
  document.getElementById('t-assigned').value = 'Sales Team A';
  document.getElementById('t-contact').value = '';
  document.getElementById('t-desc').value = '';
  openModal('task-modal');
}

async function saveTask() {
  const title = document.getElementById('t-title').value.trim();
  if (!title) { showToast('Task title is required', 'error'); return; }

  const payload = {
    title,
    priority: document.getElementById('t-priority').value,
    type: document.getElementById('t-type').value,
    dueDate: document.getElementById('t-due').value,
    assignedTo: document.getElementById('t-assigned').value,
    contactName: document.getElementById('t-contact').value.trim(),
    description: document.getElementById('t-desc').value.trim(),
  };

  try {
    await API.post('/tasks', payload);
    showToast('Task created', 'success');
    closeModal('task-modal');
    loadTasks();
  } catch (err) { showToast('Failed to save task', 'error'); }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try {
    await API.delete(`/tasks/${id}`);
    showToast('Task deleted', 'success');
    loadTasks();
  } catch (err) { showToast('Failed to delete task', 'error'); }
}

// ── AI Page ──────────────────────────────────────────────
async function loadAIPage() {
  // Populate contact selects
  try {
    const res = await API.get('/contacts');
    const options = res.data.map(c => `<option value="${c.id}">${escHtml(c.name)} — ${escHtml(c.company)}</option>`).join('');
    document.getElementById('email-contact-select').innerHTML = '<option value="">Choose contact…</option>' + options;
    document.getElementById('lead-contact-select').innerHTML = '<option value="">Choose contact…</option>' + options;
  } catch (err) { console.error('Failed to load contacts for AI', err); }

  // Populate deals select
  try {
    const res = await API.get('/deals');
    const options = res.data.map(d => `<option value="${d.id}">${escHtml(d.title)} (${d.stage})</option>`).join('');
    document.getElementById('deal-select').innerHTML = '<option value="">Choose deal…</option>' + options;
  } catch (err) { console.error('Failed to load deals for AI', err); }
}

// Chat
async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  appendChatMessage('user', msg);
  input.value = '';
  input.style.height = 'auto';

  const btn = document.getElementById('send-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;"></div> Thinking…';

  // Typing indicator
  const typingId = appendTypingIndicator();

  try {
    const res = await API.post('/ai/chat', { message: msg });
    removeTypingIndicator(typingId);
    if (res.success) {
      appendChatMessage('ai', res.response);
    } else {
      appendChatMessage('ai', '⚠️ ' + res.error);
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    appendChatMessage('ai', '⚠️ AI features require a valid Gemini API key. Please configure GEMINI_API_KEY in your .env file.');
  }

  btn.disabled = false;
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send';
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
  // Auto-resize
  e.target.style.height = 'auto';
  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
}

function appendChatMessage(role, text) {
  const messages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `
    <div class="msg-avatar ${role}">${role === 'ai' ? '🤖' : '👤'}</div>
    <div class="msg-bubble">${formatMarkdown(text)}</div>
  `;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

function appendTypingIndicator() {
  const messages = document.getElementById('chat-messages');
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'chat-msg ai';
  div.id = id;
  div.innerHTML = `<div class="msg-avatar ai">🤖</div><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

async function generateEmail() {
  const contactId = document.getElementById('email-contact-select').value;
  const purpose = document.getElementById('email-purpose').value.trim();
  if (!contactId) { showToast('Please select a contact', 'error'); return; }

  const btn = document.getElementById('email-btn');
  const result = document.getElementById('email-result');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;"></div> Generating…';
  result.style.display = 'block';
  result.textContent = 'Generating email draft…';

  try {
    const res = await API.post('/ai/email-draft', { contactId, purpose });
    if (res.success) {
      result.textContent = res.email;
      showToast('Email draft generated!', 'success');
    } else {
      result.textContent = '⚠️ ' + res.error;
    }
  } catch (err) {
    result.textContent = '⚠️ AI features require a valid Gemini API key in .env file.';
  }

  btn.disabled = false;
  btn.innerHTML = 'Generate Email';
}

async function analyzeLeadInsights() {
  const contactId = document.getElementById('lead-contact-select').value;
  if (!contactId) { showToast('Please select a contact', 'error'); return; }

  const btn = document.getElementById('lead-btn');
  const result = document.getElementById('lead-result');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;"></div> Analyzing…';
  result.style.display = 'block';
  result.textContent = 'Analyzing lead…';

  try {
    const res = await API.post('/ai/lead-insights', { contactId });
    if (res.success) {
      result.textContent = res.insights;
      showToast('Lead analysis complete!', 'success');
    } else {
      result.textContent = '⚠️ ' + res.error;
    }
  } catch (err) {
    result.textContent = '⚠️ AI features require a valid Gemini API key in .env file.';
  }

  btn.disabled = false;
  btn.innerHTML = 'Analyze Lead';
}

async function analyzeDeal() {
  const dealId = document.getElementById('deal-select').value;
  if (!dealId) { showToast('Please select a deal', 'error'); return; }

  const btn = document.getElementById('deal-btn');
  const result = document.getElementById('deal-result');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;"></div> Analyzing…';
  result.style.display = 'block';
  result.textContent = 'Analyzing deal…';

  try {
    const res = await API.post('/ai/deal-analysis', { dealId });
    if (res.success) {
      result.textContent = res.analysis;
      showToast('Deal analysis complete!', 'success');
    } else {
      result.textContent = '⚠️ ' + res.error;
    }
  } catch (err) {
    result.textContent = '⚠️ AI features require a valid Gemini API key in .env file.';
  }

  btn.disabled = false;
  btn.innerHTML = 'Analyze Deal';
}

// ── Global Search ────────────────────────────────────────
let searchTimer;
function globalSearch(val) {
  clearTimeout(searchTimer);
  if (!val.trim()) return;
  searchTimer = setTimeout(() => {
    if (State.currentPage === 'contacts') {
      document.getElementById('contact-search').value = val;
      filterContacts();
    } else {
      navigateTo('contacts');
      setTimeout(() => {
        document.getElementById('contact-search').value = val;
        filterContacts();
      }, 200);
    }
  }, 400);
}

// ── Modal Helpers ────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// ESC to close modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

// ── Toast ────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; toast.style.transition = 'all 0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ── Utility Functions ────────────────────────────────────
function formatCurrency(val) {
  if (!val && val !== 0) return '—';
  if (val >= 100000) return `₹${(val/100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val/1000).toFixed(0)}K`;
  return `₹${val}`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function initials(name) {
  return (name || '').split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase();
}

function cap(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

function timeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp);
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return dateStr < new Date().toISOString().split('T')[0];
}

const avatarColors = ['linear-gradient(135deg,#6366f1,#8b5cf6)','linear-gradient(135deg,#3b82f6,#6366f1)','linear-gradient(135deg,#10b981,#3b82f6)','linear-gradient(135deg,#f59e0b,#ef4444)','linear-gradient(135deg,#a855f7,#6366f1)'];
function avatarColor(name) {
  let sum = 0;
  for (let i = 0; i < (name || '').length; i++) sum += name.charCodeAt(i);
  return avatarColors[sum % avatarColors.length];
}

function getChartTheme() {
  const styles = getComputedStyle(document.documentElement);
  return {
    grid: styles.getPropertyValue('--chart-grid').trim(),
    label: styles.getPropertyValue('--chart-label').trim(),
    border: styles.getPropertyValue('--chart-border').trim(),
  };
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
  const button = document.getElementById('theme-toggle');
  if (button) {
    button.setAttribute('aria-pressed', String(isLight));
    button.setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} mode`);
    button.title = `Switch to ${isLight ? 'dark' : 'light'} mode`;
    button.querySelector('.theme-toggle-icon').textContent = isLight ? '☾' : '☀';
  }
}

function toggleTheme() {
  const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('crm-theme', theme);
  applyTheme(theme);

  if (State.currentPage !== 'dashboard') return;
  if (State.persona === 'sales' && State.dashboardStats) {
    renderCharts(State.dashboardStats);
  } else if (State.persona !== 'sales') {
    loadPersonaDashboard();
  }
}

function formatMarkdown(text) {
  return escHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^#{1,3}\s(.+)$/gm, '<strong>$1</strong>')
    .replace(/^•\s/gm, '• ')
    .replace(/\n/g, '<br>');
}

// ── Init ─────────────────────────────────────────────────
function configureWorkspace() {
  const workspaces = {
    '/sales': { name: 'Sales Executive', role: 'Sales Workspace', tagline: 'Sales CRM Platform', avatar: 'SE' },
    '/marketing': { name: 'Marketing Executive', role: 'Marketing Workspace', tagline: 'Marketing CRM Platform', avatar: 'ME' },
    '/support': { name: 'Support Agent', role: 'Support Workspace', tagline: 'Customer Support Platform', avatar: 'SA' },
    '/manager': { name: 'General Manager', role: 'Leadership Workspace', tagline: 'Unified Command Centre', avatar: 'GM' },
  };
  const workspace = workspaces[window.location.pathname];
  if (!workspace) {
    State.persona = 'sales';
    return;
  }

  State.persona = window.location.pathname.slice(1);
  document.title = `${workspace.name} — CRM Pro`;
  document.getElementById('workspace-tagline').textContent = workspace.tagline;
  document.getElementById('workspace-name').textContent = workspace.name;
  document.getElementById('workspace-role').textContent = workspace.role;
  document.getElementById('workspace-avatar').textContent = workspace.avatar;
  if (State.persona !== 'sales') {
    renderPersonaNavigation(personaPages[State.persona]);
    document.querySelector('.header-search').style.display = 'none';
    const toolCards = document.querySelectorAll('.ai-tools-panel > .ai-tool-card');
    const aiCopy = {
      marketing: {
        greeting: '👋 Welcome to your marketing AI workspace.<br><br>I can help you draft campaign messaging, brainstorm content, and find opportunities to improve lead engagement.',
        placeholder: 'Ask about campaign messaging, engagement, or lead generation…',
        purpose: 'e.g. Product launch announcement for SMBs',
        hiddenTools: [2],
      },
      support: {
        greeting: '👋 Welcome to your customer support AI workspace.<br><br>I can help draft customer responses and suggest clear, empathetic ways to resolve support issues.',
        placeholder: 'Ask for help responding to a customer or resolving an issue…',
        purpose: 'e.g. Reply to a customer about their open ticket',
        hiddenTools: [1, 2],
      },
      manager: {
        greeting: '👋 Welcome to your executive AI workspace.<br><br>Ask me to summarize business performance or explore sales, marketing, and support metrics.',
        placeholder: 'Ask about company performance, teams, or business trends…',
        purpose: 'e.g. Executive update on this quarter’s performance',
        hiddenTools: [1, 2],
      },
    }[State.persona];
    const greeting = document.querySelector('#chat-messages .chat-msg.ai .msg-bubble');
    const chatStatus = document.querySelector('.chat-header [style*="font-size:0.72rem"]');
    const emailToolName = toolCards[0]?.querySelector('.ai-tool-name');
    const emailToolDescription = toolCards[0]?.querySelector('.ai-tool-desc');
    if (State.persona === 'marketing') {
      if (emailToolName) emailToolName.textContent = 'Campaign Copy Generator';
      if (emailToolDescription) emailToolDescription.textContent = 'Draft tailored campaign emails for a selected audience.';
    } else if (State.persona === 'support') {
      if (emailToolName) emailToolName.textContent = 'Customer Response Draft';
      if (emailToolDescription) emailToolDescription.textContent = 'Prepare a clear, personalized email response for a customer.';
    } else if (State.persona === 'manager') {
      if (emailToolName) emailToolName.textContent = 'Executive Email Draft';
      if (emailToolDescription) emailToolDescription.textContent = 'Draft a polished business update for a CRM contact.';
    }
    if (greeting) greeting.innerHTML = aiCopy.greeting;
    if (chatStatus) chatStatus.lastChild.textContent = ` ${workspace.name} AI assistant`;
    document.getElementById('chat-input').placeholder = aiCopy.placeholder;
    document.getElementById('email-purpose').placeholder = aiCopy.purpose;
    aiCopy.hiddenTools.forEach(index => {
      if (toolCards[index]) toolCards[index].style.display = 'none';
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(localStorage.getItem('crm-theme') || 'dark');
  configureWorkspace();
  navigateTo('dashboard');
});
