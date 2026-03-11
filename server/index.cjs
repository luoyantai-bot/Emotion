/**
 * 🧘 情绪管理与智能坐垫干预系统 - 极简启动
 * 
 * 启动顺序: 加载env → 注册/health → listen → 初始化数据
 */

// ── Step 0: 手动加载 .env ──
const fs = require('fs');
const path = require('path');
try {
  const envPath = path.join(__dirname, '..', '.env');
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

// ── Step 1: Middleware ──
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ── Step 2: Health check — 最高优先级，零依赖 ──
let systemReady = false;

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', ready: systemReady });
});

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ status: 'ok', ready: systemReady });
});

// ── Step 3: 立即启动 HTTP ──
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ HTTP 已启动 → 0.0.0.0:${PORT} (健康检查就绪)`);

  // ── Step 4: 启动后再加载业务逻辑 ──
  try {
    // 初始化数据库（纯 JSON 赋值，无计算）
    const db = require('./database.cjs');
    db.init();

    // 初始化 AI 服务
    const { SiliconFlowAIService } = require('./services.cjs');
    const aiService = new SiliconFlowAIService();
    app.set('aiService', aiService);

    // 注册业务路由
    const routes = require('./routes.cjs');
    app.use('/api/v1', routes);

    // 前端静态文件
    const distPath = path.join(__dirname, '..', 'dist');
    const indexHtml = path.join(distPath, 'index.html');

    if (fs.existsSync(indexHtml)) {
      app.use(express.static(distPath));
      app.use((req, res, next) => {
        if (req.method === 'GET' && !req.url.startsWith('/api/') && !req.url.startsWith('/health')) {
          res.sendFile(indexHtml);
        } else {
          next();
        }
      });
      console.log('📁 前端文件已加载');
    }

    // 错误处理
    app.use((err, _req, res, _next) => {
      console.error('💥', err.message);
      res.status(500).json({ detail: err.message });
    });

    systemReady = true;

    const aiOk = aiService.isConfigured();
    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('  🧘 系统已就绪');
    console.log(`  📡 API: http://0.0.0.0:${PORT}/api/v1`);
    console.log(`  🤖 AI:  ${aiOk ? '✅ 已配置 (' + aiService.model + ')' : '⚠️ 未配置 (使用模板)'}`);
    console.log('══════════════════════════════════════════════');
    console.log('');

  } catch (err) {
    console.error('💥 初始化失败:', err.message);
    console.error(err.stack);
    // 服务仍运行，健康检查仍可用
  }
});

// ── 优雅退出 ──
const shutdown = (sig) => {
  console.log(`🛑 ${sig}，关闭中...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
