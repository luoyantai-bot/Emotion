/**
 * ============================================================
 * In-Memory Database with Seed Data
 * ============================================================
 */

const { v4: uuidv4 } = require('uuid');
const {
  MockAlgorithmService,
  generateMockRawData,
  generateFallbackReport,
} = require('./services.cjs');

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

    this.seed();
  }

  seed() {
    console.log('📦 [Database] 初始化种子数据...');

    // ── Tenants ──
    this.tenants = [
      { id: 'T001', name: '同仁堂·东长治路店', type: '中医馆', created_at: '2024-01-01 00:00:00' },
      { id: 'T002', name: '悦榕庄·三亚店', type: '酒店', created_at: '2024-01-01 00:00:00' },
    ];

    // ── Users ──
    this.users = [
      { id: 'U001', tenant_id: 'T001', name: '张三', gender: '男', age: 35, height: 175, weight: 72, bmi: 23.5, latest_stress: 68, latest_score: 72, tag: '中度焦虑' },
      { id: 'U002', tenant_id: 'T001', name: '李芳', gender: '女', age: 28, height: 163, weight: 55, bmi: 20.7, latest_stress: 82, latest_score: 58, tag: '重度焦虑' },
      { id: 'U003', tenant_id: 'T001', name: '王伟', gender: '男', age: 42, height: 180, weight: 85, bmi: 26.2, latest_stress: 45, latest_score: 81, tag: '轻度压力' },
      { id: 'U004', tenant_id: 'T001', name: '赵敏', gender: '女', age: 31, height: 168, weight: 58, bmi: 20.5, latest_stress: 71, latest_score: 65, tag: '中度焦虑' },
      { id: 'U005', tenant_id: 'T001', name: '陈晨', gender: '男', age: 55, height: 170, weight: 78, bmi: 27.0, latest_stress: 38, latest_score: 85, tag: '正常' },
      { id: 'U006', tenant_id: 'T001', name: '刘洋', gender: '女', age: 26, height: 160, weight: 50, bmi: 19.5, latest_stress: 88, latest_score: 52, tag: '重度焦虑' },
      { id: 'U007', tenant_id: 'T001', name: '孙磊', gender: '男', age: 38, height: 178, weight: 80, bmi: 25.2, latest_stress: 55, latest_score: 74, tag: '轻度压力' },
      { id: 'U008', tenant_id: 'T001', name: '周婷', gender: '女', age: 45, height: 165, weight: 62, bmi: 22.8, latest_stress: 62, latest_score: 70, tag: '中度焦虑' },
    ];

    // ── Devices ──
    this.devices = [
      { device_id: 'Z4U524060082', tenant_id: 'T001', status: '使用中', model: 'CushionPro V2', last_heartbeat: new Date().toISOString() },
      { device_id: 'Z4U524060083', tenant_id: 'T001', status: '在线', model: 'CushionPro V2', last_heartbeat: new Date().toISOString() },
      { device_id: 'Z4U524060084', tenant_id: 'T001', status: '在线', model: 'CushionPro V2', last_heartbeat: new Date().toISOString() },
      { device_id: 'Z4U524060085', tenant_id: 'T001', status: '离线', model: 'CushionPro V1', last_heartbeat: null },
    ];

    // ── Rules ──
    this.rules = [
      { id: 'R001', tenant_id: 'T001', metric: '压力敏感度', operator: '>', value: 80, device_type: '香薰机', action: '开启', parameter: '薰衣草精油，强度50%', enabled: true, created_at: '2024-01-10 10:00:00' },
      { id: 'R002', tenant_id: 'T001', metric: '压力敏感度', operator: '>', value: 70, device_type: '智能灯光', action: '调暗', parameter: '暖色调，亮度30%', enabled: true, created_at: '2024-01-10 10:00:00' },
      { id: 'R003', tenant_id: 'T001', metric: '焦虑指数', operator: '>', value: 75, device_type: '智能音箱', action: '播放', parameter: '自然白噪音·森林雨声', enabled: true, created_at: '2024-01-10 10:00:00' },
      { id: 'R004', tenant_id: 'T001', metric: 'HRV', operator: '<', value: 30, device_type: '香薰机', action: '开启', parameter: '佛手柑精油，强度30%', enabled: false, created_at: '2024-01-10 10:00:00' },
    ];

    // ── Activities ──
    this.activities = [
      { id: 'A001', tenant_id: 'T001', title: '周五颂钵音疗体验', description: '由资深音疗师带领，通过颂钵共振频率帮助深度放松，适合高压力人群。', date: '2024-01-19 19:00', target_tag: '重度焦虑', matched_users: 2, status: '已发布' },
      { id: 'A002', tenant_id: 'T001', title: '正念冥想入门工作坊', description: '学习正念呼吸与身体扫描技巧，帮助建立日常冥想习惯。', date: '2024-01-22 14:00', target_tag: '中度焦虑', matched_users: 3, status: '草稿' },
      { id: 'A003', tenant_id: 'T001', title: '中医养生茶道体验', description: '根据体质辨证推荐个性化养生茶饮，学习日常养生方法。', date: '2024-01-12 15:00', target_tag: '轻度压力', matched_users: 2, status: '已结束' },
    ];

    // ── Pre-generate Measurement Records ──
    console.log('📦 [Database] 使用算法引擎预生成检测记录...');

    const measurementConfigs = [
      { seed: 42,  userId: 'U001', userName: '张三', duration: 30, scenario: 'normal',   id: 'MR-001', startTime: '2024-01-15 14:00:00' },
      { seed: 88,  userId: 'U002', userName: '李芳', duration: 25, scenario: 'stressed', id: 'MR-002', startTime: '2024-01-15 15:00:00' },
      { seed: 123, userId: 'U003', userName: '王伟', duration: 15, scenario: 'relaxed',  id: 'MR-003', startTime: '2024-01-15 16:00:00' },
      { seed: 200, userId: 'U004', userName: '赵敏', duration: 20, scenario: 'normal',   id: 'MR-004', startTime: '2024-01-15 17:00:00' },
    ];

    for (const config of measurementConfigs) {
      const record = this._generateMeasurementRecord(config);
      this.measurements.push(record);

      const user = this.users.find(u => u.id === config.userId);
      if (user) {
        user.latest_stress = record.derived_metrics.stress_sensitivity;
        user.latest_score = record.derived_metrics.health_score;
      }
    }

    // ── Pre-generate Intervention Logs ──
    this.interventionLogs = [
      { id: 'L001', tenant_id: 'T001', user_id: 'U002', user_name: '李芳', rule_id: 'R001', triggered_at: '2024-01-15 14:32:00', metric_name: '压力敏感度', metric_value: 82, threshold: 80, operator: '>', action_description: '香薰机：开启薰衣草精油，强度50%', device_type: '香薰机', status: '已执行' },
      { id: 'L002', tenant_id: 'T001', user_id: 'U002', user_name: '李芳', rule_id: 'R002', triggered_at: '2024-01-15 14:32:00', metric_name: '压力敏感度', metric_value: 82, threshold: 70, operator: '>', action_description: '智能灯光：调暗暖色调，亮度30%', device_type: '智能灯光', status: '已执行' },
      { id: 'L003', tenant_id: 'T001', user_id: 'U006', user_name: '刘洋', rule_id: 'R001', triggered_at: '2024-01-15 15:10:00', metric_name: '压力敏感度', metric_value: 88, threshold: 80, operator: '>', action_description: '香薰机：开启薰衣草精油，强度50%', device_type: '香薰机', status: '已执行' },
      { id: 'L004', tenant_id: 'T001', user_id: 'U006', user_name: '刘洋', rule_id: 'R003', triggered_at: '2024-01-15 15:10:00', metric_name: '焦虑指数', metric_value: 79, threshold: 75, operator: '>', action_description: '智能音箱：播放自然白噪音·森林雨声', device_type: '智能音箱', status: '已执行' },
      { id: 'L005', tenant_id: 'T001', user_id: 'U004', user_name: '赵敏', rule_id: 'R002', triggered_at: '2024-01-15 16:05:00', metric_name: '压力敏感度', metric_value: 71, threshold: 70, operator: '>', action_description: '智能灯光：调暗暖色调，亮度30%', device_type: '智能灯光', status: '已执行' },
    ];

    console.log(`📦 [Database] 种子数据初始化完成:
    - ${this.tenants.length} 个商家
    - ${this.users.length} 个用户
    - ${this.devices.length} 台设备
    - ${this.measurements.length} 条检测记录
    - ${this.rules.length} 条干预规则
    - ${this.interventionLogs.length} 条干预日志
    - ${this.activities.length} 个活动\n`);
  }

  _generateMeasurementRecord(config) {
    const rawData = generateMockRawData(config.duration, config.seed, config.scenario);
    const service = new MockAlgorithmService();
    const result = service.compute(rawData);

    const m = result.derived_metrics;
    const endMinutes = parseInt(config.startTime.split(':')[1]) + config.duration;
    const endHour = parseInt(config.startTime.split(':')[0].split(' ')[1]) + Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const datePart = config.startTime.split(' ')[0];
    const endTime = `${datePart} ${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

    const aiAnalysis = generateFallbackReport(m, config.duration);

    return {
      id: config.id,
      user_id: config.userId,
      user_name: config.userName,
      device_id: 'Z4U524060082',
      start_time: config.startTime,
      end_time: endTime,
      duration_minutes: config.duration,
      hr_timeline: result.hr_timeline,
      br_timeline: result.br_timeline,
      time_labels: result.time_labels,
      derived_metrics: result.derived_metrics,
      ai_analysis: aiAnalysis,
      algorithm_log: result.algorithm_log,
    };
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

module.exports = new Database();
