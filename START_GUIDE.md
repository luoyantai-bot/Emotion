# 🧘 情绪管理与智能坐垫干预系统 - 部署运行指南

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    用户浏览器                             │
│  ┌──────────────┐              ┌───────────────────┐    │
│  │  H5 用户端    │              │  SaaS 管理后台     │    │
│  │  (React)      │              │  (React)          │    │
│  └──────┬───────┘              └────────┬──────────┘    │
│         │          HTTP/JSON             │               │
│         └──────────────┬────────────────┘               │
└────────────────────────┼────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │  Node.js 后端       │
              │  Express + API      │
              │  ┌────────────────┐ │
              │  │ 算法引擎       │ │  ← MockAlgorithmService
              │  │ AI报告生成     │ │  ← 模拟硅基流动API
              │  │ 干预规则引擎   │ │  ← InterventionEngine
              │  │ 内存数据库     │ │  ← 预置种子数据
              │  └────────────────┘ │
              │  Port: 8000         │
              └─────────────────────┘
```

---

## 🚀 快速开始

### 方式 A: 仅运行前端 (Mock模式，无需后端)

```bash
# 安装依赖
npm install

# 开发模式
npm run dev
# 访问 http://localhost:5173

# 或构建后预览
npm run build
npm run preview
# 访问 http://localhost:4173
```

此模式下所有数据由浏览器内的 Mock 服务模拟生成，无需任何后端。

---

### 方式 B: 前后端分离运行 (推荐开发模式)

#### 1. 启动后端

```bash
node server/index.js
```

你会看到:
```
╔══════════════════════════════════════════════════════════╗
║   🧘 情绪管理与智能坐垫干预系统 - 后端服务              ║
║   Server:  http://localhost:8000                         ║
║   API:     http://localhost:8000/api/v1                   ║
╚══════════════════════════════════════════════════════════╝
```

#### 2. 验证后端

```bash
# 健康检查
curl http://localhost:8000/api/v1/health

# 获取商家列表
curl http://localhost:8000/api/v1/tenants

# 获取用户列表
curl "http://localhost:8000/api/v1/users?tenant_id=T001"

# 获取检测报告
curl http://localhost:8000/api/v1/measurements/MR-001/report

# 测试算法引擎
curl -X POST http://localhost:8000/api/v1/algorithm/test \
  -H "Content-Type: application/json" \
  -d '{"duration_minutes": 5, "scenario": "stressed", "seed": 42}'
```

#### 3. 启动前端 (连接真实后端)

创建 `.env` 文件:
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_API_MODE=live
```

然后启动前端:
```bash
npm run dev
```

前端右下角将显示 "🟢 Live" 标识，表示已连接后端。

---

### 方式 C: 全栈一体运行 (生产模式)

```bash
# 1. 构建前端
npm run build

# 2. 启动后端 (自动托管前端静态文件)
node server/index.js

# 3. 访问 http://localhost:8000
# 后端同时提供 API 和前端页面
```

---

## 📡 API 端点一览

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/health` | 健康检查 |
| `GET` | `/api/v1/tenants` | 商家列表 |
| `GET` | `/api/v1/tenants/:id` | 商家详情 |
| `GET` | `/api/v1/users?tenant_id=` | 用户列表(分页) |
| `GET` | `/api/v1/users/:id` | 用户详情 |
| `POST` | `/api/v1/users` | 创建用户 |
| `GET` | `/api/v1/users/by-tag?tenant_id=&tag=` | 按标签查用户 |
| `GET` | `/api/v1/devices?tenant_id=` | 设备列表 |
| `POST` | `/api/v1/devices/bind` | 绑定设备 |
| `GET` | `/api/v1/measurements?tenant_id=` | 检测列表(分页) |
| `GET` | `/api/v1/measurements/user/:userId` | 用户检测列表 |
| `GET` | `/api/v1/measurements/:id/report` | 检测报告详情 |
| `POST` | `/api/v1/measurements/start` | 开始检测 |
| `POST` | `/api/v1/measurements/stop` | 结束检测(触发算法+AI+干预) |
| `GET` | `/api/v1/rules?tenant_id=` | 干预规则列表 |
| `POST` | `/api/v1/rules` | 创建规则 |
| `PATCH` | `/api/v1/rules/:id` | 更新规则 |
| `DELETE` | `/api/v1/rules/:id` | 删除规则 |
| `GET` | `/api/v1/logs?tenant_id=` | 干预日志(分页) |
| `POST` | `/api/v1/logs/evaluate` | 手动触发规则评估 |
| `GET` | `/api/v1/activities?tenant_id=` | 活动列表 |
| `POST` | `/api/v1/activities` | 创建活动 |
| `GET` | `/api/v1/dashboard/stats?tenant_id=` | 数据大盘 |
| `POST` | `/api/v1/algorithm/test` | 算法测试 |

---

## 🔄 核心业务流程 (后端执行)

当调用 `POST /api/v1/measurements/stop` 时，后端自动执行:

```
1. 📡 模拟 MQTT 数据采集 (生成原始心率/呼吸/坐姿数据)
   ↓
2. 🧮 运行算法引擎 (计算 HRV、压力、自主神经、中医体质)
   ↓
3. 🤖 调用 AI 大模型 (生成 Markdown 格式健康报告)
   ↓
4. 🔍 运行干预规则引擎 (匹配规则 → 生成 IoT 控制日志)
   ↓
5. 💾 保存到数据库 (检测记录 + 干预日志)
```

每一步都在后端控制台打印详细日志，便于调试。

---

## 🔧 进阶: 接入真实硅基流动 API

在 `server/services.js` 的 `generateAIAnalysis` 函数中，
将模拟逻辑替换为真实 API 调用:

```javascript
async function generateAIAnalysis(metrics, durationMinutes) {
  const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `用户数据: ${JSON.stringify(metrics)}` },
      ],
    }),
  });
  const data = await response.json();
  return data.choices[0].message.content;
}
```

---

## 🔧 进阶: 迁移到 PostgreSQL

当需要持久化存储时，替换 `server/database.js`:

1. 安装: `npm install pg knex`
2. 创建数据库表 (参考 `BACKEND_API_CONTRACT.md` 中的 SQL)
3. 将内存数组操作替换为 SQL 查询

---

## 📁 项目文件结构

```
├── server/                      # ← 后端 (Node.js)
│   ├── index.js                 # Express 入口
│   ├── routes.js                # 23个 API 端点
│   ├── services.js              # 算法引擎 + AI + 干预引擎
│   └── database.js              # 内存数据库 + 种子数据
│
├── src/                         # ← 前端 (React + Vite)
│   ├── api/
│   │   ├── types.ts             # TypeScript 类型 (与后端 1:1 对应)
│   │   ├── client.ts            # HTTP 客户端
│   │   └── index.ts             # 统一 API 入口 (Mock/Live 自动切换)
│   ├── services/                # 前端 Mock 服务 (Mock模式时使用)
│   ├── pages/                   # 页面组件
│   └── App.tsx                  # 路由入口
│
├── .env.example                 # 环境变量模板
├── START_GUIDE.md               # 本文档
└── BACKEND_API_CONTRACT.md      # 后端 API 契约文档
```
