/**
 * ============================================================
 * Backend Services - Node.js 版本
 * ============================================================
 * 
 * 包含四个核心服务:
 *   1. MockAlgorithmService   - PRD 第五节算法引擎
 *   2. SiliconFlowAIService   - PRD 第六节 硅基流动大模型真实对接
 *   3. generateFallbackReport - 无 API Key 时的模板 fallback
 *   4. InterventionEngine     - 干预规则匹配引擎
 */

// ============================================================
// 工具函数
// ============================================================

function createSeededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 12345) % 2147483647;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

// ============================================================
// 1. MockAlgorithmService - PRD 第五节
// ============================================================

class MockAlgorithmService {
  constructor() {
    this.log = [];
  }

  compute(rawDataPackets) {
    this.log = [];
    this.log.push(`[算法引擎] 收到 ${rawDataPackets.length} 条原始数据包`);

    if (rawDataPackets.length === 0) {
      throw new Error('无有效数据包，无法计算');
    }

    // ====== Step 1: 基础聚合 ======
    this.log.push('[Step 1] 开始基础数据聚合...');

    const heartRates = rawDataPackets.map(p => p.heart_rate);
    const breathRates = rawDataPackets.map(p => p.breath_rate);
    const movementLevels = rawDataPackets.map(p => p.movement_level);
    const postureStatuses = rawDataPackets.map(p => p.posture_status);

    const avg_hr = Math.round((heartRates.reduce((a, b) => a + b, 0) / heartRates.length) * 10) / 10;
    const avg_br = Math.round((breathRates.reduce((a, b) => a + b, 0) / breathRates.length) * 10) / 10;
    const max_hr = Math.max(...heartRates);
    const min_hr = Math.min(...heartRates);
    const avg_movement = movementLevels.reduce((a, b) => a + b, 0) / movementLevels.length;
    const posture_correct_count = postureStatuses.filter(s => s === 1).length;
    const posture_correct_rate = Math.round((posture_correct_count / postureStatuses.length) * 100);

    this.log.push(`  平均心率: ${avg_hr} bpm, 平均呼吸: ${avg_br} 次/分`);
    this.log.push(`  心率范围: ${min_hr}-${max_hr} bpm`);
    this.log.push(`  平均微动水平: ${avg_movement.toFixed(2)}, 坐姿正确率: ${posture_correct_rate}%`);

    // ====== Step 2: HRV 心率变异性 ======
    this.log.push('[Step 2] 计算 HRV 心率变异性...');

    const seed = rawDataPackets[0].timestamp || 42;
    const random = createSeededRandom(seed);

    let hrv;
    if (avg_hr > 85 && avg_movement > 1) {
      hrv = Math.round(20 + random() * 20);
      this.log.push(`  avg_hr(${avg_hr}) > 85 且 movement(${avg_movement.toFixed(1)}) > 1 → HRV偏低: ${hrv}ms`);
    } else {
      hrv = Math.round(40 + random() * 40);
      this.log.push(`  心率和运动水平正常 → HRV正常: ${hrv}ms`);
    }

    // ====== Step 3: 压力敏感度 ======
    this.log.push('[Step 3] 计算压力敏感度...');

    const stress_raw = (avg_hr / 100) * 0.5 + (avg_movement / 2) * 0.5;
    const stress_sensitivity = Math.max(15, Math.min(95, Math.round(stress_raw * 100)));

    this.log.push(`  公式: (${avg_hr}/100*0.5) + (${avg_movement.toFixed(2)}/2*0.5) = ${stress_raw.toFixed(3)}`);
    this.log.push(`  压力敏感度: ${stress_sensitivity}% ${stress_sensitivity > 70 ? '⚠️ 激进' : '正常'}`);

    // ====== Step 4: 自主神经平衡 ======
    this.log.push('[Step 4] 计算自主神经平衡...');

    let autonomic_balance;
    if (stress_sensitivity > 70) {
      autonomic_balance = 2.5 + random() * 2;
      this.log.push(`  压力高(${stress_sensitivity}%) → 交感神经主导: ${autonomic_balance.toFixed(1)}`);
    } else if (stress_sensitivity > 50) {
      autonomic_balance = 1.5 + random() * 1.5;
      this.log.push(`  压力中等 → 基本平衡: ${autonomic_balance.toFixed(1)}`);
    } else {
      autonomic_balance = 0.8 + random() * 1.2;
      this.log.push(`  压力低 → 副交感神经主导: ${autonomic_balance.toFixed(1)}`);
    }
    autonomic_balance = Math.round(autonomic_balance * 10) / 10;

    // ====== Step 5: 中医体质推演 ======
    this.log.push('[Step 5] 中医体质推演...');

    const constitutions = ['平和质', '气虚质', '阳虚质', '阴虚质', '痰湿质', '湿热质', '血瘀质', '气郁质', '特禀质'];
    const scores = {};

    constitutions.forEach(c => {
      scores[c] = Math.round(20 + random() * 40);
    });

    if (avg_br > 17 && stress_sensitivity > 55 && avg_hr > 75) {
      scores['阴虚质'] = Math.round(65 + random() * 20);
      this.log.push(`  呼吸浅快(${avg_br}>17) + 压力高(${stress_sensitivity}>55) + 心率高(${avg_hr}>75) → 阴虚质 ${scores['阴虚质']}分`);
    }

    if (posture_correct_rate < 70) {
      scores['血瘀质'] = Math.round(55 + random() * 20);
      this.log.push(`  坐姿偏移频繁(正确率${posture_correct_rate}%<70%) → 血瘀质 ${scores['血瘀质']}分`);
    }

    if (stress_sensitivity > 50) {
      scores['气郁质'] = Math.round(50 + random() * 25);
      this.log.push(`  压力偏高(${stress_sensitivity}>50) → 气郁质 ${scores['气郁质']}分`);
    }

    const sortedConstitutions = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    this.log.push(`  主要体质: ${sortedConstitutions[0][0]}(${sortedConstitutions[0][1]}分), 次要: ${sortedConstitutions[1][0]}(${sortedConstitutions[1][1]}分)`);

    // ====== Step 6: 综合评分 ======
    this.log.push('[Step 6] 计算综合健康评分...');

    const health_score = Math.max(35, Math.min(92, Math.round(
      100 - (stress_sensitivity * 0.25) - ((80 - Math.min(hrv, 80)) * 0.2) - ((1 - posture_correct_rate / 100) * 15) - (avg_movement * 4)
    )));

    const anxiety_level = Math.max(15, Math.min(95, Math.round(stress_sensitivity * 0.8 + (random() - 0.5) * 20)));
    const fatigue_index = Math.max(15, Math.min(90, Math.round(40 + (80 - Math.min(hrv, 80)) * 0.3 + (random() - 0.5) * 15)));

    this.log.push(`  健康评分: ${health_score}分, 焦虑指数: ${anxiety_level}%, 疲劳指数: ${fatigue_index}%`);
    this.log.push('[算法引擎] ✅ 全部计算完成');

    // ====== 生成时间轴 ======
    const startTime = rawDataPackets[0].timestamp;
    const endTime = rawDataPackets[rawDataPackets.length - 1].timestamp;
    const durationSeconds = endTime - startTime;
    const durationMinutes = Math.round(durationSeconds / 60);

    const sampleInterval = Math.max(1, Math.floor(rawDataPackets.length / Math.min(rawDataPackets.length, 180)));
    const hr_timeline = [];
    const br_timeline = [];
    const time_labels = [];

    for (let i = 0; i < rawDataPackets.length; i += sampleInterval) {
      hr_timeline.push(rawDataPackets[i].heart_rate);
      br_timeline.push(rawDataPackets[i].breath_rate);
      const elapsed = rawDataPackets[i].timestamp - startTime;
      const min = Math.floor(elapsed / 60);
      const sec = elapsed % 60;
      time_labels.push(`${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`);
    }

    return {
      raw_data_summary: {
        total_samples: rawDataPackets.length,
        duration_seconds: durationSeconds,
        duration_minutes: Math.max(durationMinutes, 1),
        start_time: startTime,
        end_time: endTime,
      },
      derived_metrics: {
        avg_hr, avg_br, max_hr, min_hr, hrv,
        stress_sensitivity, autonomic_balance,
        anxiety_level, fatigue_index, health_score,
        posture_correct_rate,
        tcm_constitution: {
          primary: sortedConstitutions[0][0],
          primary_score: sortedConstitutions[0][1],
          secondary: sortedConstitutions[1][0],
          secondary_score: sortedConstitutions[1][1],
          all_scores: scores,
        },
      },
      hr_timeline,
      br_timeline,
      time_labels,
      algorithm_log: [...this.log],
    };
  }

  getLog() {
    return [...this.log];
  }
}

// ============================================================
// Raw Data Generator (模拟 MQTT 数据)
// ============================================================

function generateMockRawData(durationMinutes = 30, seed = 42, scenario = 'normal') {
  const random = createSeededRandom(seed);
  const packets = [];
  const baseTimestamp = 1716543210;
  const totalSeconds = durationMinutes * 60;

  const scenarioParams = {
    normal:   { baseHR: 72, baseBR: 16, moveProb: 0.25, postureProb: 0.75 },
    stressed: { baseHR: 88, baseBR: 19, moveProb: 0.5,  postureProb: 0.55 },
    relaxed:  { baseHR: 65, baseBR: 14, moveProb: 0.1,  postureProb: 0.9  },
  };

  const params = scenarioParams[scenario] || scenarioParams.normal;

  for (let i = 0; i < totalSeconds; i++) {
    const hrSine = Math.sin(i / 120 * Math.PI) * 5;
    const hrNoise = (random() - 0.5) * 8;
    const hrSpike = random() > 0.95 ? random() * 10 : 0;
    const heart_rate = Math.round(Math.max(55, Math.min(110, params.baseHR + hrSine + hrNoise + hrSpike)));

    const brSine = Math.sin(i / 180 * Math.PI) * 2;
    const brNoise = (random() - 0.5) * 3;
    const breath_rate = Math.round(Math.max(10, Math.min(25, params.baseBR + brSine + brNoise)));

    const moveRoll = random();
    const movement_level = moveRoll > (1 - params.moveProb * 0.3) ? 2 : moveRoll > (1 - params.moveProb) ? 1 : 0;
    const posture_status = random() < params.postureProb ? 1 : 0;

    packets.push({
      device_id: 'Z4U524060082',
      timestamp: baseTimestamp + i,
      heart_rate, breath_rate, movement_level, posture_status,
    });
  }

  return packets;
}


// ============================================================
// 2. SiliconFlowAIService - PRD 第六节 硅基流动大模型真实对接
// ============================================================

const SYSTEM_PROMPT = `你是一位融合了中医体质学与现代心理生理学的主治医师。请根据以下智能坐垫采集到的用户生理指标JSON，生成一份严谨、有同理心的健康综合分析与建议。
必须包含以下四个模块结构返回（使用Markdown）：
### 总体健康状态概述
[分析用户整体情况，包含综合评分解读]
### 各板块详细分析
[结合HRV分析心脏自主神经调节能力、结合自主神经平衡指数分析情绪状态、结合体质评估给出中医倾向分析]
### 风险指标预警
[列出重度/中度/轻度风险项，每项包含具体数值和正常范围对比]
### 个性化健康建议
[分为短期1-3个月调整、长期6-12个月干预，并给出具体的饮食方案和作息建议。如果有中医体质倾向，请给出对应的食疗和穴位按摩建议]`;

const AVAILABLE_MODELS = [
  { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', description: '综合能力强，性价比高（推荐）' },
  { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', description: '推理增强型，分析更深入' },
  { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5 72B', description: '阿里通义千问，中文能力优秀' },
  { id: 'Pro/Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5 7B (轻量)', description: '响应快速，适合实时场景' },
  { id: 'THUDM/glm-4-9b-chat', name: 'GLM-4 9B', description: '清华智谱，通用对话' },
];

class SiliconFlowAIService {
  constructor() {
    this.apiKey = process.env.SILICONFLOW_API_KEY || '';
    this.model = process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V3';
    this.baseUrl = process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1';
    this.systemPrompt = SYSTEM_PROMPT;
  }

  isConfigured() {
    return this.apiKey.length > 0;
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      model: this.model,
      base_url: this.baseUrl,
      api_key_preview: this.apiKey ? `${this.apiKey.substring(0, 8)}...${this.apiKey.slice(-4)}` : '未配置',
      available_models: AVAILABLE_MODELS,
      system_prompt: this.systemPrompt,
    };
  }

  updateConfig({ api_key, model, base_url }) {
    if (api_key !== undefined) this.apiKey = api_key;
    if (model !== undefined) this.model = model;
    if (base_url !== undefined) this.baseUrl = base_url;
  }

  async generateReport(derivedMetrics, durationMinutes, userInfo = null) {
    const userData = {
      检测时长: `${durationMinutes}分钟`,
      综合健康评分: derivedMetrics.health_score,
      平均心率: `${derivedMetrics.avg_hr} bpm`,
      心率范围: `${derivedMetrics.min_hr}-${derivedMetrics.max_hr} bpm`,
      平均呼吸频率: `${derivedMetrics.avg_br} 次/分`,
      HRV心率变异性: `${derivedMetrics.hrv} ms`,
      压力敏感度: `${derivedMetrics.stress_sensitivity}%`,
      焦虑指数: `${derivedMetrics.anxiety_level}%`,
      疲劳指数: `${derivedMetrics.fatigue_index}%`,
      自主神经平衡指数: derivedMetrics.autonomic_balance,
      坐姿正确率: `${derivedMetrics.posture_correct_rate}%`,
      中医体质倾向: {
        主要体质: `${derivedMetrics.tcm_constitution.primary}(${derivedMetrics.tcm_constitution.primary_score}分)`,
        次要体质: `${derivedMetrics.tcm_constitution.secondary}(${derivedMetrics.tcm_constitution.secondary_score}分)`,
        全部评分: derivedMetrics.tcm_constitution.all_scores,
      },
    };

    if (userInfo) {
      userData['用户信息'] = userInfo;
    }

    const userMessage = `用户数据: ${JSON.stringify(userData, null, 2)}`;

    if (this.isConfigured()) {
      return await this._callSiliconFlowAPI(userMessage, userData, derivedMetrics, durationMinutes);
    }

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  🤖 AI 报告生成 (Fallback 模板模式)                     ║');
    console.log('║  ⚠️  未检测到 SILICONFLOW_API_KEY                       ║');
    console.log('║  获取密钥: https://cloud.siliconflow.cn/account/ak       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const fallbackContent = generateFallbackReport(derivedMetrics, durationMinutes);
    return {
      content: fallbackContent,
      source: 'fallback_template',
      model: 'none',
      usage: null,
    };
  }

  async _callSiliconFlowAPI(userMessage, userData, derivedMetrics, durationMinutes) {
    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.9,
    };

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  🤖 调用硅基流动 API (真实请求)                         ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Endpoint: ${this.baseUrl}/chat/completions`);
    console.log(`║  Model:    ${this.model}`);
    console.log(`║  API Key:  ${this.apiKey.substring(0, 8)}...${this.apiKey.slice(-4)}`);
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  ⏳ 请求发送中...');

    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errorBody = await response.text();
        console.log(`║  ❌ API 返回错误: ${response.status}`);
        console.log(`║  ${errorBody.substring(0, 200)}`);
        console.log('║  ⚠️  降级到 fallback 模板模式');
        console.log('╚══════════════════════════════════════════════════════════╝\n');

        const fallbackContent = generateFallbackReport(derivedMetrics, durationMinutes);
        return {
          content: fallbackContent,
          source: 'fallback_api_error',
          model: this.model,
          error: `API Error ${response.status}: ${errorBody.substring(0, 200)}`,
          usage: null,
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || null;

      console.log(`║  ✅ API 响应成功! (${elapsed}ms)`);
      console.log(`║  Token 用量: prompt=${usage?.prompt_tokens || '?'}, completion=${usage?.completion_tokens || '?'}, total=${usage?.total_tokens || '?'}`);
      console.log(`║  响应长度: ${content.length} 字符`);
      console.log('╚══════════════════════════════════════════════════════════╝\n');

      return {
        content,
        source: 'siliconflow_api',
        model: this.model,
        usage,
        response_time_ms: elapsed,
      };

    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.log(`║  ❌ 网络错误 (${elapsed}ms): ${error.message}`);
      console.log('║  ⚠️  降级到 fallback 模板模式');
      console.log('╚══════════════════════════════════════════════════════════╝\n');

      const fallbackContent = generateFallbackReport(derivedMetrics, durationMinutes);
      return {
        content: fallbackContent,
        source: 'fallback_network_error',
        model: this.model,
        error: error.message,
        usage: null,
      };
    }
  }
}


// ============================================================
// 3. Fallback Report Generator
// ============================================================

function generateFallbackReport(m, durationMinutes) {
  if (!m) {
    return '### 总体健康状态概述\n\n报告生成失败，请检查 AI 服务配置。\n\n### 各板块详细分析\n\n暂无数据。\n\n### 风险指标预警\n\n暂无数据。\n\n### 个性化健康建议\n\n请重新进行检测。';
  }

  const stressLabel = m.stress_sensitivity > 70 ? '偏高' : m.stress_sensitivity > 50 ? '中等' : '正常';
  const scoreLabel = m.health_score > 75 ? '良好' : m.health_score > 60 ? '中等' : '需关注';

  return `### 总体健康状态概述

根据您${durationMinutes}分钟的智能坐垫检测数据综合分析，您的整体健康状况处于**${scoreLabel}**水平（综合评分 **${m.health_score}分**）。心率平均值 ${m.avg_hr} 次/分，心率变异性（HRV）为 ${m.hrv}ms。压力敏感度 ${m.stress_sensitivity}%，属于${stressLabel}水平。

> ⚠️ 本报告由模板引擎生成。配置 SILICONFLOW_API_KEY 后可获得 AI 大模型的深度个性化分析。

### 各板块详细分析

**🫀 心血管系统评估**
HRV值为 ${m.hrv}ms，${m.hrv < 40 ? '提示自主神经调节能力偏弱，交感神经张力偏高' : '自主神经调节能力正常'}。心率波动范围 ${m.min_hr}-${m.max_hr} bpm，${m.max_hr - m.min_hr > 30 ? '波动幅度较大，可能与情绪起伏有关' : '波动在正常范围内'}。

**🧠 情绪与神经系统**
自主神经平衡指数为 ${m.autonomic_balance}，${m.autonomic_balance > 2.5 ? '偏向交感神经主导，可能处于紧张或亢奋状态' : m.autonomic_balance < 1.0 ? '副交感神经主导，身心较为放松' : '基本处于平衡状态'}。焦虑指数 ${m.anxiety_level}%，疲劳指数 ${m.fatigue_index}%。

**🏥 中医体质倾向**
主要体质倾向为**${m.tcm_constitution.primary}**（${m.tcm_constitution.primary_score}分），次要倾向为**${m.tcm_constitution.secondary}**（${m.tcm_constitution.secondary_score}分）。${m.tcm_constitution.primary === '阴虚质' ? '阴虚质表现为体内阴液不足，常见口干、手足心热、失眠多梦等症状。' : m.tcm_constitution.primary === '血瘀质' ? '血瘀质表现为血行不畅，常见肤色暗沉、肩颈酸痛等症状。' : m.tcm_constitution.primary === '气郁质' ? '气郁质表现为气机郁滞，常见情绪低落、胸闷叹气等症状。' : '建议定期进行体质辨识，了解自身体质特点。'}

### 风险指标预警

${m.stress_sensitivity > 80 ? '🔴 **重度风险**: 压力敏感度过高(' + m.stress_sensitivity + '%)，需要立即关注并采取干预措施' : m.stress_sensitivity > 70 ? '🟡 **中度风险**: 压力敏感度偏高(' + m.stress_sensitivity + '%)，建议加强压力管理' : '🟢 **低风险**: 压力水平在可控范围内'}
${m.hrv < 30 ? '\n🔴 **重度风险**: HRV过低(' + m.hrv + 'ms)，心脏自主神经调节能力不足' : m.hrv < 40 ? '\n🟡 **中度风险**: HRV偏低(' + m.hrv + 'ms)，建议改善作息规律' : ''}
${m.posture_correct_rate < 60 ? '\n🟡 **中度风险**: 坐姿正确率过低(' + m.posture_correct_rate + '%)，长期可能导致脊椎问题' : ''}

### 个性化健康建议

**短期调整 (1-3个月)**
- 每日进行 10-15 分钟深呼吸或正念冥想练习
- ${m.stress_sensitivity > 60 ? '减少咖啡因摄入，避免21:00后使用电子设备' : '保持当前良好的生活习惯'}
- ${m.posture_correct_rate < 80 ? '每工作45分钟起身活动5分钟，注意坐姿调整' : '继续保持良好坐姿习惯'}
- 推荐食疗：${m.tcm_constitution.primary === '阴虚质' ? '银耳百合羹、枸杞菊花茶' : m.tcm_constitution.primary === '血瘀质' ? '山楂红糖水、玫瑰花茶' : '黄芪红枣茶、山药粥'}

**长期干预 (6-12个月)**
- 建立规律的运动习惯，每周 3-4 次有氧运动（推荐太极拳、瑜伽、快走）
- 保持 23:00 前入睡的作息规律
- 每月进行一次智能坐垫检测，跟踪健康指标变化趋势
- ${m.stress_sensitivity > 70 ? '建议寻求专业心理咨询，建立个人压力管理方案' : '定期参加放松类活动，如颂钵音疗、茶道体验等'}`;
}


// ============================================================
// 4. InterventionEngine - 干预规则引擎
// ============================================================

const METRIC_MAPPING = {
  '压力敏感度': 'stress_sensitivity',
  '焦虑指数': 'anxiety_level',
  'HRV': 'hrv',
  '疲劳指数': 'fatigue_index',
  '健康评分': 'health_score',
  '自主神经平衡': 'autonomic_balance',
};

function compareValue(actual, operator, threshold) {
  switch (operator) {
    case '>':  return actual > threshold;
    case '<':  return actual < threshold;
    case '>=': return actual >= threshold;
    case '<=': return actual <= threshold;
    case '=':  return actual === threshold;
    default:   return false;
  }
}

class InterventionEngine {
  evaluate(rules, metrics, userId, userName, tenantId) {
    const triggered = [];

    console.log('\n┌─────────────────────────────────────────────────┐');
    console.log('│ 🔍 干预规则引擎 - 开始评估                      │');
    console.log(`│ 用户: ${userName} (${userId})`);
    console.log(`│ 规则数: ${rules.length}`);
    console.log('├─────────────────────────────────────────────────┤');

    for (const rule of rules) {
      if (!rule.enabled) {
        console.log(`│ ⏭️  规则 [${rule.metric} ${rule.operator} ${rule.value}] - 已禁用，跳过`);
        continue;
      }

      const fieldName = METRIC_MAPPING[rule.metric];
      if (!fieldName) {
        console.log(`│ ❌ 规则 [${rule.metric}] - 未知指标，跳过`);
        continue;
      }

      const actualValue = metrics[fieldName];
      const matched = compareValue(actualValue, rule.operator, rule.value);

      if (matched) {
        console.log(`│ ✅ 规则 [${rule.metric} ${rule.operator} ${rule.value}] - 触发！实际值: ${actualValue}`);
        console.log(`│    → 动作: ${rule.device_type} ${rule.action} ${rule.parameter}`);

        const crypto = require('crypto');
        const uuidv4 = () => crypto.randomUUID();
        triggered.push({
          id: uuidv4(),
          tenant_id: tenantId,
          user_id: userId,
          user_name: userName,
          rule_id: rule.id,
          triggered_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
          metric_name: rule.metric,
          metric_value: actualValue,
          threshold: rule.value,
          operator: rule.operator,
          action_description: `${rule.device_type}：${rule.action}${rule.parameter}`,
          device_type: rule.device_type,
          status: '已执行',
        });
      } else {
        console.log(`│ ❌ 规则 [${rule.metric} ${rule.operator} ${rule.value}] - 未触发 (实际值: ${actualValue})`);
      }
    }

    console.log('├─────────────────────────────────────────────────┤');
    console.log(`│ 📊 评估完成: ${triggered.length}/${rules.length} 条规则触发`);
    console.log('└─────────────────────────────────────────────────┘\n');

    return triggered;
  }
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  MockAlgorithmService,
  generateMockRawData,
  SiliconFlowAIService,
  generateFallbackReport,
  InterventionEngine,
  SYSTEM_PROMPT,
  AVAILABLE_MODELS,
  METRIC_MAPPING,
};
