/**
 * ============================================================
 * API Routes - 所有 REST 端点
 * ============================================================
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('./database.cjs');
const {
  MockAlgorithmService,
  generateMockRawData,
  generateFallbackReport,
  InterventionEngine,
} = require('./services.cjs');

const router = express.Router();
const interventionEngine = new InterventionEngine();

// ============================================================
// Helpers
// ============================================================

function toSummary(record) {
  return {
    id: record.id,
    user_id: record.user_id,
    user_name: record.user_name,
    device_id: record.device_id,
    start_time: record.start_time,
    end_time: record.end_time,
    duration_minutes: record.duration_minutes,
    health_score: record.derived_metrics ? record.derived_metrics.health_score : 0,
    stress_sensitivity: record.derived_metrics ? record.derived_metrics.stress_sensitivity : 0,
    primary_constitution: record.derived_metrics ? record.derived_metrics.tcm_constitution.primary : '',
  };
}

function paginate(arr, page, pageSize) {
  const total = arr.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const items = arr.slice(start, start + pageSize);
  return { items, total, page, page_size: pageSize, total_pages: totalPages };
}

// ============================================================
// Tenants
// ============================================================

router.get('/tenants', (req, res) => {
  res.json(db.tenants);
});

router.get('/tenants/:id', (req, res) => {
  const tenant = db.tenants.find(t => t.id === req.params.id);
  if (!tenant) return res.status(404).json({ detail: 'Tenant not found' });
  res.json(tenant);
});

// ============================================================
// Users
// ============================================================

router.get('/users/by-tag', (req, res) => {
  const { tenant_id, tag } = req.query;
  const users = db.users.filter(u => u.tenant_id === tenant_id && u.tag === tag);
  res.json(users);
});

router.get('/users', (req, res) => {
  const { tenant_id, page = 1, page_size = 20 } = req.query;
  const filtered = db.users.filter(u => u.tenant_id === tenant_id);
  res.json(paginate(filtered, parseInt(page), parseInt(page_size)));
});

router.get('/users/:id', (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ detail: 'User not found' });
  res.json(user);
});

router.post('/users', (req, res) => {
  const { tenant_id, name, gender, age, height, weight } = req.body;
  const bmi = Math.round(weight / ((height / 100) ** 2) * 10) / 10;
  const newUser = {
    id: `U${String(db.users.length + 100).padStart(3, '0')}`,
    tenant_id, name, gender, age, height, weight, bmi,
    latest_stress: null, latest_score: null, tag: '正常',
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
  db.users.push(newUser);
  console.log(`✅ Created user: ${newUser.id} - ${newUser.name}`);
  res.status(201).json(newUser);
});

// ============================================================
// Devices
// ============================================================

router.get('/devices', (req, res) => {
  const { tenant_id } = req.query;
  const devices = db.devices.filter(d => d.tenant_id === tenant_id);
  res.json(devices);
});

router.post('/devices/bind', (req, res) => {
  const { device_id, user_id } = req.body;
  const device = db.devices.find(d => d.device_id === device_id);
  if (device) device.status = '使用中';
  res.json({ status: 'bound', device_id, user_id });
});

// ============================================================
// Measurements
// ============================================================

router.get('/measurements/user/:userId', (req, res) => {
  const records = db.measurements.filter(m => m.user_id === req.params.userId);
  res.json(records.map(toSummary));
});

router.get('/measurements', (req, res) => {
  const { tenant_id, page = 1, page_size = 20 } = req.query;
  const tenantUserIds = db.users.filter(u => u.tenant_id === tenant_id).map(u => u.id);
  const records = db.measurements.filter(m => tenantUserIds.includes(m.user_id));
  res.json(paginate(records.map(toSummary), parseInt(page), parseInt(page_size)));
});

router.get('/measurements/:id/report', (req, res) => {
  const record = db.measurements.find(m => m.id === req.params.id);
  if (!record) return res.status(404).json({ detail: 'Measurement not found' });
  res.json(record);
});

router.post('/measurements/start', (req, res) => {
  const { user_id, device_id } = req.body;
  const user = db.users.find(u => u.id === user_id);
  if (!user) return res.status(404).json({ detail: 'User not found' });

  const measurementId = `MR-${Date.now()}`;
  db.pendingMeasurements.push({
    id: measurementId,
    user_id,
    user_name: user.name,
    device_id: device_id || 'Z4U524060082',
    start_time: new Date().toISOString().replace('T', ' ').slice(0, 19),
    tenant_id: user.tenant_id,
  });

  const device = db.devices.find(d => d.device_id === device_id);
  if (device) device.status = '使用中';

  console.log(`✅ Measurement started: ${measurementId} for user ${user.name}`);
  res.json({ measurement_id: measurementId, status: 'started', message: '检测已开始，请保持坐姿' });
});

router.post('/measurements/stop', async (req, res) => {
  try {
    const { measurement_id } = req.body;

    const pendingIdx = db.pendingMeasurements.findIndex(m => m.id === measurement_id);
    let pending;
    if (pendingIdx >= 0) {
      pending = db.pendingMeasurements.splice(pendingIdx, 1)[0];
    } else {
      const existing = db.measurements.find(m => m.id === measurement_id);
      if (existing) {
        return res.json({ measurement_id, status: 'completed', message: '该检测已完成', report_ready: true });
      }
      pending = {
        id: measurement_id,
        user_id: 'U001', user_name: '张三',
        device_id: 'Z4U524060082',
        start_time: new Date(Date.now() - 30 * 60000).toISOString().replace('T', ' ').slice(0, 19),
        tenant_id: 'T001',
      };
    }

    const startMs = new Date(pending.start_time.replace(' ', 'T')).getTime();
    const durationMinutes = Math.max(5, Math.round((Date.now() - startMs) / 60000));

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔬 [检测流程] 用户: ${pending.user_name}, 时长: ${durationMinutes}分钟`);
    console.log(`${'='.repeat(60)}`);

    // Step 1: Generate mock raw data
    console.log('\n📡 [Step 1] 模拟 MQTT 数据采集...');
    const seed = Date.now() % 10000;
    const rawData = generateMockRawData(durationMinutes, seed, 'normal');
    console.log(`  生成 ${rawData.length} 条原始数据包`);

    // Step 2: Run algorithm engine
    console.log('\n🧮 [Step 2] 运行算法引擎...');
    const algorithmService = new MockAlgorithmService();
    const result = algorithmService.compute(rawData);

    // Step 3: Generate AI report
    console.log('\n🤖 [Step 3] 生成 AI 健康分析报告...');
    const aiService = req.app.get('aiService');

    const user = db.users.find(u => u.id === pending.user_id);
    const userInfo = user ? {
      姓名: user.name,
      性别: user.gender,
      年龄: user.age,
      身高: `${user.height}cm`,
      体重: `${user.weight}kg`,
      BMI: user.bmi,
    } : null;

    const aiResult = await aiService.generateReport(result.derived_metrics, durationMinutes, userInfo);

    console.log(`  AI 报告来源: ${aiResult.source}`);
    if (aiResult.usage) {
      console.log(`  Token 消耗: ${aiResult.usage.total_tokens}`);
    }

    // Step 4: Build full record
    const endTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const fullRecord = {
      id: pending.id,
      user_id: pending.user_id,
      user_name: pending.user_name,
      device_id: pending.device_id,
      start_time: pending.start_time,
      end_time: endTime,
      duration_minutes: durationMinutes,
      hr_timeline: result.hr_timeline,
      br_timeline: result.br_timeline,
      time_labels: result.time_labels,
      derived_metrics: result.derived_metrics,
      ai_analysis: aiResult.content,
      ai_meta: {
        source: aiResult.source,
        model: aiResult.model,
        usage: aiResult.usage,
        response_time_ms: aiResult.response_time_ms || null,
      },
      algorithm_log: result.algorithm_log,
    };

    db.measurements.push(fullRecord);

    // Update user metrics
    if (user) {
      user.latest_stress = result.derived_metrics.stress_sensitivity;
      user.latest_score = result.derived_metrics.health_score;
      if (result.derived_metrics.stress_sensitivity > 80) user.tag = '重度焦虑';
      else if (result.derived_metrics.stress_sensitivity > 65) user.tag = '中度焦虑';
      else if (result.derived_metrics.stress_sensitivity > 45) user.tag = '轻度压力';
      else user.tag = '正常';
    }

    // Step 5: Run intervention engine
    console.log('\n🔍 [Step 4] 运行干预规则引擎...');
    const tenantRules = db.rules.filter(r => r.tenant_id === pending.tenant_id);
    const triggeredLogs = interventionEngine.evaluate(
      tenantRules, result.derived_metrics,
      pending.user_id, pending.user_name, pending.tenant_id,
    );

    if (triggeredLogs.length > 0) {
      db.interventionLogs.unshift(...triggeredLogs);
      console.log(`📝 已保存 ${triggeredLogs.length} 条干预日志到数据库`);
    }

    const device = db.devices.find(d => d.device_id === pending.device_id);
    if (device) device.status = '在线';

    console.log(`\n✅ [检测完成] 报告ID: ${pending.id}, 健康评分: ${result.derived_metrics.health_score}`);
    console.log(`   AI 报告来源: ${aiResult.source === 'siliconflow_api' ? '🤖 硅基流动 API (真实)' : '📝 Fallback 模板'}`);
    console.log(`${'='.repeat(60)}\n`);

    res.json({
      measurement_id: pending.id,
      status: 'completed',
      message: '报告生成完毕',
      report_ready: true,
      ai_source: aiResult.source,
    });

  } catch (error) {
    console.error('❌ 检测流程出错:', error);
    res.status(500).json({ detail: error.message });
  }
});

// ============================================================
// AI Service Configuration
// ============================================================

router.get('/ai/status', (req, res) => {
  const aiService = req.app.get('aiService');
  res.json(aiService.getStatus());
});

router.post('/ai/config', (req, res) => {
  const aiService = req.app.get('aiService');
  const { api_key, model, base_url } = req.body;

  aiService.updateConfig({ api_key, model, base_url });

  console.log('\n🔧 AI 配置已更新:');
  if (api_key) console.log(`  API Key: ${api_key.substring(0, 8)}...${api_key.slice(-4)}`);
  if (model) console.log(`  Model: ${model}`);
  if (base_url) console.log(`  Base URL: ${base_url}`);
  console.log('');

  res.json({
    status: 'updated',
    ...aiService.getStatus(),
  });
});

router.post('/ai/test', async (req, res) => {
  const aiService = req.app.get('aiService');

  if (!aiService.isConfigured()) {
    return res.status(400).json({
      status: 'error',
      message: '未配置 API Key。请先通过 POST /ai/config 或 .env 文件配置 SILICONFLOW_API_KEY',
    });
  }

  console.log('\n🧪 测试 AI 服务连接...');

  try {
    const testMetrics = {
      avg_hr: 72, avg_br: 16, max_hr: 85, min_hr: 65,
      hrv: 55, stress_sensitivity: 45, autonomic_balance: 1.8,
      anxiety_level: 35, fatigue_index: 40, health_score: 78,
      posture_correct_rate: 82,
      tcm_constitution: {
        primary: '平和质', primary_score: 65,
        secondary: '气郁质', secondary_score: 48,
        all_scores: { '平和质': 65, '气郁质': 48, '气虚质': 35 },
      },
    };

    const result = await aiService.generateReport(testMetrics, 10);

    res.json({
      status: 'success',
      source: result.source,
      model: result.model,
      response_time_ms: result.response_time_ms,
      usage: result.usage,
      content_preview: result.content.substring(0, 300) + '...',
      content_length: result.content.length,
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// ============================================================
// Intervention Rules
// ============================================================

router.get('/rules', (req, res) => {
  const { tenant_id } = req.query;
  const rules = db.rules.filter(r => r.tenant_id === tenant_id);
  res.json(rules);
});

router.post('/rules', (req, res) => {
  const newRule = {
    id: `R${String(db.rules.length + 100).padStart(3, '0')}`,
    ...req.body,
    enabled: req.body.enabled !== undefined ? req.body.enabled : true,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
  db.rules.push(newRule);
  console.log(`✅ Created rule: ${newRule.id} - ${newRule.metric} ${newRule.operator} ${newRule.value}`);
  res.status(201).json(newRule);
});

router.patch('/rules/:id', (req, res) => {
  const rule = db.rules.find(r => r.id === req.params.id);
  if (!rule) return res.status(404).json({ detail: 'Rule not found' });
  Object.assign(rule, req.body);
  res.json(rule);
});

router.delete('/rules/:id', (req, res) => {
  const idx = db.rules.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: 'Rule not found' });
  db.rules.splice(idx, 1);
  res.status(204).send();
});

// ============================================================
// Intervention Logs
// ============================================================

router.get('/logs', (req, res) => {
  const { tenant_id, page = 1, page_size = 50 } = req.query;
  const filtered = db.interventionLogs.filter(l => l.tenant_id === tenant_id);
  res.json(paginate(filtered, parseInt(page), parseInt(page_size)));
});

router.post('/logs/evaluate', (req, res) => {
  const { metrics, user_id, user_name } = req.body;
  const user = db.users.find(u => u.id === user_id);
  const tenantId = user ? user.tenant_id : 'T001';
  const tenantRules = db.rules.filter(r => r.tenant_id === tenantId);
  const triggered = interventionEngine.evaluate(tenantRules, metrics, user_id, user_name, tenantId);
  db.interventionLogs.unshift(...triggered);
  res.json(triggered);
});

// ============================================================
// Activities
// ============================================================

router.get('/activities', (req, res) => {
  const { tenant_id } = req.query;
  const activities = db.activities.filter(a => a.tenant_id === tenant_id);
  res.json(activities);
});

router.post('/activities', (req, res) => {
  const { tenant_id, title, description, date, target_tag } = req.body;
  const matchedUsers = db.users.filter(u => u.tenant_id === tenant_id && u.tag === target_tag);
  const newActivity = {
    id: `A${String(db.activities.length + 100).padStart(3, '0')}`,
    tenant_id, title, description, date, target_tag,
    matched_users: matchedUsers.length,
    status: '草稿',
  };
  db.activities.push(newActivity);
  res.status(201).json(newActivity);
});

// ============================================================
// Dashboard
// ============================================================

router.get('/dashboard/stats', (req, res) => {
  const { tenant_id } = req.query;
  res.json(db.getDashboardStats(tenant_id || 'T001'));
});

// ============================================================
// Algorithm Test
// ============================================================

router.post('/algorithm/test', (req, res) => {
  const { duration_minutes = 5, scenario = 'normal', seed = 42 } = req.body;
  const rawData = generateMockRawData(duration_minutes, seed, scenario);
  const service = new MockAlgorithmService();
  const result = service.compute(rawData);
  res.json(result);
});

// ============================================================
// Health Check
// ============================================================

router.get('/health', (req, res) => {
  const aiService = req.app.get('aiService');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ai: {
      configured: aiService.isConfigured(),
      model: aiService.model,
    },
    database: {
      tenants: db.tenants.length,
      users: db.users.length,
      devices: db.devices.length,
      measurements: db.measurements.length,
      rules: db.rules.length,
      logs: db.interventionLogs.length,
    },
  });
});

module.exports = router;
