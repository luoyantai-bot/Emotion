/**
 * ============================================================
 * 🧘 情绪管理系统 - Node.js 后端
 * ============================================================
 * 
 * 启动方式:  node server/index.cjs
 * 默认端口:  8000
 * API 前缀:  /api/v1
 */

// 加载 .env 文件
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
  // ignore
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const { SiliconFlowAIService } = require('./services.cjs');

const app = express();
const PORT = process.env.PORT || 8000;

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
app.use(express.static(distPath));

// SPA fallback — 非 API 请求都返回 index.html
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.url.startsWith('/api/')) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    next();
  }
});

// ── Error Handler ──
app.use((err, req, res, _next) => {
  console.error('💥 Unhandled Error:', err.message);
  res.status(500).json({ detail: err.message || 'Internal Server Error' });
});

// ── Start Server ──
app.listen(PORT, () => {
  const aiConfigured = aiService.isConfigured();
  const aiModel = aiService.model;
  const aiKeyPreview = aiService.apiKey
    ? `${aiService.apiKey.substring(0, 8)}...${aiService.apiKey.slice(-4)}`
    : '未配置';

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🧘 情绪管理与智能坐垫干预系统 - 后端服务                  ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║   Server:  http://localhost:${PORT}                           ║
║   API:     http://localhost:${PORT}/api/v1                    ║
║   Health:  http://localhost:${PORT}/api/v1/health             ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║   🤖 AI 大模型配置:                                         ║
║   状态:    ${aiConfigured ? '✅ 已配置 (真实 API 模式)      ' : '⚠️  未配置 (Fallback 模板模式)  '}║
║   API Key: ${(aiKeyPreview).padEnd(45)}║
║   Model:   ${aiModel.padEnd(45)}║
║                                                              ║${!aiConfigured ? `
║   💡 要启用真实 AI 分析:                                     ║
║   1. 创建 .env 文件:                                         ║
║      SILICONFLOW_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx            ║
║      SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3              ║
║                                                              ║
║   2. 或在管理后台 → 🤖 AI大模型 页面直接配置                ║
║                                                              ║
║   获取密钥: https://cloud.siliconflow.cn/account/ak          ║
║                                                              ║` : ''}
╚══════════════════════════════════════════════════════════════╝
  `);
});
