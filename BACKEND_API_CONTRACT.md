# 🧘 情绪管理与智能坐垫干预系统 — 后端 API 契约文档

> **本文档是前端与后端之间的完整技术契约**。  
> 后端开发者请严格按照此文档实现所有 API，确保前端无缝对接。

---

## 目录

1. [技术栈与项目结构](#1-技术栈与项目结构)
2. [环境配置与启动](#2-环境配置与启动)
3. [数据库 Schema](#3-数据库-schema)
4. [API 通用约定](#4-api-通用约定)
5. [API 端点详细定义](#5-api-端点详细定义)
6. [算法引擎 (MockAlgorithmService)](#6-算法引擎)
7. [AI 大模型接入 (硅基流动)](#7-ai-大模型接入)
8. [干预引擎 (InterventionEngine)](#8-干预引擎)
9. [MQTT 数据接入](#9-mqtt-数据接入)
10. [Docker 部署](#10-docker-部署)

---

## 1. 技术栈与项目结构

```
技术栈:
  - Python 3.11+
  - FastAPI (Web框架)
  - SQLAlchemy 2.0 (ORM)
  - PostgreSQL 15+ (数据库)
  - Redis 7+ (缓存 & MQTT数据缓冲)
  - Pydantic v2 (数据验证)
  - httpx (调用硅基流动API)
  - EMQX / Mosquitto (MQTT Broker, 可选)

项目结构:
backend/
├── main.py                     # FastAPI 入口, CORS, lifespan
├── config.py                   # 环境变量配置
├── database.py                 # SQLAlchemy engine & session
├── models/                     # ORM Models
│   ├── __init__.py
│   ├── tenant.py
│   ├── user.py
│   ├── device.py
│   ├── measurement.py
│   ├── rule.py
│   └── log.py
├── schemas/                    # Pydantic Schemas (对应前端 api/types.ts)
│   ├── __init__.py
│   ├── tenant.py
│   ├── user.py
│   ├── device.py
│   ├── measurement.py
│   ├── rule.py
│   ├── log.py
│   ├── activity.py
│   └── dashboard.py
├── api/                        # API 路由
│   ├── __init__.py
│   ├── tenants.py
│   ├── users.py
│   ├── devices.py
│   ├── measurements.py
│   ├── rules.py
│   ├── logs.py
│   ├── activities.py
│   ├── dashboard.py
│   └── algorithm.py
├── services/                   # 业务逻辑
│   ├── __init__.py
│   ├── algorithm_service.py    # 算法引擎
│   ├── ai_service.py           # 硅基流动 API 调用
│   ├── intervention_engine.py  # 干预规则匹配
│   └── mqtt_service.py         # MQTT 数据接收
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

---

## 2. 环境配置与启动

### 环境变量 (.env)

```env
# 数据库
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/cushion_db

# Redis
REDIS_URL=redis://localhost:6379/0

# 硅基流动 AI API
SILICONFLOW_API_KEY=sk-xxxxxxxxxxxxxxxxxx
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3

# MQTT (可选)
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883

# 服务
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=["http://localhost:5173","http://localhost:4173"]
```

### 启动命令

```bash
# 开发模式
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Docker
docker-compose up -d
```

### requirements.txt

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy[asyncio]==2.0.35
asyncpg==0.29.0
psycopg2-binary==2.9.9
alembic==1.13.0
pydantic==2.9.0
pydantic-settings==2.5.0
redis[hiredis]==5.1.0
httpx==0.27.0
python-dotenv==1.0.1
```

---

## 3. 数据库 Schema

### 3.1 tenants (租户/商家)

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('中医馆', '酒店')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.2 users (用户)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(50) NOT NULL,
    gender VARCHAR(2) NOT NULL CHECK (gender IN ('男', '女')),
    age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
    height DECIMAL(5,1) NOT NULL,  -- cm
    weight DECIMAL(5,1) NOT NULL,  -- kg
    bmi DECIMAL(4,1) GENERATED ALWAYS AS (weight / POWER(height / 100, 2)) STORED,
    latest_stress DECIMAL(5,1),
    latest_score DECIMAL(5,1),
    tag VARCHAR(20) DEFAULT '正常',  -- 正常|轻度压力|中度焦虑|重度焦虑
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_tag ON users(tag);
```

### 3.3 devices (设备)

```sql
CREATE TABLE devices (
    device_id VARCHAR(50) PRIMARY KEY,  -- MAC地址/唯一码
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    status VARCHAR(10) NOT NULL DEFAULT '离线' CHECK (status IN ('在线', '离线', '使用中')),
    model VARCHAR(50) DEFAULT 'CushionPro V2',
    last_heartbeat TIMESTAMP WITH TIME ZONE
);
```

### 3.4 measurement_records (检测记录)

```sql
CREATE TABLE measurement_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    device_id VARCHAR(50) NOT NULL REFERENCES devices(device_id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    raw_data_summary JSONB,      -- 基础统计数据
    derived_metrics JSONB,       -- 算法引擎计算的衍生指标
    hr_timeline JSONB,           -- 心率时间序列 number[]
    br_timeline JSONB,           -- 呼吸时间序列 number[]
    time_labels JSONB,           -- 时间标签 string[]
    ai_analysis TEXT,            -- AI生成的Markdown报告
    algorithm_log JSONB,         -- 算法执行日志
    status VARCHAR(20) DEFAULT 'measuring' CHECK (status IN ('measuring', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_measurements_user ON measurement_records(user_id);
CREATE INDEX idx_measurements_time ON measurement_records(start_time DESC);
```

### 3.5 intervention_rules (干预规则)

```sql
CREATE TABLE intervention_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    metric VARCHAR(30) NOT NULL,    -- 压力敏感度|焦虑指数|HRV|疲劳指数|健康评分|自主神经平衡
    operator VARCHAR(5) NOT NULL CHECK (operator IN ('>', '<', '=', '>=', '<=')),
    value DECIMAL(10,2) NOT NULL,
    device_type VARCHAR(30) NOT NULL,  -- 香薰机|智能灯光|智能音箱
    action VARCHAR(30) NOT NULL,       -- 开启|调暗|播放
    parameter TEXT NOT NULL,            -- 参数描述
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rules_tenant ON intervention_rules(tenant_id);
```

### 3.6 intervention_logs (干预日志)

```sql
CREATE TABLE intervention_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    rule_id UUID NOT NULL REFERENCES intervention_rules(id),
    measurement_id UUID REFERENCES measurement_records(id),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metric_name VARCHAR(30) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    threshold DECIMAL(10,2) NOT NULL,
    operator VARCHAR(5) NOT NULL,
    action_description TEXT NOT NULL,
    device_type VARCHAR(30) NOT NULL,
    status VARCHAR(10) DEFAULT '已执行' CHECK (status IN ('已执行', '待执行', '失败')),
    webhook_response JSONB  -- Webhook调用结果（第一期可为空）
);

CREATE INDEX idx_logs_tenant ON intervention_logs(tenant_id);
CREATE INDEX idx_logs_time ON intervention_logs(triggered_at DESC);
```

### 3.7 activities (活动)

```sql
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    target_tag VARCHAR(20) NOT NULL,
    matched_users INTEGER DEFAULT 0,
    status VARCHAR(10) DEFAULT '草稿' CHECK (status IN ('草稿', '已发布', '已结束')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.8 mqtt_raw_data (MQTT原始数据 - 临时存储)

```sql
-- 实际可使用 Redis 缓冲，如果需要持久化则建此表
CREATE TABLE mqtt_raw_data (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    measurement_id UUID REFERENCES measurement_records(id),
    timestamp BIGINT NOT NULL,
    heart_rate INTEGER NOT NULL,
    breath_rate INTEGER NOT NULL,
    movement_level SMALLINT NOT NULL,
    posture_status SMALLINT NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 按时间分区，定期清理
CREATE INDEX idx_raw_device_time ON mqtt_raw_data(device_id, timestamp);
```

---

## 4. API 通用约定

### Base URL
```
http://localhost:8000/api/v1
```

### CORS
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 通用响应格式

**成功 (200/201)**:
```json
{
  "id": "uuid",
  "name": "...",
  ...
}
```

**分页响应**:
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "total_pages": 5
}
```

**错误 (4xx/5xx)**:
```json
{
  "detail": "错误描述信息",
  "code": "ERROR_CODE"  // 可选
}
```

### 通用 Query 参数
| 参数 | 类型 | 说明 |
|------|------|------|
| `tenant_id` | string | 商家ID (大多数列表接口必填) |
| `page` | int | 页码, 默认 1 |
| `page_size` | int | 每页数量, 默认 20 |

---

## 5. API 端点详细定义

### 5.1 Tenants (租户)

#### `GET /api/v1/tenants`
获取所有租户列表。

**Response 200**: `Tenant[]`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "同仁堂·国贸分店",
    "type": "中医馆",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### `GET /api/v1/tenants/{id}`
获取单个租户。

**Response 200**: `Tenant`  
**Response 404**: `{"detail": "Tenant not found"}`

---

### 5.2 Users (用户)

#### `GET /api/v1/users`
获取用户列表。

| Query 参数 | 必填 | 说明 |
|-----------|------|------|
| `tenant_id` | ✅ | 商家ID |
| `page` | - | 默认 1 |
| `page_size` | - | 默认 20 |

**Response 200**: `PaginatedResponse<User>`
```json
{
  "items": [
    {
      "id": "user-uuid",
      "tenant_id": "tenant-uuid",
      "name": "张三",
      "gender": "男",
      "age": 35,
      "height": 175,
      "weight": 72,
      "bmi": 23.5,
      "latest_stress": 68,
      "latest_score": 72,
      "tag": "中度焦虑",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 8,
  "page": 1,
  "page_size": 20,
  "total_pages": 1
}
```

#### `GET /api/v1/users/{user_id}`
获取单个用户详情。

**Response 200**: `User`

#### `POST /api/v1/users`
创建用户。**后端需自动计算 BMI**。

**Request Body**:
```json
{
  "tenant_id": "tenant-uuid",
  "name": "张三",
  "gender": "男",
  "age": 35,
  "height": 175,
  "weight": 72
}
```

**Response 201**: `User` (含计算好的 bmi)

#### `GET /api/v1/users/by-tag`
按标签筛选用户（活动推送用）。

| Query 参数 | 必填 | 说明 |
|-----------|------|------|
| `tenant_id` | ✅ | 商家ID |
| `tag` | ✅ | 如 "重度焦虑" |

**Response 200**: `User[]`

---

### 5.3 Devices (设备)

#### `GET /api/v1/devices`
获取设备列表。

| Query 参数 | 必填 | 说明 |
|-----------|------|------|
| `tenant_id` | ✅ | 商家ID |

**Response 200**: `Device[]`
```json
[
  {
    "device_id": "Z4U524060082",
    "tenant_id": "tenant-uuid",
    "status": "在线",
    "model": "CushionPro V2",
    "last_heartbeat": "2024-01-15T14:00:00Z"
  }
]
```

#### `POST /api/v1/devices/bind`
绑定设备与用户（开始检测前调用）。

**Request Body**:
```json
{
  "device_id": "Z4U524060082",
  "user_id": "user-uuid"
}
```

**Response 200**: `{"status": "bound"}`

---

### 5.4 Measurements (检测记录) ⭐ 核心

#### `POST /api/v1/measurements/start`
开始一次检测。后端开始缓存该设备的 MQTT 数据。

**Request Body**:
```json
{
  "user_id": "user-uuid",
  "device_id": "Z4U524060082"
}
```

**Response 201**:
```json
{
  "measurement_id": "measurement-uuid",
  "status": "started",
  "message": "检测已开始，请保持坐姿"
}
```

**后端逻辑**:
1. 创建 `measurement_records` 记录, status='measuring'
2. 在 Redis 中为该 measurement_id 创建缓冲 key
3. 将设备状态改为 '使用中'

#### `POST /api/v1/measurements/stop`
结束检测。**触发完整的处理管线**。

**Request Body**:
```json
{
  "measurement_id": "measurement-uuid"
}
```

**Response 200**:
```json
{
  "measurement_id": "measurement-uuid",
  "status": "completed",
  "message": "报告生成完毕",
  "report_ready": true
}
```

若数据不足 5 分钟:
```json
{
  "measurement_id": "measurement-uuid",
  "status": "insufficient_data",
  "message": "有效数据不足5分钟，无法生成报告",
  "report_ready": false
}
```

**后端处理管线** (核心！):
```
1. 从 Redis 读取该 measurement 期间缓存的所有 MQTT 原始数据
2. 调用 AlgorithmService.compute(raw_data) → derived_metrics
3. 调用 AIService.generate_report(derived_metrics) → ai_analysis (Markdown)
4. 更新 measurement_records: 写入 derived_metrics, ai_analysis, timelines
5. 更新 User: latest_stress, latest_score, tag
6. 调用 InterventionEngine.evaluate(derived_metrics, user) → 生成干预日志
7. 将设备状态改回 '在线'
```

#### `GET /api/v1/measurements/user/{user_id}`
获取用户的检测记录列表（摘要）。

**Response 200**: `MeasurementSummary[]`
```json
[
  {
    "id": "measurement-uuid",
    "user_id": "user-uuid",
    "user_name": "张三",
    "device_id": "Z4U524060082",
    "start_time": "2024-01-15 14:00:00",
    "end_time": "2024-01-15 14:30:00",
    "duration_minutes": 30,
    "health_score": 72,
    "stress_sensitivity": 68,
    "primary_constitution": "气郁质"
  }
]
```

#### `GET /api/v1/measurements`
获取商家下所有检测记录（分页）。

| Query 参数 | 必填 | 说明 |
|-----------|------|------|
| `tenant_id` | ✅ | 商家ID |
| `page` | - | 默认 1 |
| `page_size` | - | 默认 20 |

**Response 200**: `PaginatedResponse<MeasurementSummary>`

#### `GET /api/v1/measurements/{measurement_id}/report`
获取检测报告详情（包含完整图表数据和 AI 报告）。

**Response 200**: `MeasurementRecord`
```json
{
  "id": "measurement-uuid",
  "user_id": "user-uuid",
  "user_name": "张三",
  "device_id": "Z4U524060082",
  "start_time": "2024-01-15 14:00:00",
  "end_time": "2024-01-15 14:30:00",
  "duration_minutes": 30,
  "hr_timeline": [72, 74, 73, 75, ...],
  "br_timeline": [16, 15, 17, 16, ...],
  "time_labels": ["00:00", "00:10", "00:20", ...],
  "derived_metrics": {
    "avg_hr": 74.2,
    "avg_br": 16.1,
    "max_hr": 88,
    "min_hr": 65,
    "hrv": 52,
    "stress_sensitivity": 68,
    "autonomic_balance": 2.1,
    "anxiety_level": 55,
    "fatigue_index": 42,
    "health_score": 72,
    "posture_correct_rate": 78,
    "tcm_constitution": {
      "primary": "气郁质",
      "primary_score": 72,
      "secondary": "阴虚质",
      "secondary_score": 58,
      "all_scores": {
        "平和质": 45,
        "气虚质": 38,
        "阳虚质": 32,
        "阴虚质": 58,
        "痰湿质": 28,
        "湿热质": 35,
        "血瘀质": 41,
        "气郁质": 72,
        "特禀质": 22
      }
    }
  },
  "ai_analysis": "### 总体健康状态概述\n\n...(Markdown文本)...",
  "algorithm_log": ["[算法引擎] 收到 1800 条原始数据包", "[Step 1] ...", "..."]
}
```

---

### 5.5 Intervention Rules (干预规则)

#### `GET /api/v1/rules`
获取规则列表。

| Query 参数 | 必填 | 说明 |
|-----------|------|------|
| `tenant_id` | ✅ | 商家ID |

**Response 200**: `InterventionRule[]`
```json
[
  {
    "id": "rule-uuid",
    "tenant_id": "tenant-uuid",
    "metric": "压力敏感度",
    "operator": ">",
    "value": 80,
    "device_type": "香薰机",
    "action": "开启",
    "parameter": "薰衣草精油，强度50%",
    "enabled": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### `POST /api/v1/rules`
创建规则。

**Request Body**:
```json
{
  "tenant_id": "tenant-uuid",
  "metric": "压力敏感度",
  "operator": ">",
  "value": 80,
  "device_type": "香薰机",
  "action": "开启",
  "parameter": "薰衣草精油，强度50%",
  "enabled": true
}
```

**字段约束**:
- `metric` 枚举: `压力敏感度` | `焦虑指数` | `HRV` | `疲劳指数` | `健康评分` | `自主神经平衡`
- `operator` 枚举: `>` | `<` | `=` | `>=` | `<=`
- `device_type` 枚举: `香薰机` | `智能灯光` | `智能音箱`
- `action` 枚举: `开启` | `调暗` | `播放`

**Response 201**: `InterventionRule`

#### `PATCH /api/v1/rules/{rule_id}`
更新规则（部分更新）。

**Request Body** (所有字段可选):
```json
{
  "enabled": false
}
```

**Response 200**: `InterventionRule`

#### `DELETE /api/v1/rules/{rule_id}`
删除规则。

**Response 204**: No Content

---

### 5.6 Intervention Logs (干预日志)

#### `GET /api/v1/logs`
获取干预日志（分页）。

| Query 参数 | 必填 | 说明 |
|-----------|------|------|
| `tenant_id` | ✅ | 商家ID |
| `page` | - | 默认 1 |
| `page_size` | - | 默认 50 |

**Response 200**: `PaginatedResponse<InterventionLog>`
```json
{
  "items": [
    {
      "id": "log-uuid",
      "tenant_id": "tenant-uuid",
      "user_id": "user-uuid",
      "user_name": "李芳",
      "rule_id": "rule-uuid",
      "triggered_at": "2024-01-15 14:32:00",
      "metric_name": "压力敏感度",
      "metric_value": 82,
      "threshold": 80,
      "operator": ">",
      "action_description": "香薰机：开启薰衣草精油，强度50%",
      "device_type": "香薰机",
      "status": "已执行"
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 50,
  "total_pages": 1
}
```

#### `POST /api/v1/logs/evaluate`
手动触发干预评估（也可由 stop measurement 自动触发）。

**Request Body**:
```json
{
  "metrics": { ... },  // DerivedMetrics JSON
  "user_id": "user-uuid",
  "user_name": "李芳"
}
```

**Response 200**: `InterventionLog[]` (被触发的日志列表)

---

### 5.7 Activities (活动推送)

#### `GET /api/v1/activities`
获取活动列表。

| Query 参数 | 必填 | 说明 |
|-----------|------|------|
| `tenant_id` | ✅ | 商家ID |

**Response 200**: `Activity[]`

#### `POST /api/v1/activities`
创建活动。**后端自动统计匹配用户数量**。

**Request Body**:
```json
{
  "tenant_id": "tenant-uuid",
  "title": "周五颂钵音疗体验",
  "description": "由资深音疗师带领...",
  "date": "2024-01-19 19:00",
  "target_tag": "重度焦虑"
}
```

**后端逻辑**: 查询 `users` 表中 `tag = target_tag AND tenant_id = tenant_id` 的用户数量，写入 `matched_users`。

**Response 201**: `Activity`

---

### 5.8 Dashboard (数据大盘)

#### `GET /api/v1/dashboard/stats`
获取数据大盘统计。

| Query 参数 | 必填 | 说明 |
|-----------|------|------|
| `tenant_id` | ✅ | 商家ID |

**Response 200**: `DashboardStats`
```json
{
  "today_measurements": 47,
  "active_users": 156,
  "abnormal_count": 12,
  "abnormal_ratio": 25.5,
  "avg_stress": 58,
  "avg_health_score": 71,
  "weekly_measurements": [32, 28, 45, 38, 51, 47, 42],
  "weekly_labels": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
  "emotion_distribution": [
    {"name": "正常", "value": 35, "color": "#10B981"},
    {"name": "轻度压力", "value": 28, "color": "#F59E0B"},
    {"name": "中度焦虑", "value": 22, "color": "#F97316"},
    {"name": "重度焦虑", "value": 15, "color": "#EF4444"}
  ],
  "assessment_data": {
    "users": ["李芳", "刘洋", "赵敏"],
    "before": [82, 88, 71],
    "after": [64, 72, 58]
  }
}
```

**后端计算逻辑**:
- `today_measurements`: 今日 `measurement_records` count
- `active_users`: 最近30天有检测记录的用户 distinct count
- `abnormal_count`: 今日 `latest_stress > 70` 的用户数
- `abnormal_ratio`: `abnormal_count / today_measurements * 100`
- `avg_stress`: 今日所有检测的平均压力指数
- `avg_health_score`: 今日所有检测的平均健康评分
- `weekly_measurements`: 过去7天每天的检测次数
- `emotion_distribution`: 按 `tag` 统计用户分布
- `assessment_data`: 选取最近有干预的用户，对比干预前后的压力值

---

### 5.9 Algorithm Test (调试端点)

#### `POST /api/v1/algorithm/test`
运行算法测试（用于验证算法引擎）。

**Request Body**:
```json
{
  "duration_minutes": 5,
  "scenario": "stressed",
  "seed": 42
}
```

**Response 200**: `AlgorithmTestResult`
```json
{
  "raw_data_summary": {
    "total_samples": 300,
    "duration_seconds": 300,
    "duration_minutes": 5,
    "start_time": 1716543210,
    "end_time": 1716543510
  },
  "derived_metrics": { ... },
  "hr_timeline": [...],
  "br_timeline": [...],
  "time_labels": [...],
  "algorithm_log": [...]
}
```

---

## 6. 算法引擎

### AlgorithmService (Python 实现)

```python
"""
algorithm_service.py
严格按照 PRD 第五节实现算法逻辑。
"""
import random
from typing import List, Dict, Any

class AlgorithmService:
    def __init__(self):
        self.log: List[str] = []

    def compute(self, raw_packets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        接收 MQTT 原始数据包列表，计算衍生指标。
        
        输入: List[{device_id, timestamp, heart_rate, breath_rate, movement_level, posture_status}]
        输出: {raw_data_summary, derived_metrics, hr_timeline, br_timeline, time_labels, algorithm_log}
        """
        self.log = []
        self.log.append(f"[算法引擎] 收到 {len(raw_packets)} 条原始数据包")

        # Step 1: 基础聚合
        heart_rates = [p['heart_rate'] for p in raw_packets]
        breath_rates = [p['breath_rate'] for p in raw_packets]
        movement_levels = [p['movement_level'] for p in raw_packets]
        posture_statuses = [p['posture_status'] for p in raw_packets]

        avg_hr = round(sum(heart_rates) / len(heart_rates), 1)
        avg_br = round(sum(breath_rates) / len(breath_rates), 1)
        max_hr = max(heart_rates)
        min_hr = min(heart_rates)
        avg_movement = sum(movement_levels) / len(movement_levels)
        posture_correct_rate = round(sum(posture_statuses) / len(posture_statuses) * 100)

        # Step 2: HRV 心率变异性
        # PRD: 随机基数50。avg_hr > 85 且 movement高 → HRV低(20-40), 否则正常(40-80)
        if avg_hr > 85 and avg_movement > 1:
            hrv = random.randint(20, 40)
        else:
            hrv = random.randint(40, 80)

        # Step 3: 压力敏感度
        # PRD: (avg_hr/100*0.5) + (movement_avg/2*0.5) → 百分比
        stress_raw = (avg_hr / 100) * 0.5 + (avg_movement / 2) * 0.5
        stress_sensitivity = max(15, min(95, round(stress_raw * 100)))

        # Step 4: 自主神经平衡
        # PRD: 正常值1.5, 压力高→交感神经(>2.5)
        if stress_sensitivity > 70:
            autonomic_balance = round(2.5 + random.random() * 2, 1)
        elif stress_sensitivity > 50:
            autonomic_balance = round(1.5 + random.random() * 1.5, 1)
        else:
            autonomic_balance = round(0.8 + random.random() * 1.2, 1)

        # Step 5: 中医体质推演
        constitutions = ['平和质', '气虚质', '阳虚质', '阴虚质', '痰湿质', '湿热质', '血瘀质', '气郁质', '特禀质']
        scores = {c: random.randint(20, 60) for c in constitutions}

        # PRD: 呼吸浅快 + 压力高 + 心率高 → 阴虚质
        if avg_br > 17 and stress_sensitivity > 55 and avg_hr > 75:
            scores['阴虚质'] = random.randint(65, 85)

        # PRD: 重心常偏移 → 血瘀质
        if posture_correct_rate < 70:
            scores['血瘀质'] = random.randint(55, 75)

        # 压力高 → 气郁质
        if stress_sensitivity > 50:
            scores['气郁质'] = random.randint(50, 75)

        sorted_constitutions = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        # Step 6: 综合评分
        health_score = max(35, min(92, round(
            100 - stress_sensitivity * 0.25 - (80 - min(hrv, 80)) * 0.2
            - (1 - posture_correct_rate / 100) * 15 - avg_movement * 4
        )))
        anxiety_level = max(15, min(95, round(stress_sensitivity * 0.8 + (random.random() - 0.5) * 20)))
        fatigue_index = max(15, min(90, round(40 + (80 - min(hrv, 80)) * 0.3 + (random.random() - 0.5) * 15)))

        # 时间序列采样（每10秒取一个点）
        sample_interval = max(1, len(raw_packets) // 180)
        hr_timeline = [raw_packets[i]['heart_rate'] for i in range(0, len(raw_packets), sample_interval)]
        br_timeline = [raw_packets[i]['breath_rate'] for i in range(0, len(raw_packets), sample_interval)]
        start_ts = raw_packets[0]['timestamp']
        time_labels = [
            f"{(raw_packets[i]['timestamp'] - start_ts) // 60:02d}:{(raw_packets[i]['timestamp'] - start_ts) % 60:02d}"
            for i in range(0, len(raw_packets), sample_interval)
        ]

        return {
            "raw_data_summary": {
                "total_samples": len(raw_packets),
                "duration_seconds": raw_packets[-1]['timestamp'] - raw_packets[0]['timestamp'],
                "duration_minutes": max(1, (raw_packets[-1]['timestamp'] - raw_packets[0]['timestamp']) // 60),
                "start_time": raw_packets[0]['timestamp'],
                "end_time": raw_packets[-1]['timestamp'],
            },
            "derived_metrics": {
                "avg_hr": avg_hr,
                "avg_br": avg_br,
                "max_hr": max_hr,
                "min_hr": min_hr,
                "hrv": hrv,
                "stress_sensitivity": stress_sensitivity,
                "autonomic_balance": autonomic_balance,
                "anxiety_level": anxiety_level,
                "fatigue_index": fatigue_index,
                "health_score": health_score,
                "posture_correct_rate": posture_correct_rate,
                "tcm_constitution": {
                    "primary": sorted_constitutions[0][0],
                    "primary_score": sorted_constitutions[0][1],
                    "secondary": sorted_constitutions[1][0],
                    "secondary_score": sorted_constitutions[1][1],
                    "all_scores": scores,
                },
            },
            "hr_timeline": hr_timeline,
            "br_timeline": br_timeline,
            "time_labels": time_labels,
            "algorithm_log": self.log,
        }
```

---

## 7. AI 大模型接入

### AIService (Python 实现)

```python
"""
ai_service.py
调用硅基流动 API 生成健康分析报告。
"""
import httpx
import json
from config import settings

SYSTEM_PROMPT = """你是一位融合了中医体质学与现代心理生理学的主治医师。请根据以下智能坐垫采集到的用户生理指标JSON，生成一份严谨、有同理心的健康综合分析与建议。
必须包含以下四个模块结构返回（使用Markdown）：

### 总体健康状态概述
[分析用户整体情况]

### 各板块详细分析
[结合HRV分析心脏、结合自主神经分析情绪、结合体质评估中医倾向]

### 风险指标预警
[列出重度/中度/轻度风险项]

### 个性化健康建议
[分为短期1-3个月调整、长期6-12个月干预，并给出饮食和作息建议]"""


class AIService:
    def __init__(self):
        self.api_key = settings.SILICONFLOW_API_KEY
        self.base_url = settings.SILICONFLOW_BASE_URL
        self.model = settings.SILICONFLOW_MODEL

    async def generate_report(self, derived_metrics: dict) -> str:
        """
        调用硅基流动大模型生成健康分析报告。
        
        Args:
            derived_metrics: AlgorithmService 计算出的衍生指标 JSON
        
        Returns:
            Markdown 格式的健康分析报告文本
        """
        user_data = json.dumps(derived_metrics, ensure_ascii=False, indent=2)
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": f"用户数据: {user_data}"},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000,
                },
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
```

**硅基流动 API 参考**:
- 注册地址: https://siliconflow.cn
- API 文档: https://docs.siliconflow.cn
- 推荐模型: `deepseek-ai/DeepSeek-V3` 或 `Qwen/Qwen2.5-72B-Instruct`
- 定价: 按 token 计费，约 ¥0.01-0.05/次报告

---

## 8. 干预引擎

### InterventionEngine (Python 实现)

```python
"""
intervention_engine.py
规则匹配引擎：当新报告生成时自动评估并生成干预日志。
"""
import logging
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from models.rule import InterventionRule
from models.log import InterventionLog

logger = logging.getLogger(__name__)

METRIC_MAP = {
    '压力敏感度': 'stress_sensitivity',
    '焦虑指数': 'anxiety_level',
    'HRV': 'hrv',
    '疲劳指数': 'fatigue_index',
    '健康评分': 'health_score',
    '自主神经平衡': 'autonomic_balance',
}

def compare(actual: float, operator: str, threshold: float) -> bool:
    ops = {'>': actual > threshold, '<': actual < threshold,
           '>=': actual >= threshold, '<=': actual <= threshold,
           '=': actual == threshold}
    return ops.get(operator, False)


class InterventionEngine:
    async def evaluate(
        self,
        db: AsyncSession,
        tenant_id: str,
        user_id: str,
        user_name: str,
        measurement_id: str,
        derived_metrics: dict,
    ) -> List[InterventionLog]:
        """
        评估所有启用的规则，匹配则生成干预日志。
        
        此方法由 measurements.stop() 自动调用。
        """
        # 1. 查询该商家所有启用的规则
        rules = await db.execute(
            select(InterventionRule)
            .where(InterventionRule.tenant_id == tenant_id)
            .where(InterventionRule.enabled == True)
        )
        rules = rules.scalars().all()

        triggered_logs = []

        logger.info(f"🔔 开始规则匹配 - 用户: {user_name}, 规则数: {len(rules)}")

        for rule in rules:
            field_name = METRIC_MAP.get(rule.metric)
            if not field_name:
                continue

            actual_value = derived_metrics.get(field_name)
            if actual_value is None:
                continue

            matched = compare(actual_value, rule.operator, rule.value)

            if matched:
                log = InterventionLog(
                    tenant_id=tenant_id,
                    user_id=user_id,
                    rule_id=rule.id,
                    measurement_id=measurement_id,
                    metric_name=rule.metric,
                    metric_value=actual_value,
                    threshold=rule.value,
                    operator=rule.operator,
                    action_description=f"{rule.device_type}：{rule.action}{rule.parameter}",
                    device_type=rule.device_type,
                    status='已执行',
                )
                db.add(log)
                triggered_logs.append(log)

                logger.info(f"  ✅ 规则触发: {rule.metric}({actual_value}) {rule.operator} {rule.value}")
                logger.info(f"     动作: {log.action_description}")

                # TODO 第二期: 调用 Webhook 发送实际控制指令
                # await self._send_webhook(rule, log)
            else:
                logger.debug(f"  ❌ 规则未触发: {rule.metric}({actual_value}) {rule.operator} {rule.value}")

        await db.commit()
        logger.info(f"🔔 匹配完成，触发 {len(triggered_logs)} 条干预")

        return triggered_logs
```

---

## 9. MQTT 数据接入

### 方案 A: Redis 缓冲 (推荐)

```python
"""
mqtt_service.py
接收 MQTT 数据并缓存到 Redis。
"""
import json
import redis.asyncio as redis
from config import settings

class MQTTDataBuffer:
    def __init__(self):
        self.redis = redis.from_url(settings.REDIS_URL)

    async def buffer_data(self, device_id: str, measurement_id: str, payload: dict):
        """将MQTT数据点追加到Redis列表"""
        key = f"mqtt:measurement:{measurement_id}"
        await self.redis.rpush(key, json.dumps(payload))
        # 设置24小时过期
        await self.redis.expire(key, 86400)

    async def get_buffered_data(self, measurement_id: str) -> list:
        """读取缓冲的所有数据点"""
        key = f"mqtt:measurement:{measurement_id}"
        data = await self.redis.lrange(key, 0, -1)
        return [json.loads(d) for d in data]

    async def clear_buffer(self, measurement_id: str):
        """清除缓冲"""
        key = f"mqtt:measurement:{measurement_id}"
        await self.redis.delete(key)
```

### 方案 B: 开发期 Mock API (无需MQTT)

如果开发期不想搭建 MQTT Broker，可以提供一个 REST 端点模拟数据上报：

```
POST /api/v1/mqtt/simulate
{
  "device_id": "Z4U524060082",
  "measurement_id": "uuid",
  "heart_rate": 75,
  "breath_rate": 16,
  "movement_level": 1,
  "posture_status": 1
}
```

---

## 10. Docker 部署

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: cushion_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:password@postgres:5432/cushion_db
      REDIS_URL: redis://redis:6379/0
      SILICONFLOW_API_KEY: ${SILICONFLOW_API_KEY}
      SILICONFLOW_BASE_URL: https://api.siliconflow.cn/v1
      SILICONFLOW_MODEL: deepseek-ai/DeepSeek-V3
      CORS_ORIGINS: '["http://localhost:5173","http://localhost:4173","http://localhost:3000"]'
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      VITE_API_BASE_URL: http://localhost:8000/api/v1
      VITE_API_MODE: live

  # 可选: MQTT Broker
  emqx:
    image: emqx/emqx:5.5
    ports:
      - "1883:1883"
      - "18083:18083"  # Dashboard

volumes:
  pgdata:
```

### 部署命令

```bash
# 开发环境
docker-compose up -d postgres redis
cd backend && uvicorn main:app --reload
cd frontend && npm run dev

# 生产环境
docker-compose up -d

# 前端构建后部署
cd frontend && npm run build
# dist/ 目录用 Nginx 托管
```

---

## 附录: 前端对接清单

前端已创建完整的 API 层 (`src/api/`)，切换到真实后端只需：

1. 创建 `.env` 文件:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_API_MODE=live
```

2. 所有 API 调用自动切换为 HTTP 请求，无需改代码。

3. 前端 API 层文件结构:
```
src/api/
├── types.ts    # TypeScript 类型 (与后端 Pydantic 1:1 对应)
├── client.ts   # HTTP 客户端 (fetch封装)
└── index.ts    # 所有端点函数 (mock/live 自动切换)
```

4. 页面调用方式:
```typescript
import { api } from './api';

// 获取用户列表
const { items } = await api.users.list('T001');

// 获取检测报告
const report = await api.measurements.getReport('MR-001');

// 创建干预规则
const rule = await api.rules.create({...});

// 触发干预评估
const logs = await api.logs.evaluate(metrics, userId, userName);
```
