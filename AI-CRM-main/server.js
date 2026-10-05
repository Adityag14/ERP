require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/manager', require('./routes/manager'));

// Persona routes currently share the CRM application shell; the client personalizes it by route.
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));
const sendPersonaApp = (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html'));
app.get('/sales', sendPersonaApp);
app.get('/marketing', sendPersonaApp);
app.get('/support', sendPersonaApp);
app.get('/manager', sendPersonaApp);

// Legacy redirect: /index.html → /sales
app.get('/index.html', (req, res) => res.redirect('/sales'));

app.use(express.static(path.join(__dirname, 'public')));

// Fallback
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 CRM Pro — Multi-Persona Platform`);
  console.log(`   Landing Page  : http://localhost:${PORT}/`);
  console.log(`   Sales Module  : http://localhost:${PORT}/sales`);
  console.log(`   Marketing     : http://localhost:${PORT}/marketing`);
  console.log(`   Support       : http://localhost:${PORT}/support`);
  console.log(`   Manager View  : http://localhost:${PORT}/manager`);
  console.log(`   🤖 AI powered by Gemini API\n`);
});

// Handle server errors (e.g. port already in use)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use by another running process.`);
    console.error(`   A CRM server instance is likely already running in the background.`);
    console.error(`   Either access http://localhost:${PORT} in your browser,`);
    console.error(`   or close the other process before running 'npm start'.\n`);
  } else {
    console.error('\n❌ Server error:', err.message);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down CRM server...');
  server.close(() => {
    console.log('✅ Server stopped cleanly.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
