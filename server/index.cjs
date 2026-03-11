/**
 * 🧘 情绪管理与智能坐垫干预系统 - 后端服务
 */

const fs = require('fs');
const pathModule = require('path');

// ── 加载 .env ──
try {
  const envPath = pathModule.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
      const t = line.trim();
      if (t && !t.startsWith('#')) {
        const i = t.indexOf('=');
        if (i > 0) {
          const k = t.substring(0, i).trim();
          const v = t.substring(i + 1).trim();
          if (!process.env[k]) process.env[k] = v;
        }
      }
    });
  }
} catch (_) {}

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = parseInt(process.env.PORT || '8000', 10);

// ── Middleware ──
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ── Health check ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', ready: true });
});

// ── 初始化数据库（纯 JSON 赋值，极快） ──
const db = require('./database.cjs');
db.init();

// ── 初始化 AI 服务 ──
const { SiliconFlowAIService } = require('./services.cjs');
const aiService = new SiliconFlowAIService();
app.set('aiService', aiService);

// ── 注册业务路由 ──
const routes = require('./routes.cjs');
app.use('/api/v1', routes);

// ── 前端静态文件 ──
const distPath = pathModule.join(__dirname, '..', 'dist');
const indexHtml = pathModule.join(distPath, 'index.html');

if (fs.existsSync(indexHtml)) {
  app.use(express.static(distPath));

  // SPA fallback — 所有非 API 的 GET 请求返回 index.html
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/health')) {
      res.sendFile(indexHtml);
    } else {
      next();
    }
  });
  console.log('📁 前端文件: ✅ 已加载');
} else {
  console.log('📁 前端文件: ⚠️ dist/ 不存在，仅提供 API');
  app.get('/', (_req, res) => {
    res.json({
      name: '情绪管理与智能坐垫干预系统',
      api: '/api/v1',
      health: '/health'
    });
  });
}

// ── 错误处理 ──
app.use((err, _req, res, _next) => {
  console.error('💥', err.message);
  res.status(500).json({ detail: err.message });
});

// ── 启动 ──
app.listen(PORT, '0.0.0.0', () => {
  const aiOk = aiService.isConfigured();
  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log('  🧘 系统已就绪');
  console.log(`  🌐 地址: http://0.0.0.0:${PORT}`);
  console.log(`  📡 API:  http://0.0.0.0:${PORT}/api/v1`);
  console.log(`  🤖 AI:   ${aiOk ? '✅ 已配置 (' + aiService.model + ')' : '⚠️ 未配置 (使用模板)'}`);
  console.log('══════════════════════════════════════════════');
  console.log('');
});

// ── 优雅退出 ──
process.on('SIGTERM', () => { console.log('🛑 SIGTERM'); process.exit(0); });
process.on('SIGINT', () => { console.log('🛑 SIGINT'); process.exit(0); });
