# 🧘 情绪管理与智能坐垫干预系统 - 启动与部署指南

## 一、本地运行

### 方式 A：纯前端（Mock模式，无需后端）
```bash
npm run build
npx serve dist          # 或用任何静态文件服务器
# 打开 http://localhost:3000
```
> 适合UI演示，所有数据为模拟数据，AI报告为模板生成。

### 方式 B：全栈运行（前端 + 后端）
```bash
# 1. 安装依赖
npm install

# 2. (可选) 配置 AI 密钥
cp .env.example .env
# 编辑 .env，填入:
#   SILICONFLOW_API_KEY=sk-你的密钥
#   SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3

# 3. 构建前端
npm run build

# 4. 启动全栈服务
node server/index.cjs

# 5. 访问 http://localhost:8000
```

### 方式 C：前后端分离开发
```bash
# 终端1：启动后端
node server/index.cjs

# 终端2：创建前端环境变量后启动
echo "VITE_API_BASE_URL=http://localhost:8000/api/v1" > .env.development
echo "VITE_API_MODE=live" >> .env.development
npm run dev

# 前端 http://localhost:5173 → 调用后端 http://localhost:8000
```

---

## 二、AI 报告配置

### 获取硅基流动 API Key
1. 访问 https://cloud.siliconflow.cn
2. 注册/登录 → 个人中心 → API密钥
3. 创建新密钥，复制 `sk-xxxxxxxxxx`

### 配置方式（三选一）

**方式1：`.env` 文件（推荐）**
```env
SILICONFLOW_API_KEY=sk-你的密钥
SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3
```

**方式2：命令行环境变量**
```bash
SILICONFLOW_API_KEY=sk-xxx node server/index.cjs
```

**方式3：运行时通过管理后台配置**
进入 SaaS后台 → 🤖 AI大模型 → 输入Key → 保存 → 测试连接

### 支持的模型
| 模型ID | 说明 |
|--------|------|
| `deepseek-ai/DeepSeek-V3` | 综合能力强，性价比高（推荐） |
| `deepseek-ai/DeepSeek-R1` | 推理增强型，分析更深入 |
| `Qwen/Qwen2.5-72B-Instruct` | 阿里通义千问，中文能力优秀 |
| `Pro/Qwen/Qwen2.5-7B-Instruct` | 轻量级，响应快速 |
| `THUDM/glm-4-9b-chat` | 清华智谱 |

### 验证 AI 是否真实调用
启动后端后，在 H5 端完成一次完整检测，观察终端输出：
```
🤖 调用硅基流动 API (真实请求)              ← 看到这行说明真实调用了
║  Endpoint: https://api.siliconflow.cn/v1/chat/completions
║  Model:    deepseek-ai/DeepSeek-V3
║  ✅ API 响应成功! (2345ms)                ← 成功！
║  Token 用量: prompt=856, completion=1024, total=1880
```

如果看到的是：
```
🤖 AI 报告生成 (Fallback 模板模式)          ← 这说明没有配 API Key
⚠️  未检测到 SILICONFLOW_API_KEY
```

---

## 三、公网部署

### 方案 A：云服务器部署（推荐）

适用于：阿里云 ECS / 腾讯云 CVM / AWS EC2 等

```bash
# 1. 购买一台云服务器（推荐 2核4G, Ubuntu 22.04）

# 2. SSH 登录服务器
ssh root@你的服务器IP

# 3. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. 上传项目（或 git clone）
scp -r ./你的项目文件夹 root@IP:/opt/cushion-app
# 或
git clone https://你的仓库.git /opt/cushion-app

# 5. 安装依赖 & 构建
cd /opt/cushion-app
npm install
npm run build

# 6. 配置 AI 密钥
cat > .env << EOF
SILICONFLOW_API_KEY=sk-你的密钥
SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3
PORT=8000
EOF

# 7. 使用 PM2 守护进程运行（推荐）
npm install -g pm2
pm2 start server/index.cjs --name cushion-app
pm2 save
pm2 startup    # 设置开机自启

# 8. 访问
# http://你的服务器IP:8000

# 9. (可选) 配置 Nginx 反向代理 + HTTPS
sudo apt install nginx certbot python3-certbot-nginx
```

**Nginx 配置示例** (`/etc/nginx/sites-available/cushion`)：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/cushion /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 配置 HTTPS（免费SSL证书）
sudo certbot --nginx -d your-domain.com
```

### 方案 B：Docker 部署

创建 `Dockerfile`：
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 8000
CMD ["node", "server/index.cjs"]
```

```bash
# 构建镜像
docker build -t cushion-app .

# 运行容器
docker run -d \
  -p 8000:8000 \
  -e SILICONFLOW_API_KEY=sk-你的密钥 \
  -e SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3 \
  --name cushion-app \
  --restart always \
  cushion-app

# 访问 http://你的服务器IP:8000
```

### 方案 C：Serverless 平台（最简单）

**Railway.app（推荐，免费额度）：**
1. Fork 项目到 GitHub
2. 登录 https://railway.app
3. New Project → Deploy from GitHub repo
4. 设置环境变量：
   - `SILICONFLOW_API_KEY` = 你的密钥
   - `SILICONFLOW_MODEL` = deepseek-ai/DeepSeek-V3
   - `PORT` = 8000
5. 自动部署，获得公网URL

**Render.com：**
1. New Web Service → 连接 GitHub 仓库
2. Build Command: `npm install && npm run build`
3. Start Command: `node server/index.cjs`
4. 添加环境变量
5. 部署

---

## 四、安全提示

1. **API Key 安全**：`.env` 文件不要提交到 Git，已在 `.gitignore` 中排除
2. **CORS**：生产环境应限制 `origin`，修改 `server/index.cjs` 中的 CORS 配置
3. **HTTPS**：生产环境必须启用 HTTPS，否则浏览器会阻止某些功能
4. **防火墙**：云服务器记得在安全组中开放 80/443 端口

---

## 五、数据流验证

完整数据流（全部走后端）：

```
用户扫码 → H5注册页(填写信息)
           ↓ POST /api/v1/users
         后端创建用户 → 返回 user_id
           ↓
         H5检测页(实时波形)
           ↓ POST /api/v1/measurements/start
         后端创建待处理检测记录
           ↓
         用户点击"生成报告"
           ↓ POST /api/v1/measurements/stop
         后端执行:
           ├── 1. 生成模拟MQTT数据
           ├── 2. MockAlgorithmService 计算衍生指标
           ├── 3. SiliconFlowAIService 调用真实AI API ← 需要API Key
           ├── 4. InterventionEngine 规则匹配
           └── 5. 保存完整报告到数据库
           ↓ 返回 { measurement_id, ai_source }
         H5报告页
           ↓ GET /api/v1/measurements/{id}/report
         后端返回完整报告数据（含AI分析文本）
           ↓
         前端渲染图表 + AI报告
```
