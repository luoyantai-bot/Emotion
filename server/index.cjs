const fs = require('fs');
const path = require('path');

// ── Load .env (won't override existing env vars) ──
try {
  const envFile = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envFile)) {
    fs.readFileSync(envFile, 'utf-8').split('\n').forEach(line => {
      const t = line.trim();
      if (t && !t.startsWith('#')) {
        const eq = t.indexOf('=');
        if (eq > 0) {
          const k = t.substring(0, eq).trim();
          const v = t.substring(eq + 1).trim();
          if (!process.env[k]) process.env[k] = v;
        }
      }
    });
  }
} catch (e) { /* ignore */ }

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = parseInt(process.env.PORT || '8000', 10);

// ── Basic middleware ──
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ── Request logger (helps debug Railway) ──
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} → ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// ── Health check (highest priority) ──
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', ready: true });
});

// ── Init database ──
const db = require('./database.cjs');
db.init();

// ── Init AI service ──
const { SiliconFlowAIService } = require('./services.cjs');
const aiService = new SiliconFlowAIService();
app.set('aiService', aiService);

// ── API routes ──
const routes = require('./routes.cjs');
app.use('/api/v1', routes);

// ── Static files + SPA fallback ──
const distDir = path.join(__dirname, '..', 'dist');
const indexFile = path.join(distDir, 'index.html');

if (fs.existsSync(indexFile)) {
  app.use(express.static(distDir));
  // Express 4 supports '*' wildcard
  app.get('*', (req, res) => {
    res.sendFile(indexFile);
  });
  console.log('📁 前端: ✅ 已加载');
} else {
  app.get('/', (req, res) => {
    res.json({ name: '情绪管理与智能坐垫干预系统', api: '/api/v1' });
  });
  console.log('📁 前端: ⚠️ dist/ 不存在');
}

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error('💥 Error:', err.message);
  res.status(500).json({ detail: err.message });
});

// ── Start server ──
const server = app.listen(PORT, '0.0.0.0', () => {
  const aiOk = aiService.isConfigured();
  console.log('');
  console.log('══════════════════════════════════════════');
  console.log('  🧘 系统已就绪');
  console.log(`  🌐 http://0.0.0.0:${PORT}`);
  console.log(`  📡 http://0.0.0.0:${PORT}/api/v1`);
  console.log(`  🤖 AI: ${aiOk ? '✅ ' + aiService.model : '⚠️ 未配置'}`);
  console.log('══════════════════════════════════════════');
  console.log('');
});

server.on('error', (err) => {
  console.error('🚨 Server error:', err);
});

// ── Graceful shutdown ──
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM');
  server.close(() => process.exit(0));
});
