/**
 * ============================================================
 * 🧘 情绪管理与智能坐垫干预系统 - Node.js 后端
 * ============================================================
 * 
 * 关键：先启动 HTTP 服务，先响应健康检查
 *       再异步初始化数据库种子数据
 */

// ── 加载 .env 文件 ──
try {
  const fs = require('fs');
  const envPath = require('path').join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          const value = trimmed.substring(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
    console.log('📄 已加载 .env 配置文件');
  }
} catch (e) {
  console.log('⚠️ .env 文件加载跳过:', e.message);
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { SiliconFlowAIService } = require('./services.cjs');

const app = express();
const PORT = parseInt(process.env.PORT || '8000', 10);

// 创建全局 AI 服务实例（轻量，不阻塞）
const aiService = new SiliconFlowAIService();
app.set('aiService', aiService);

// 数据库就绪标志
let dbReady = false;
let dbError = null;

// ── Middleware ──
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.use(express.json({ limit: '10mb' }));

// ══════════════════════════════════════════════════════════════
// 🔴 最高优先级：健康检查 — 必须在所有其他路由之前
//    即使数据库还没初始化完，也要返回 200
// ══════════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    db_ready: dbReady,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res, next) => {
  // 如果有前端文件，交给后面的静态文件中间件
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    return next();
  }
  // 没有前端文件时返回 API 信息
  res.json({
    status: 'ok',
    service: '🧘 情绪管理与智能坐垫干预系统 API',
    db_ready: dbReady,
  });
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: '情绪管理与智能坐垫干预系统',
    db_ready: dbReady,
    timestamp: new Date().toISOString(),
    ai_configured: aiService.isConfigured(),
  });
});

// ══════════════════════════════════════════════════════════════
// 🟡 第一步：先启动服务器！
// ══════════════════════════════════════════════════════════════
const server = app.listen(PORT, '0.0.0.0', () => {
  const addr = server.address();
  console.log('');
  console.log('='.repeat(60));
  console.log('  🧘 情绪管理与智能坐垫干预系统 - 后端服务');
  console.log('='.repeat(60));
  console.log(`  ✅ HTTP 服务已启动! (健康检查已就绪)`);
  console.log(`  🌐 监听地址: ${addr.address}:${addr.port}`);
  console.log('='.repeat(60));
  console.log('');

  // ══════════════════════════════════════════════════════════
  // 🟢 第二步：服务器已启动后，再异步初始化数据库和路由
  // ══════════════════════════════════════════════════════════
  console.log('📦 开始初始化数据库...');

  try {
    // 这一步会同步运行种子数据生成（包含算法引擎）
    // 但此时 HTTP 服务已经在线了，健康检查可以响应
    const routes = require('./routes.cjs');
    app.use('/api/v1', routes);

    // ── Serve Frontend (production) ──
    const distPath = path.join(__dirname, '..', 'dist');
    const indexPath = path.join(distPath, 'index.html');
    const hasDistFolder = fs.existsSync(indexPath);

    if (hasDistFolder) {
      console.log('📁 找到前端构建文件: ' + distPath);
      app.use(express.static(distPath));

      // SPA fallback — 非 API 请求都返回 index.html
      app.use((req, res, next) => {
        if (req.method === 'GET' && !req.url.startsWith('/api/')) {
          res.sendFile(indexPath);
        } else {
          next();
        }
      });
    } else {
      console.log('⚠️ 未找到前端构建文件，仅提供 API 服务');
    }

    // ── Error Handler ──
    app.use((err, req, res, _next) => {
      console.error('💥 Unhandled Error:', err.message);
      res.status(500).json({ detail: err.message || 'Internal Server Error' });
    });

    dbReady = true;

    // 打印完整信息
    const aiConfigured = aiService.isConfigured();
    const aiKeyPreview = aiService.apiKey
      ? `${aiService.apiKey.substring(0, 8)}...${aiService.apiKey.slice(-4)}`
      : '未配置';

    console.log('');
    console.log('='.repeat(60));
    console.log('  ✅ 全部初始化完成！系统已就绪');
    console.log('-'.repeat(60));
    console.log(`  📡 API 地址: http://0.0.0.0:${addr.port}/api/v1`);
    console.log(`  📁 前端文件: ${hasDistFolder ? '✅ 已加载' : '❌ 未找到'}`);
    console.log(`  🤖 AI 大模型:`);
    console.log(`     状态:  ${aiConfigured ? '✅ 已配置 (真实 API 模式)' : '⚠️ 未配置 (模板 Fallback)'}`);
    console.log(`     Key:   ${aiKeyPreview}`);
    console.log(`     Model: ${aiService.model}`);
    console.log('='.repeat(60));
    console.log('');

  } catch (err) {
    dbError = err.message;
    console.error('💥 数据库初始化失败:', err.message);
    console.error(err.stack);
    // 服务仍然保持运行，健康检查仍然可用
  }
});

// ── Request Logger (在 listen 之前添加) ──
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const icon = res.statusCode < 400 ? '✅' : '❌';
    if (!req.url.includes('/health')) {
      console.log(`${icon} ${req.method} ${req.url} → ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// ── 优雅退出 ──
process.on('SIGTERM', () => {
  console.log('🛑 收到 SIGTERM，正在关闭服务...');
  server.close(() => {
    console.log('👋 服务已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 收到 SIGINT，正在关闭服务...');
  server.close(() => {
    console.log('👋 服务已关闭');
    process.exit(0);
  });
});
