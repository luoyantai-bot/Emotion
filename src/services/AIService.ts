/**
 * AIService - Phase 3 核心模块
 * 
 * 模拟硅基流动 AI 大模型 API 接入
 * 使用 PRD 第六节定义的 System Prompt
 * 将 derived_metrics JSON 发送给大模型，解析 Markdown 格式报告
 */

import type { DerivedMetrics } from './MockAlgorithmService';

// ============ PRD 第六节 System Prompt（原文） ============
export const SYSTEM_PROMPT = `你是一位融合了中医体质学与现代心理生理学的主治医师。请根据以下智能坐垫采集到的用户生理指标JSON，生成一份严谨、有同理心的健康综合分析与建议。
必须包含以下四个模块结构返回（使用Markdown）：

### 总体健康状态概述
[分析用户整体情况]

### 各板块详细分析
[结合HRV分析心脏、结合自主神经分析情绪、结合体质评估中医倾向]

### 风险指标预警
[列出重度/中度/轻度风险项]

### 个性化健康建议
[分为短期1-3个月调整、长期6-12个月干预，并给出饮食和作息建议]`;

export interface AICallLog {
  timestamp: string;
  model: string;
  system_prompt: string;
  user_data: string;
  response: string;
  latency_ms: number;
  tokens_used: number;
}

/**
 * 模拟 AI 大模型调用
 * 在实际生产中，这里会调用硅基流动的 API
 * 
 * 生产环境 API 调用示例：
 * ```python
 * import requests
 * 
 * response = requests.post(
 *     "https://api.siliconflow.cn/v1/chat/completions",
 *     headers={"Authorization": "Bearer YOUR_API_KEY"},
 *     json={
 *         "model": "Qwen/Qwen2.5-72B-Instruct",
 *         "messages": [
 *             {"role": "system", "content": SYSTEM_PROMPT},
 *             {"role": "user", "content": f"用户数据: {json.dumps(derived_metrics)}"}
 *         ],
 *         "temperature": 0.7,
 *         "max_tokens": 2000
 *     }
 * )
 * ```
 */
export class AIService {
  private callLog: AICallLog | null = null;

  /**
   * 调用 AI 大模型生成健康报告
   * @param metrics - 算法引擎计算的衍生指标
   * @returns Promise<string> - Markdown 格式的健康报告
   */
  async generateReport(metrics: DerivedMetrics): Promise<string> {
    const startTime = Date.now();
    const userDataJson = JSON.stringify(metrics, null, 2);

    console.log('═══════════════════════════════════════════════');
    console.log('🤖 [AIService] 开始调用硅基流动大模型 API...');
    console.log('   模型: Qwen/Qwen2.5-72B-Instruct (模拟)');
    console.log('───────────────────────────────────────────────');
    console.log('📝 System Prompt:');
    console.log(SYSTEM_PROMPT);
    console.log('───────────────────────────────────────────────');
    console.log('📊 User Data (derived_metrics):');
    console.log(userDataJson);
    console.log('───────────────────────────────────────────────');

    // 模拟网络延迟 (800ms - 2000ms)
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    // 基于指标生成模拟 AI 响应
    const report = this.generateMockAIResponse(metrics);

    const latency = Date.now() - startTime;
    const tokens = Math.round(report.length / 1.5);

    this.callLog = {
      timestamp: new Date().toISOString(),
      model: 'Qwen/Qwen2.5-72B-Instruct (模拟)',
      system_prompt: SYSTEM_PROMPT,
      user_data: userDataJson,
      response: report,
      latency_ms: latency,
      tokens_used: tokens,
    };

    console.log(`✅ [AIService] 响应生成完成`);
    console.log(`   耗时: ${latency}ms, Token消耗: ~${tokens}`);
    console.log('═══════════════════════════════════════════════');

    return report;
  }

  getCallLog(): AICallLog | null {
    return this.callLog;
  }

  private generateMockAIResponse(m: DerivedMetrics): string {
    const stressLabel = m.stress_sensitivity > 70 ? '偏高' : m.stress_sensitivity > 50 ? '中等' : '正常';
    const hrvLabel = m.hrv < 40 ? '偏低' : m.hrv < 60 ? '正常偏低' : '正常';
    const scoreLabel = m.health_score > 75 ? '良好' : m.health_score > 60 ? '中等' : '需关注';
    const balanceLabel = m.autonomic_balance > 2.5 ? '交感神经主导' : m.autonomic_balance > 1.8 ? '基本平衡' : '副交感神经主导';

    return `### 总体健康状态概述

根据您本次智能坐垫检测数据综合分析，您的整体健康状况处于**${scoreLabel}**水平（综合评分 **${m.health_score}分**）。

心率平均值 ${m.avg_hr} 次/分，${m.avg_hr > 85 ? '略高于正常范围上限（60-85bpm），提示身体可能处于应激或紧张状态' : '处于正常范围内（60-85bpm）'}。心率变异性（HRV）为 ${m.hrv}ms，${hrvLabel}，${m.hrv < 40 ? '提示自主神经调节功能有待提升，可能与长期压力累积有关' : '显示自主神经调节功能基本正常'}。呼吸频率平均 ${m.avg_br} 次/分，${m.avg_br > 18 ? '略高于最优范围（12-18次/分），可能反映呼吸偏浅、焦虑情绪或体质偏虚' : '处于正常范围（12-18次/分）'}。坐姿正确率 ${m.posture_correct_rate}%，${m.posture_correct_rate > 70 ? '整体坐姿习惯良好' : '存在较多重心偏移，需注意坐姿矫正'}。

### 各板块详细分析

**🫀 心血管系统评估**
您的HRV值为 ${m.hrv}ms，${m.hrv < 50 ? '低于同龄人群参考范围（45-65ms），提示交感神经活性偏高，副交感神经（迷走神经）调节能力不足。长期低HRV与心血管事件风险增加存在相关性。建议关注睡眠质量和日常压力管理。' : '处于同龄人群正常参考范围，心脏自主神经调节功能良好，心脏储备能力充足。'}心率波动范围 ${m.min_hr}-${m.max_hr} 次/分，${m.max_hr - m.min_hr > 30 ? '波动幅度偏大（差值>' + (m.max_hr - m.min_hr) + 'bpm），可能与检测期间情绪波动、体位微调或环境刺激有关。' : '波动幅度正常，心血管稳定性良好。'}

**🧠 情绪与神经系统分析**
自主神经平衡指数为 ${m.autonomic_balance}（正常参考范围1.0-2.0），当前状态为"${balanceLabel}"。${m.autonomic_balance > 2.5 ? '您的身体正处于交感神经相对亢奋状态，类似于长时间处在"战斗或逃跑"反应的边缘。这种状态下容易出现心跳加速、肌肉紧张、注意力过度集中但创造力下降的表现。长期维持此状态可能导致肾上腺疲劳。' : m.autonomic_balance > 2.0 ? '自主神经略偏向交感活跃，建议适当进行放松训练。' : '自主神经系统处于良好的平衡状态，说明身心协调性较好，副交感神经（\"休息与修复\"模式）功能正常。'}

压力敏感度达到 ${m.stress_sensitivity}%，属于${stressLabel}压力状态。焦虑指数 ${m.anxiety_level}%，疲劳指数 ${m.fatigue_index}%。${m.stress_sensitivity > 70 ? '综合来看，您的情绪系统正承受较大负荷，建议优先进行压力干预。' : '情绪系统总体处于可控范围。'}

**🏥 中医体质评估**
根据您的生理指标综合推演，主要体质倾向为**"${m.tcm_constitution.primary}"**（评分${m.tcm_constitution.primary_score}分），次要体质倾向为**"${m.tcm_constitution.secondary}"**（评分${m.tcm_constitution.secondary_score}分）。

${m.tcm_constitution.primary === '阴虚质' ? '**阴虚质特征解读：**阴虚质人群多因长期劳心、熬夜、饮食偏燥热所致。常表现为口干咽燥、手足心热、心烦失眠、盗汗、小便短黄。您的呼吸频率偏快、压力指数偏高、心率偏高均符合阴虚内热的体质表现。' : m.tcm_constitution.primary === '气郁质' ? '**气郁质特征解读：**气郁质人群多因情志不畅、长期精神压力所致。常表现为情志抑郁、胸胁胀满、善太息（爱叹气）、咽部有异物感。您的压力敏感度偏高与此体质特征相符。' : m.tcm_constitution.primary === '血瘀质' ? '**血瘀质特征解读：**血瘀质人群面色偏暗，容易出现身体固定部位的刺痛或胀痛，舌质紫暗或有瘀斑。您的坐姿不稳定、重心频繁偏移提示气血运行不畅。' : '**体质解读：**建议结合中医师面诊、舌诊、脉诊进一步确认体质类型，制定个性化调理方案。'}

### 风险指标预警

${m.stress_sensitivity > 80 ? '🔴 **重度风险：** 压力敏感度过高（' + m.stress_sensitivity + '%），已超过警戒阈值。持续高压力状态可能诱发焦虑障碍、失眠、消化系统问题。建议立即采取压力缓解措施。' : '🔴 **重度风险：** 暂无重度风险指标'}

${m.hrv < 40 ? '🟡 **中度风险：** HRV偏低（' + m.hrv + 'ms），心脏自主神经调节能力下降，需关注长期压力对心血管系统的累积影响。' : ''}${m.stress_sensitivity > 60 && m.stress_sensitivity <= 80 ? '🟡 **中度风险：** 压力敏感度偏高（' + m.stress_sensitivity + '%），已进入需要关注的区间，建议加强日常压力管理。' : ''}${m.anxiety_level > 60 ? '🟡 **中度风险：** 焦虑指数偏高（' + m.anxiety_level + '%），情绪管理需要加强，建议学习情绪调节技巧。' : ''}${m.fatigue_index > 65 ? '🟡 **中度风险：** 疲劳指数偏高（' + m.fatigue_index + '%），提示身体恢复能力不足，需改善睡眠质量。' : ''}

${m.posture_correct_rate < 70 ? '🟢 **轻度风险：** 坐姿偏移频率偏高（正确率仅' + m.posture_correct_rate + '%），可能与腰椎疲劳、核心肌群力量不足相关。' : '🟢 **轻度风险：** 坐姿习惯良好，各基础指标基本在正常范围内。'}

### 个性化健康建议

**📅 短期调整（1-3个月）：**

- **呼吸训练：** 每日进行10-15分钟的腹式深呼吸训练。推荐"4-7-8呼吸法"——吸气4秒、屏息7秒、呼气8秒，每组重复4次。此方法可快速激活副交感神经，降低压力反应。
- **睡眠优化：** 晚间21:00后减少蓝光暴露，保持卧室温度在18-22°C，使用遮光窗帘。建议23:00前入睡，保证7-8小时睡眠。
- **营养补充：** 增加富含Omega-3脂肪酸的食物（深海鱼、核桃、亚麻籽），有助于降低炎症反应和改善HRV。增加富含镁的食物（深绿叶蔬菜、坚果、全谷物），有助于放松神经系统。
- **运动处方：** 每周2-3次中等强度有氧运动（快走30分钟、游泳、瑜伽），有助于提升HRV和改善自主神经调节。
${m.stress_sensitivity > 60 ? '- **正念冥想：** 推荐每日进行5-10分钟正念冥想练习，可使用"潮汐""小睡眠"等APP辅助引导。持续练习4周通常即可观察到压力指数的明显改善。' : '- **保持节律：** 维持当前良好的生活节奏，注意劳逸结合。'}

**📅 长期干预（6-12个月）：**

- **冥想习惯建立：** 从每日5分钟逐步增加至20分钟，建立稳定的冥想习惯。研究表明，持续8周的正念训练可显著改善HRV、降低基础皮质醇水平。
- ${m.tcm_constitution.primary === '阴虚质' ? '**中医调理方案：** 治则以"滋阴降火"为主。推荐方剂：六味地黄丸加减（需在执业中医师指导下使用）。日常可服用石斛、麦冬、玉竹泡水代茶饮。' : m.tcm_constitution.primary === '气郁质' ? '**中医调理方案：** 治则以"疏肝理气"为主。推荐方剂：逍遥散加减（需在执业中医师指导下使用）。日常可用玫瑰花、佛手、陈皮泡水代茶饮。' : m.tcm_constitution.primary === '血瘀质' ? '**中医调理方案：** 治则以"活血化瘀"为主。推荐方剂：血府逐瘀汤加减（需在执业中医师指导下使用）。日常可用当归、丹参、山楂泡水代茶饮。' : '**中医调理方案：** 建议到专业中医馆进行体质辨识和面诊，制定个性化的调理方案。可根据四季变化适当调整饮食和作息。'}
- **饮食调理：** ${m.tcm_constitution.primary === '阴虚质' ? '多食银耳、百合、莲子、枸杞、黑芝麻等滋阴食材；少食辛辣、煎炸、烧烤等燥热之品；忌浓茶、咖啡过量摄入。' : '均衡饮食为主，多食时令蔬果，适当补充B族维生素（全谷物、蛋类、瘦肉）。每日饮水量保证1500-2000ml。'}
- **作息调整：** 严格保持23:00前入睡的习惯，午间小憩15-20分钟（不超过30分钟），有助于恢复副交感神经功能。
- **定期复查：** 建议每月进行1次智能坐垫检测，持续跟踪HRV、压力指数、自主神经平衡等核心指标的变化趋势。通过纵向数据对比，及时调整干预策略。

> ⚠️ *本报告由AI辅助生成，仅供参考。具体诊疗建议请咨询专业医疗机构。中药方剂需在执业中医师指导下使用。*`;
  }
}
