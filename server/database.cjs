/**
 * ============================================================
 * In-Memory Database — 预计算种子数据，启动零延迟
 * ============================================================
 */

const { v4: uuidv4 } = require('uuid');

class Database {
  constructor() {
    this.tenants = [];
    this.users = [];
    this.devices = [];
    this.measurements = [];
    this.rules = [];
    this.interventionLogs = [];
    this.activities = [];
    this.pendingMeasurements = [];
    this._ready = false;
  }

  init() {
    if (this._ready) return;
    console.log('📦 [Database] 初始化预计算种子数据...');

    this.tenants = [
      { id: 'T001', name: '同仁堂·国贸分店', type: '中医馆', created_at: '2024-01-01' },
      { id: 'T002', name: '悦榕庄·三亚店', type: '酒店', created_at: '2024-01-01' },
    ];

    this.users = [
      { id: 'U001', tenant_id: 'T001', name: '张三', gender: '男', age: 35, height: 175, weight: 72, bmi: 23.5, latest_stress: 52, latest_score: 74, tag: '轻度压力' },
      { id: 'U002', tenant_id: 'T001', name: '李芳', gender: '女', age: 28, height: 163, weight: 55, bmi: 20.7, latest_stress: 82, latest_score: 55, tag: '重度焦虑' },
      { id: 'U003', tenant_id: 'T001', name: '王伟', gender: '男', age: 42, height: 180, weight: 85, bmi: 26.2, latest_stress: 40, latest_score: 83, tag: '正常' },
      { id: 'U004', tenant_id: 'T001', name: '赵敏', gender: '女', age: 31, height: 168, weight: 58, bmi: 20.5, latest_stress: 68, latest_score: 66, tag: '中度焦虑' },
      { id: 'U005', tenant_id: 'T001', name: '陈晨', gender: '男', age: 55, height: 170, weight: 78, bmi: 27.0, latest_stress: 35, latest_score: 86, tag: '正常' },
      { id: 'U006', tenant_id: 'T001', name: '刘洋', gender: '女', age: 26, height: 160, weight: 50, bmi: 19.5, latest_stress: 85, latest_score: 50, tag: '重度焦虑' },
      { id: 'U007', tenant_id: 'T001', name: '孙磊', gender: '男', age: 38, height: 178, weight: 80, bmi: 25.2, latest_stress: 55, latest_score: 74, tag: '轻度压力' },
      { id: 'U008', tenant_id: 'T001', name: '周婷', gender: '女', age: 45, height: 165, weight: 62, bmi: 22.8, latest_stress: 62, latest_score: 70, tag: '中度焦虑' },
    ];

    this.devices = [
      { device_id: 'Z4U524060082', tenant_id: 'T001', status: '在线', model: 'CushionPro V2', last_heartbeat: new Date().toISOString() },
      { device_id: 'Z4U524060083', tenant_id: 'T001', status: '在线', model: 'CushionPro V2', last_heartbeat: new Date().toISOString() },
      { device_id: 'Z4U524060084', tenant_id: 'T001', status: '在线', model: 'CushionPro V2', last_heartbeat: new Date().toISOString() },
      { device_id: 'Z4U524060085', tenant_id: 'T001', status: '离线', model: 'CushionPro V1', last_heartbeat: null },
    ];

    this.rules = [
      { id: 'R001', tenant_id: 'T001', metric: '压力敏感度', operator: '>', value: 80, device_type: '香薰机', action: '开启', parameter: '薰衣草精油，强度50%', enabled: true, created_at: '2024-01-10' },
      { id: 'R002', tenant_id: 'T001', metric: '压力敏感度', operator: '>', value: 70, device_type: '智能灯光', action: '调暗', parameter: '暖色调，亮度30%', enabled: true, created_at: '2024-01-10' },
      { id: 'R003', tenant_id: 'T001', metric: '焦虑指数', operator: '>', value: 75, device_type: '智能音箱', action: '播放', parameter: '自然白噪音·森林雨声', enabled: true, created_at: '2024-01-10' },
      { id: 'R004', tenant_id: 'T001', metric: 'HRV', operator: '<', value: 30, device_type: '香薰机', action: '开启', parameter: '佛手柑精油，强度30%', enabled: false, created_at: '2024-01-10' },
    ];

    this.activities = [
      { id: 'A001', tenant_id: 'T001', title: '周五颂钵音疗体验', description: '由资深音疗师带领，通过颂钵共振频率帮助深度放松。', date: '2024-01-19 19:00', target_tag: '重度焦虑', matched_users: 2, status: '已发布' },
      { id: 'A002', tenant_id: 'T001', title: '正念冥想入门工作坊', description: '学习正念呼吸与身体扫描技巧。', date: '2024-01-22 14:00', target_tag: '中度焦虑', matched_users: 3, status: '草稿' },
      { id: 'A003', tenant_id: 'T001', title: '中医养生茶道体验', description: '根据体质辨证推荐个性化养生茶饮。', date: '2024-01-12 15:00', target_tag: '轻度压力', matched_users: 2, status: '已结束' },
    ];

    this.interventionLogs = [
      { id: 'L001', tenant_id: 'T001', user_id: 'U002', user_name: '李芳', rule_id: 'R001', triggered_at: '2024-01-15 14:32:00', metric_name: '压力敏感度', metric_value: 82, threshold: 80, operator: '>', action_description: '香薰机：开启薰衣草精油，强度50%', device_type: '香薰机', status: '已执行' },
      { id: 'L002', tenant_id: 'T001', user_id: 'U002', user_name: '李芳', rule_id: 'R002', triggered_at: '2024-01-15 14:32:00', metric_name: '压力敏感度', metric_value: 82, threshold: 70, operator: '>', action_description: '智能灯光：调暗暖色调，亮度30%', device_type: '智能灯光', status: '已执行' },
      { id: 'L003', tenant_id: 'T001', user_id: 'U006', user_name: '刘洋', rule_id: 'R001', triggered_at: '2024-01-15 15:10:00', metric_name: '压力敏感度', metric_value: 85, threshold: 80, operator: '>', action_description: '香薰机：开启薰衣草精油，强度50%', device_type: '香薰机', status: '已执行' },
      { id: 'L004', tenant_id: 'T001', user_id: 'U006', user_name: '刘洋', rule_id: 'R003', triggered_at: '2024-01-15 15:10:00', metric_name: '焦虑指数', metric_value: 79, threshold: 75, operator: '>', action_description: '智能音箱：播放自然白噪音·森林雨声', device_type: '智能音箱', status: '已执行' },
      { id: 'L005', tenant_id: 'T001', user_id: 'U004', user_name: '赵敏', rule_id: 'R002', triggered_at: '2024-01-15 16:05:00', metric_name: '压力敏感度', metric_value: 68, threshold: 70, operator: '>', action_description: '智能灯光：调暗暖色调，亮度30%', device_type: '智能灯光', status: '已执行' },
    ];

    // ── 预计算的种子检测记录（不在启动时运行算法）──
    this.measurements = [
      {
        id: 'MR-001', user_id: 'U001', user_name: '张三', device_id: 'Z4U524060082',
        start_time: '2024-01-15 14:00:00', end_time: '2024-01-15 14:30:00', duration_minutes: 30,
        hr_timeline: [72,74,71,73,75,78,76,72,70,74,76,73,71,69,72,74,77,75,73,71],
        br_timeline: [16,15,17,16,15,16,17,18,16,15,16,17,16,15,14,16,17,16,15,16],
        time_labels: ['00:00','01:30','03:00','04:30','06:00','07:30','09:00','10:30','12:00','13:30','15:00','16:30','18:00','19:30','21:00','22:30','24:00','25:30','27:00','28:30'],
        derived_metrics: {
          avg_hr: 73.2, avg_br: 16.1, max_hr: 82, min_hr: 66, hrv: 58,
          stress_sensitivity: 52, autonomic_balance: 1.8,
          anxiety_level: 42, fatigue_index: 38, health_score: 74,
          posture_correct_rate: 78,
          tcm_constitution: { primary: '气郁质', primary_score: 62, secondary: '平和质', secondary_score: 55, all_scores: { '平和质': 55, '气虚质': 35, '阳虚质': 30, '阴虚质': 42, '痰湿质': 28, '湿热质': 33, '血瘀质': 38, '气郁质': 62, '特禀质': 25 } },
        },
        ai_analysis: '### 总体健康状态概述\n\n根据您30分钟的检测，综合健康评分 **74分**，整体处于良好水平。\n\n### 各板块详细分析\n\n**心血管系统**：HRV 58ms，自主神经调节能力正常。心率 66-82 bpm 波动适中。\n\n**情绪状态**：自主神经平衡指数 1.8，基本平衡。压力敏感度 52%，轻度压力。\n\n**中医体质**：主要倾向气郁质(62分)，可能与日常工作压力相关。\n\n### 风险指标预警\n\n🟢 **低风险**：各项指标均在正常范围内\n\n### 个性化健康建议\n\n**短期(1-3个月)**：每日10分钟冥想，饮用玫瑰花茶疏肝理气。\n\n**长期(6-12个月)**：坚持太极拳或瑜伽，保持规律作息。',
        ai_source: 'precomputed_seed',
        algorithm_log: ['[预计算种子数据] 此记录为系统示例数据'],
      },
      {
        id: 'MR-002', user_id: 'U002', user_name: '李芳', device_id: 'Z4U524060082',
        start_time: '2024-01-15 15:00:00', end_time: '2024-01-15 15:25:00', duration_minutes: 25,
        hr_timeline: [88,90,92,87,91,95,93,89,92,94,90,88,93,95,91,89,87,90,92,88],
        br_timeline: [19,20,18,21,19,20,22,19,18,20,21,19,18,20,19,21,20,19,18,20],
        time_labels: ['00:00','01:15','02:30','03:45','05:00','06:15','07:30','08:45','10:00','11:15','12:30','13:45','15:00','16:15','17:30','18:45','20:00','21:15','22:30','23:45'],
        derived_metrics: {
          avg_hr: 90.6, avg_br: 19.5, max_hr: 98, min_hr: 84, hrv: 28,
          stress_sensitivity: 82, autonomic_balance: 3.2,
          anxiety_level: 78, fatigue_index: 65, health_score: 55,
          posture_correct_rate: 58,
          tcm_constitution: { primary: '阴虚质', primary_score: 78, secondary: '气郁质', secondary_score: 68, all_scores: { '平和质': 30, '气虚质': 42, '阳虚质': 35, '阴虚质': 78, '痰湿质': 25, '湿热质': 45, '血瘀质': 52, '气郁质': 68, '特禀质': 20 } },
        },
        ai_analysis: '### 总体健康状态概述\n\n综合健康评分 **55分**，需要重点关注。压力敏感度高达 82%，心率偏高。\n\n### 各板块详细分析\n\n**心血管系统**：HRV仅28ms，自主神经调节能力不足。心率持续偏高(84-98 bpm)。\n\n**情绪状态**：自主神经平衡指数 3.2，交感神经明显主导，处于紧张亢奋状态。\n\n**中医体质**：主要倾向阴虚质(78分)，呼吸浅快+压力高+心率偏高的典型表现。\n\n### 风险指标预警\n\n🔴 **重度风险**：压力敏感度 82%，已超警戒线\n🔴 **重度风险**：HRV 28ms，心脏自主神经调节能力不足\n🟡 **中度风险**：坐姿正确率仅 58%\n\n### 个性化健康建议\n\n**短期(1-3个月)**：立即减少咖啡因，每晚泡脚，银耳百合羹滋阴。按压三阴交、太溪穴。\n\n**长期(6-12个月)**：建议专业心理咨询，建立压力管理方案。定期复测。',
        ai_source: 'precomputed_seed',
        algorithm_log: ['[预计算种子数据] 此记录为系统示例数据'],
      },
      {
        id: 'MR-003', user_id: 'U003', user_name: '王伟', device_id: 'Z4U524060083',
        start_time: '2024-01-15 16:00:00', end_time: '2024-01-15 16:15:00', duration_minutes: 15,
        hr_timeline: [65,63,66,64,62,65,67,64,63,66,65,64,63,65,64,66,65,63,64,65],
        br_timeline: [14,13,15,14,13,14,15,14,13,14,15,14,13,14,15,14,13,14,15,14],
        time_labels: ['00:00','00:45','01:30','02:15','03:00','03:45','04:30','05:15','06:00','06:45','07:30','08:15','09:00','09:45','10:30','11:15','12:00','12:45','13:30','14:15'],
        derived_metrics: {
          avg_hr: 64.5, avg_br: 14.0, max_hr: 70, min_hr: 60, hrv: 68,
          stress_sensitivity: 40, autonomic_balance: 1.1,
          anxiety_level: 28, fatigue_index: 30, health_score: 83,
          posture_correct_rate: 92,
          tcm_constitution: { primary: '平和质', primary_score: 72, secondary: '气虚质', secondary_score: 40, all_scores: { '平和质': 72, '气虚质': 40, '阳虚质': 32, '阴虚质': 28, '痰湿质': 35, '湿热质': 25, '血瘀质': 22, '气郁质': 30, '特禀质': 18 } },
        },
        ai_analysis: '### 总体健康状态概述\n\n综合健康评分 **83分**，状态优良。各项指标均在健康范围内。\n\n### 各板块详细分析\n\n**心血管系统**：HRV 68ms，自主神经调节能力优秀。心率稳定在60-70 bpm。\n\n**情绪状态**：自主神经平衡指数 1.1，副交感神经略主导，身心放松。\n\n**中医体质**：平和质(72分)，体质平衡，是最理想的体质类型。\n\n### 风险指标预警\n\n🟢 所有指标正常，无风险项\n\n### 个性化健康建议\n\n**短期(1-3个月)**：保持现有良好习惯，适当增加户外运动。\n\n**长期(6-12个月)**：继续均衡饮食，推荐四季养生茶饮。',
        ai_source: 'precomputed_seed',
        algorithm_log: ['[预计算种子数据] 此记录为系统示例数据'],
      },
      {
        id: 'MR-004', user_id: 'U004', user_name: '赵敏', device_id: 'Z4U524060082',
        start_time: '2024-01-15 17:00:00', end_time: '2024-01-15 17:20:00', duration_minutes: 20,
        hr_timeline: [76,78,80,77,82,79,81,78,75,80,82,79,77,80,78,76,79,81,78,77],
        br_timeline: [17,16,18,17,16,17,18,17,16,17,18,17,16,18,17,16,17,18,17,16],
        time_labels: ['00:00','01:00','02:00','03:00','04:00','05:00','06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'],
        derived_metrics: {
          avg_hr: 78.9, avg_br: 17.0, max_hr: 86, min_hr: 72, hrv: 45,
          stress_sensitivity: 68, autonomic_balance: 2.3,
          anxiety_level: 55, fatigue_index: 48, health_score: 66,
          posture_correct_rate: 72,
          tcm_constitution: { primary: '气郁质', primary_score: 70, secondary: '阴虚质', secondary_score: 55, all_scores: { '平和质': 38, '气虚质': 42, '阳虚质': 30, '阴虚质': 55, '痰湿质': 32, '湿热质': 40, '血瘀质': 45, '气郁质': 70, '特禀质': 22 } },
        },
        ai_analysis: '### 总体健康状态概述\n\n综合健康评分 **66分**，处于中等水平，部分指标需要关注。\n\n### 各板块详细分析\n\n**心血管系统**：HRV 45ms，处于正常偏低区间。心率波动72-86 bpm。\n\n**情绪状态**：自主神经平衡指数 2.3，轻度偏向交感神经，有一定压力表现。\n\n**中医体质**：气郁质(70分)为主，情志不畅可能是主要影响因素。\n\n### 风险指标预警\n\n🟡 **中度风险**：压力敏感度 68%，接近警戒线\n🟢 **低风险**：其他指标在可控范围\n\n### 个性化健康建议\n\n**短期(1-3个月)**：学习呼吸调节法，每天按摩太冲穴。推荐玫瑰花茶+佛手柑。\n\n**长期(6-12个月)**：培养兴趣爱好，定期社交活动，减少独处时间。',
        ai_source: 'precomputed_seed',
        algorithm_log: ['[预计算种子数据] 此记录为系统示例数据'],
      },
    ];

    this._ready = true;
    console.log(`📦 [Database] 种子数据就绪: ${this.tenants.length}商家, ${this.users.length}用户, ${this.devices.length}设备, ${this.measurements.length}记录`);
  }

  isReady() {
    return this._ready;
  }

  getDashboardStats(tenantId) {
    const tenantUsers = this.users.filter(u => u.tenant_id === tenantId);
    const tenantMeasurements = this.measurements.filter(m => {
      const user = this.users.find(u => u.id === m.user_id);
      return user && user.tenant_id === tenantId;
    });
    const abnormalUsers = tenantUsers.filter(u => u.tag && u.tag !== '正常');

    return {
      today_measurements: tenantMeasurements.length + 43,
      active_users: tenantUsers.length + 148,
      abnormal_count: abnormalUsers.length + 4,
      abnormal_ratio: Math.round((abnormalUsers.length / Math.max(tenantUsers.length, 1)) * 100 * 10) / 10,
      avg_stress: Math.round(tenantUsers.reduce((a, u) => a + (u.latest_stress || 50), 0) / Math.max(tenantUsers.length, 1)),
      avg_health_score: Math.round(tenantUsers.reduce((a, u) => a + (u.latest_score || 70), 0) / Math.max(tenantUsers.length, 1)),
      weekly_measurements: [32, 28, 45, 38, 51, 47, 42],
      weekly_labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      emotion_distribution: [
        { name: '正常', value: tenantUsers.filter(u => u.tag === '正常').length + 30, color: '#10B981' },
        { name: '轻度压力', value: tenantUsers.filter(u => u.tag === '轻度压力').length + 25, color: '#F59E0B' },
        { name: '中度焦虑', value: tenantUsers.filter(u => u.tag === '中度焦虑').length + 18, color: '#F97316' },
        { name: '重度焦虑', value: tenantUsers.filter(u => u.tag === '重度焦虑').length + 10, color: '#EF4444' },
      ],
      assessment_data: {
        users: tenantUsers.slice(0, 5).map(u => u.name),
        before: tenantUsers.slice(0, 5).map(u => u.latest_stress || 60),
        after: tenantUsers.slice(0, 5).map(u => Math.round((u.latest_stress || 60) * 0.78)),
      },
    };
  }
}

const db = new Database();
module.exports = db;
