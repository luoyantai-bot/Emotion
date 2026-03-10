/**
 * MockAlgorithmService - Phase 2 核心模块
 * 
 * 严格按照 PRD 第五节的算法逻辑，接收 5 分钟+ 的 MQTT 原始数据包列表，
 * 计算并输出 HRV、压力敏感度、自主神经平衡、中医体质倾向的复合 JSON 结构。
 * 
 * 数据协议 (MQTT Payload):
 * {
 *   device_id: string,
 *   timestamp: number,
 *   heart_rate: number,     // 次/分 (bpm)
 *   breath_rate: number,    // 次/分
 *   movement_level: number, // 0:静止, 1:微动, 2:抖腿/频动
 *   posture_status: number  // 1:坐姿正确, 0:重心偏移
 * }
 */

// ============ Input Types ============
export interface MQTTPayload {
  device_id: string;
  timestamp: number;
  heart_rate: number;
  breath_rate: number;
  movement_level: 0 | 1 | 2;
  posture_status: 0 | 1;
}

// ============ Output Types ============
export interface DerivedMetrics {
  // 基础聚合
  avg_hr: number;
  avg_br: number;
  max_hr: number;
  min_hr: number;
  // 高级指标
  hrv: number;
  stress_sensitivity: number;
  autonomic_balance: number;
  // 情绪指标
  anxiety_level: number;
  fatigue_index: number;
  // 综合评分
  health_score: number;
  posture_correct_rate: number;
  // 中医体质
  tcm_constitution: {
    primary: string;
    primary_score: number;
    secondary: string;
    secondary_score: number;
    all_scores: Record<string, number>;
  };
}

export interface AlgorithmResult {
  raw_data_summary: {
    total_samples: number;
    duration_seconds: number;
    duration_minutes: number;
    start_time: number;
    end_time: number;
  };
  derived_metrics: DerivedMetrics;
  hr_timeline: number[];
  br_timeline: number[];
  time_labels: string[];
  algorithm_log: string[]; // 算法执行过程日志
}

// ============ Seeded Random for Reproducibility ============
function createSeededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 12345) % 2147483647;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

// ============ MockAlgorithmService ============
export class MockAlgorithmService {
  private log: string[] = [];

  /**
   * 核心方法：接收原始 MQTT 数据包列表，返回衍生指标
   * @param rawDataPackets - 5分钟+ 的 MQTT 数据包数组
   * @returns AlgorithmResult 包含所有衍生指标的复合 JSON
   */
  compute(rawDataPackets: MQTTPayload[]): AlgorithmResult {
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
    const avg_movement = movementLevels.reduce((a: number, b: number) => a + b, 0) / movementLevels.length;
    const posture_correct_count = postureStatuses.filter(s => s === 1).length;
    const posture_correct_rate = Math.round((posture_correct_count / postureStatuses.length) * 100);

    this.log.push(`  平均心率: ${avg_hr} bpm, 平均呼吸: ${avg_br} 次/分`);
    this.log.push(`  心率范围: ${min_hr}-${max_hr} bpm`);
    this.log.push(`  平均微动水平: ${avg_movement.toFixed(2)}, 坐姿正确率: ${posture_correct_rate}%`);

    // ====== Step 2: HRV 心率变异性 ======
    // PRD: 随机基数 50。若 avg_hr > 85 且 movement_level 高，则 HRV 降低(20-40)，否则正常(40-80)
    this.log.push('[Step 2] 计算 HRV 心率变异性...');
    
    // 使用心率数据的时间戳作为种子保证可复现
    const seed = rawDataPackets[0]?.timestamp || 42;
    const random = createSeededRandom(seed);
    
    let hrv: number;
    if (avg_hr > 85 && avg_movement > 1) {
      hrv = Math.round(20 + random() * 20); // 20-40
      this.log.push(`  avg_hr(${avg_hr}) > 85 且 movement(${avg_movement.toFixed(1)}) > 1 → HRV偏低: ${hrv}ms`);
    } else {
      hrv = Math.round(40 + random() * 40); // 40-80
      this.log.push(`  心率和运动水平正常 → HRV正常: ${hrv}ms`);
    }

    // ====== Step 3: 压力敏感度 ======
    // PRD: 公式 = (avg_hr / 100 * 0.5) + (movement_level_avg / 2 * 0.5) → 转化为百分比
    this.log.push('[Step 3] 计算压力敏感度...');
    
    const stress_raw = (avg_hr / 100) * 0.5 + (avg_movement / 2) * 0.5;
    const stress_sensitivity = Math.max(15, Math.min(95, Math.round(stress_raw * 100)));
    
    this.log.push(`  公式: (${avg_hr}/100*0.5) + (${avg_movement.toFixed(2)}/2*0.5) = ${stress_raw.toFixed(3)}`);
    this.log.push(`  压力敏感度: ${stress_sensitivity}% ${stress_sensitivity > 70 ? '⚠️ 激进' : '正常'}`);

    // ====== Step 4: 自主神经平衡 ======
    // PRD: 正常值 1.5。压力高时偏向"交感神经" (>2.5)
    this.log.push('[Step 4] 计算自主神经平衡...');
    
    let autonomic_balance: number;
    if (stress_sensitivity > 70) {
      autonomic_balance = 2.5 + random() * 2; // 偏向交感神经亢奋
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
    const scores: Record<string, number> = {};
    
    // 基础随机分
    constitutions.forEach(c => {
      scores[c] = Math.round(20 + random() * 40);
    });

    // PRD: 呼吸浅快(>17) + 压力高(>55) + 心率偏高(>75) → 阴虚质
    if (avg_br > 17 && stress_sensitivity > 55 && avg_hr > 75) {
      scores['阴虚质'] = Math.round(65 + random() * 20);
      this.log.push(`  呼吸浅快(${avg_br}>17) + 压力高(${stress_sensitivity}>55) + 心率高(${avg_hr}>75) → 阴虚质 ${scores['阴虚质']}分`);
    }

    // PRD: 重心常偏移(坐姿正确率<70%) + 恢复慢 → 血瘀质
    if (posture_correct_rate < 70) {
      scores['血瘀质'] = Math.round(55 + random() * 20);
      this.log.push(`  坐姿偏移频繁(正确率${posture_correct_rate}%<70%) → 血瘀质 ${scores['血瘀质']}分`);
    }

    // 额外推演：压力高 → 气郁质
    if (stress_sensitivity > 50) {
      scores['气郁质'] = Math.round(50 + random() * 25);
      this.log.push(`  压力偏高(${stress_sensitivity}>50) → 气郁质 ${scores['气郁质']}分`);
    }

    const sortedConstitutions = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    this.log.push(`  主要体质: ${sortedConstitutions[0][0]}(${sortedConstitutions[0][1]}分), 次要: ${sortedConstitutions[1][0]}(${sortedConstitutions[1][1]}分)`);

    // ====== Step 6: 综合评分 & 衍生情绪指标 ======
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

    // 每 10 秒采样一个点用于图表
    const sampleInterval = Math.max(1, Math.floor(rawDataPackets.length / Math.min(rawDataPackets.length, 180)));
    const hr_timeline: number[] = [];
    const br_timeline: number[] = [];
    const time_labels: string[] = [];

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
        avg_hr,
        avg_br,
        max_hr,
        min_hr,
        hrv,
        stress_sensitivity,
        autonomic_balance,
        anxiety_level,
        fatigue_index,
        health_score,
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

  /**
   * 获取最近一次计算的算法日志
   */
  getLog(): string[] {
    return [...this.log];
  }
}

// ============ Raw Data Generator (用于测试) ============
/**
 * 生成模拟的 MQTT 原始数据包序列
 * @param durationMinutes - 检测时长（分钟）
 * @param seed - 随机种子
 * @param scenario - 场景预设
 */
export function generateMockRawData(
  durationMinutes: number = 30,
  seed: number = 42,
  scenario: 'normal' | 'stressed' | 'relaxed' = 'normal'
): MQTTPayload[] {
  const random = createSeededRandom(seed);
  const packets: MQTTPayload[] = [];
  const baseTimestamp = 1716543210;
  const totalSeconds = durationMinutes * 60;

  // 场景基准参数
  const scenarioParams = {
    normal: { baseHR: 72, baseBR: 16, moveProb: 0.25, postureProb: 0.75 },
    stressed: { baseHR: 88, baseBR: 19, moveProb: 0.5, postureProb: 0.55 },
    relaxed: { baseHR: 65, baseBR: 14, moveProb: 0.1, postureProb: 0.9 },
  };

  const params = scenarioParams[scenario];

  for (let i = 0; i < totalSeconds; i++) {
    const hrSine = Math.sin(i / 120 * Math.PI) * 5;
    const hrNoise = (random() - 0.5) * 8;
    const hrSpike = random() > 0.95 ? random() * 10 : 0;
    const heart_rate = Math.round(Math.max(55, Math.min(110, params.baseHR + hrSine + hrNoise + hrSpike)));

    const brSine = Math.sin(i / 180 * Math.PI) * 2;
    const brNoise = (random() - 0.5) * 3;
    const breath_rate = Math.round(Math.max(10, Math.min(25, params.baseBR + brSine + brNoise)));

    const moveRoll = random();
    const movement_level: 0 | 1 | 2 = moveRoll > (1 - params.moveProb * 0.3) ? 2 : moveRoll > (1 - params.moveProb) ? 1 : 0;

    const posture_status: 0 | 1 = random() < params.postureProb ? 1 : 0;

    packets.push({
      device_id: 'Z4U524060082',
      timestamp: baseTimestamp + i,
      heart_rate,
      breath_rate,
      movement_level,
      posture_status,
    });
  }

  return packets;
}

// ============ Test Runner ============
/**
 * 运行算法验证测试，返回测试结果
 */
export function runAlgorithmTest(): {
  scenarios: Array<{
    name: string;
    scenario: string;
    result: AlgorithmResult;
    passed: boolean;
    checks: Array<{ check: string; passed: boolean; detail: string }>;
  }>;
} {
  const service = new MockAlgorithmService();
  const scenarios: Array<{
    name: string;
    scenario: 'normal' | 'stressed' | 'relaxed';
    expectedStressRange: [number, number];
    expectedHRVRange: [number, number];
  }> = [
    { name: '正常场景', scenario: 'normal', expectedStressRange: [30, 60], expectedHRVRange: [35, 80] },
    { name: '高压场景', scenario: 'stressed', expectedStressRange: [55, 95], expectedHRVRange: [15, 50] },
    { name: '放松场景', scenario: 'relaxed', expectedStressRange: [15, 50], expectedHRVRange: [40, 85] },
  ];

  return {
    scenarios: scenarios.map((s, idx) => {
      const rawData = generateMockRawData(5, 100 + idx, s.scenario);
      const result = service.compute(rawData);
      const m = result.derived_metrics;

      const checks = [
        {
          check: `压力敏感度在 ${s.expectedStressRange[0]}-${s.expectedStressRange[1]}% 范围内`,
          passed: m.stress_sensitivity >= s.expectedStressRange[0] && m.stress_sensitivity <= s.expectedStressRange[1],
          detail: `实际值: ${m.stress_sensitivity}%`,
        },
        {
          check: `HRV在 ${s.expectedHRVRange[0]}-${s.expectedHRVRange[1]}ms 范围内`,
          passed: m.hrv >= s.expectedHRVRange[0] && m.hrv <= s.expectedHRVRange[1],
          detail: `实际值: ${m.hrv}ms`,
        },
        {
          check: '自主神经平衡值在 0-5 范围内',
          passed: m.autonomic_balance >= 0 && m.autonomic_balance <= 5,
          detail: `实际值: ${m.autonomic_balance}`,
        },
        {
          check: '健康评分在 35-92 范围内',
          passed: m.health_score >= 35 && m.health_score <= 92,
          detail: `实际值: ${m.health_score}`,
        },
        {
          check: '中医体质有有效的主要和次要判定',
          passed: m.tcm_constitution.primary !== '' && m.tcm_constitution.secondary !== '',
          detail: `主: ${m.tcm_constitution.primary}(${m.tcm_constitution.primary_score}), 次: ${m.tcm_constitution.secondary}(${m.tcm_constitution.secondary_score})`,
        },
      ];

      return {
        name: s.name,
        scenario: s.scenario,
        result,
        passed: checks.every(c => c.passed),
        checks,
      };
    }),
  };
}
