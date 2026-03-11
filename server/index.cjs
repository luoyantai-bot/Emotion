const fs = require('fs');
const path = require('path');

// ── Startup diagnostics ──
console.log('');
console.log('🔍 [诊断] Node.js:', process.version);
console.log('🔍 [诊断] 环境变量 PORT:', process.env.PORT || '(未设置)');
console.log('🔍 [诊断] 工作目录:', process.cwd());
console.log('🔍 [诊断] 内存限制:', Math.round(require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024) + 'MB');
console.log('');

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
    console.log('📄 已加载 .env');
  }
} catch (e) { /* ignore */ }

const express = require('express');
const cors = require('cors');

const app = express();

// ── PORT: Railway auto-injects this. MUST use process.env.PORT ──
const PORT = parseInt(process.env.PORT, 10) || 8000;
console.log(`🔌 将监听端口: ${PORT} (来源: ${process.env.PORT ? 'Railway环境变量' : '默认值'})`);

// ── Basic middleware ──
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ── Request logger ──
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} → ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// ── Health check ──
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', port: PORT, uptime: process.uptime() });
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', ready: true });
});

// ── Init database ──
let dbReady = false;
try {
  const db = require('./database.cjs');
  db.init();
  dbReady = true;
} catch (e) {
  console.error('💥 数据库初始化失败:', e.message);
}

// ── Init AI service ──
let aiReady = false;
try {
  const { SiliconFlowAIService } = require('./services.cjs');
  const aiService = new SiliconFlowAIService();
  app.set('aiService', aiService);
  aiReady = true;
  console.log(`🤖 AI: ${aiService.isConfigured() ? '✅ ' + aiService.model : '⚠️ 未配置'}`);
} catch (e) {
  console.error('💥 AI服务初始化失败:', e.message);
}

// ── API routes ──
try {
  const routes = require('./routes.cjs');
  app.use('/api/v1', routes);
  console.log('📡 API 路由: ✅ 已加载');
} catch (e) {
  console.error('💥 路由加载失败:', e.message);
  // Fallback: at least have a working root
  app.get('/api/v1', (req, res) => {
    res.json({ error: 'Routes failed to load', detail: e.message });
  });
}

// ── Static files + SPA fallback ──
const distDir = path.join(__dirname, '..', 'dist');
const indexFile = path.join(distDir, 'index.html');

if (fs.existsSync(indexFile)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(indexFile);
  });
  console.log('📁 前端: ✅ 已加载');
} else {
  app.get('/', (req, res) => {
    res.json({
      name: '情绪管理与智能坐垫干预系统',
      status: { db: dbReady, ai: aiReady },
      api: '/api/v1',
      health: '/health'
    });
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
  console.log('');
  console.log('══════════════════════════════════════════');
  console.log('  🧘 系统已就绪');
  console.log(`  🌐 http://0.0.0.0:${PORT}`);
  console.log(`  📦 数据库: ${dbReady ? '✅' : '❌'}`);
  console.log(`  🤖 AI: ${aiReady ? '✅' : '❌'}`);
  console.log('══════════════════════════════════════════');
  console.log('');
});

server.on('error', (err) => {
  console.error('🚨 Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用！`);
  }
});

// ── Graceful shutdown ──
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received');
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
});

// ── Catch unhandled errors (prevent silent crashes) ──
process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('🚨 Unhandled Rejection:', reason);
});
