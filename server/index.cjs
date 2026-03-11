/**
 * ============================================================
 * 🧘 情绪管理与智能坐垫干预系统 - Node.js 后端
 * ============================================================
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

// 创建全局 AI 服务实例
const aiService = new SiliconFlowAIService();
app.set('aiService', aiService);

// ── Middleware ──
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.use(express.json({ limit: '10mb' }));

// ── 最高优先级：根路径健康检查 ──
// Railway / Render 等平台会检查 GET / 是否返回 200
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: '情绪管理与智能坐垫干预系统',
    timestamp: new Date().toISOString(),
    ai_configured: aiService.isConfigured(),
  });
});

// ── Request Logger ──
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

// ── API Routes ──
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
  console.log('   运行 npm run build 来构建前端');
  
  // 没有前端文件时，根路径返回 API 信息
  app.get('/', (req, res) => {
    res.json({
      service: '🧘 情绪管理与智能坐垫干预系统 API',
      version: '1.0.0',
      status: 'running',
      api_docs: '/api/v1/health',
      endpoints: {
        health: 'GET /api/v1/health',
        tenants: 'GET /api/v1/tenants',
        users: 'GET /api/v1/users',
        devices: 'GET /api/v1/devices',
        measurements: 'GET /api/v1/measurements',
        ai_status: 'GET /api/v1/ai/status',
      }
    });
  });
}

// ── Error Handler ──
app.use((err, req, res, _next) => {
  console.error('💥 Unhandled Error:', err.message);
  console.error(err.stack);
  res.status(500).json({ detail: err.message || 'Internal Server Error' });
});

// ── Start Server ──
const server = app.listen(PORT, '0.0.0.0', () => {
  const addr = server.address();
  const aiConfigured = aiService.isConfigured();
  const aiModel = aiService.model;
  const aiKeyPreview = aiService.apiKey
    ? `${aiService.apiKey.substring(0, 8)}...${aiService.apiKey.slice(-4)}`
    : '未配置';

  console.log('');
  console.log('='.repeat(60));
  console.log('  🧘 情绪管理与智能坐垫干预系统 - 后端服务');
  console.log('='.repeat(60));
  console.log(`  ✅ 服务已启动!`);
  console.log(`  🌐 监听地址: ${addr.address}:${addr.port}`);
  console.log(`  📡 API 地址: http://0.0.0.0:${addr.port}/api/v1`);
  console.log(`  📁 前端文件: ${hasDistFolder ? '✅ 已加载' : '❌ 未找到'}`);
  console.log('-'.repeat(60));
  console.log(`  🤖 AI 大模型:`);
  console.log(`     状态:  ${aiConfigured ? '✅ 已配置 (真实 API 模式)' : '⚠️ 未配置 (模板 Fallback)'}`);
  console.log(`     Key:   ${aiKeyPreview}`);
  console.log(`     Model: ${aiModel}`);
  console.log('='.repeat(60));
  console.log('');
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
