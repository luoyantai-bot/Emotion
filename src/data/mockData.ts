/**
 * Mock Data Layer - 统一数据源
 * 
 * 整合 MockAlgorithmService + InterventionEngine + AIService
 * 提供预生成的测试数据
 */

import {
  MockAlgorithmService,
  generateMockRawData,
  type MQTTPayload,
  type DerivedMetrics,
  type AlgorithmResult,
} from '../services/MockAlgorithmService';
import {
  InterventionEngine,
  type InterventionRule,
  type InterventionLog,
} from '../services/InterventionEngine';

// Re-export types
export type { MQTTPayload, DerivedMetrics, AlgorithmResult, InterventionRule, InterventionLog };
export { MockAlgorithmService, generateMockRawData, InterventionEngine };

// ============ Additional Types ============
export interface Tenant {
  id: string;
  name: string;
  type: '中医馆' | '酒店';
}

export interface User {
  id: string;
  tenant_id: string;
  name: string;
  gender: '男' | '女';
  age: number;
  height: number;
  weight: number;
  bmi: number;
  latest_stress?: number;
  latest_score?: number;
  tag?: string;
}

export interface Device {
  device_id: string;
  tenant_id: string;
  status: '在线' | '离线' | '使用中';
  model: string;
}

export interface MeasurementRecord {
  id: string;
  user_id: string;
  user_name: string;
  device_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  hr_timeline: number[];
  br_timeline: number[];
  time_labels: string[];
  derived_metrics: DerivedMetrics;
  ai_analysis: string;
  algorithm_log?: string[];
}

export interface Activity {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  date: string;
  target_tag: string;
  matched_users: number;
  status: '草稿' | '已发布' | '已结束';
}

// ============ Generate Measurement via Algorithm Service ============
function generateMeasurementRecord(
  seed: number,
  userName: string,
  userId: string,
  durationMinutes: number,
  scenario: 'normal' | 'stressed' | 'relaxed',
  recordId: string,
  startTime: string,
): MeasurementRecord {
  const rawData = generateMockRawData(durationMinutes, seed, scenario);
  const service = new MockAlgorithmService();
  const result = service.compute(rawData);

  // Generate simplified AI analysis
  const m = result.derived_metrics;
  const stressLabel = m.stress_sensitivity > 70 ? '偏高' : m.stress_sensitivity > 50 ? '中等' : '正常';
  const scoreLabel = m.health_score > 75 ? '良好' : m.health_score > 60 ? '中等' : '需关注';

  const endMinutes = parseInt(startTime.split(':')[1]) + durationMinutes;
  const endHour = parseInt(startTime.split(':')[0].split(' ')[1]) + Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;
  const datePart = startTime.split(' ')[0];
  const endTime = `${datePart} ${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

  return {
    id: recordId,
    user_id: userId,
    user_name: userName,
    device_id: 'Z4U524060082',
    start_time: startTime,
    end_time: endTime,
    duration_minutes: durationMinutes,
    hr_timeline: result.hr_timeline,
    br_timeline: result.br_timeline,
    time_labels: result.time_labels,
    derived_metrics: result.derived_metrics,
    ai_analysis: `### 总体健康状态概述\n\n根据您${durationMinutes}分钟的智能坐垫检测数据综合分析，您的整体健康状况处于**${scoreLabel}**水平（综合评分 **${m.health_score}分**）。心率平均值 ${m.avg_hr} 次/分，心率变异性（HRV）为 ${m.hrv}ms。压力敏感度 ${m.stress_sensitivity}%，属于${stressLabel}水平。\n\n### 各板块详细分析\n\n**🫀 心血管系统评估**\nHRV值为 ${m.hrv}ms，心率波动范围 ${m.min_hr}-${m.max_hr} bpm。自主神经平衡指数 ${m.autonomic_balance}。\n\n**🧠 情绪与神经系统**\n焦虑指数 ${m.anxiety_level}%，疲劳指数 ${m.fatigue_index}%。\n\n**🏥 中医体质**\n主要体质：${m.tcm_constitution.primary}（${m.tcm_constitution.primary_score}分）\n\n### 风险指标预警\n\n${m.stress_sensitivity > 70 ? '🟡 压力敏感度偏高，建议加强管理' : '🟢 各项指标基本正常'}\n\n### 个性化健康建议\n\n- 坚持每日深呼吸训练10分钟\n- 保持23:00前入睡\n- 每周运动2-3次`,
    algorithm_log: result.algorithm_log,
  };
}

// ============ Pre-generated Data ============
export const mockTenants: Tenant[] = [
  { id: 'T001', name: '同仁堂·国贸分店', type: '中医馆' },
  { id: 'T002', name: '悦榕庄·三亚店', type: '酒店' },
];

export const mockUsers: User[] = [
  { id: 'U001', tenant_id: 'T001', name: '张三', gender: '男', age: 35, height: 175, weight: 72, bmi: 23.5, latest_stress: 68, latest_score: 72, tag: '中度焦虑' },
  { id: 'U002', tenant_id: 'T001', name: '李芳', gender: '女', age: 28, height: 163, weight: 55, bmi: 20.7, latest_stress: 82, latest_score: 58, tag: '重度焦虑' },
  { id: 'U003', tenant_id: 'T001', name: '王伟', gender: '男', age: 42, height: 180, weight: 85, bmi: 26.2, latest_stress: 45, latest_score: 81, tag: '轻度压力' },
  { id: 'U004', tenant_id: 'T001', name: '赵敏', gender: '女', age: 31, height: 168, weight: 58, bmi: 20.5, latest_stress: 71, latest_score: 65, tag: '中度焦虑' },
  { id: 'U005', tenant_id: 'T001', name: '陈晨', gender: '男', age: 55, height: 170, weight: 78, bmi: 27.0, latest_stress: 38, latest_score: 85, tag: '正常' },
  { id: 'U006', tenant_id: 'T001', name: '刘洋', gender: '女', age: 26, height: 160, weight: 50, bmi: 19.5, latest_stress: 88, latest_score: 52, tag: '重度焦虑' },
  { id: 'U007', tenant_id: 'T001', name: '孙磊', gender: '男', age: 38, height: 178, weight: 80, bmi: 25.2, latest_stress: 55, latest_score: 74, tag: '轻度压力' },
  { id: 'U008', tenant_id: 'T001', name: '周婷', gender: '女', age: 45, height: 165, weight: 62, bmi: 22.8, latest_stress: 62, latest_score: 70, tag: '中度焦虑' },
];

export const mockDevices: Device[] = [
  { device_id: 'Z4U524060082', tenant_id: 'T001', status: '使用中', model: 'CushionPro V2' },
  { device_id: 'Z4U524060083', tenant_id: 'T001', status: '在线', model: 'CushionPro V2' },
  { device_id: 'Z4U524060084', tenant_id: 'T001', status: '在线', model: 'CushionPro V2' },
  { device_id: 'Z4U524060085', tenant_id: 'T001', status: '离线', model: 'CushionPro V1' },
];

// 使用 MockAlgorithmService 生成检测记录
export const mockRecords: MeasurementRecord[] = [
  generateMeasurementRecord(42, '张三', 'U001', 30, 'normal', 'MR-001', '2024-01-15 14:00:00'),
  generateMeasurementRecord(88, '李芳', 'U002', 25, 'stressed', 'MR-002', '2024-01-15 15:00:00'),
  generateMeasurementRecord(123, '王伟', 'U003', 15, 'relaxed', 'MR-003', '2024-01-15 16:00:00'),
  generateMeasurementRecord(200, '赵敏', 'U004', 20, 'normal', 'MR-004', '2024-01-15 17:00:00'),
];

export const defaultRules: InterventionRule[] = [
  { id: 'R001', tenant_id: 'T001', metric: '压力敏感度', operator: '>', value: 80, device_type: '香薰机', action: '开启', parameter: '薰衣草精油，强度50%', enabled: true },
  { id: 'R002', tenant_id: 'T001', metric: '压力敏感度', operator: '>', value: 70, device_type: '智能灯光', action: '调暗', parameter: '暖色调，亮度30%', enabled: true },
  { id: 'R003', tenant_id: 'T001', metric: '焦虑指数', operator: '>', value: 75, device_type: '智能音箱', action: '播放', parameter: '自然白噪音·森林雨声', enabled: true },
  { id: 'R004', tenant_id: 'T001', metric: 'HRV', operator: '<', value: 30, device_type: '香薰机', action: '开启', parameter: '佛手柑精油，强度30%', enabled: false },
];

export const defaultLogs: InterventionLog[] = [
  { id: 'L001', tenant_id: 'T001', user_id: 'U002', user_name: '李芳', rule_id: 'R001', triggered_at: '2024-01-15 14:32:00', metric_name: '压力敏感度', metric_value: 82, threshold: 80, operator: '>', action_description: '香薰机：开启薰衣草精油，强度50%', device_type: '香薰机', status: '已执行' },
  { id: 'L002', tenant_id: 'T001', user_id: 'U002', user_name: '李芳', rule_id: 'R002', triggered_at: '2024-01-15 14:32:00', metric_name: '压力敏感度', metric_value: 82, threshold: 70, operator: '>', action_description: '智能灯光：调暗暖色调，亮度30%', device_type: '智能灯光', status: '已执行' },
  { id: 'L003', tenant_id: 'T001', user_id: 'U006', user_name: '刘洋', rule_id: 'R001', triggered_at: '2024-01-15 15:10:00', metric_name: '压力敏感度', metric_value: 88, threshold: 80, operator: '>', action_description: '香薰机：开启薰衣草精油，强度50%', device_type: '香薰机', status: '已执行' },
  { id: 'L004', tenant_id: 'T001', user_id: 'U006', user_name: '刘洋', rule_id: 'R003', triggered_at: '2024-01-15 15:10:00', metric_name: '焦虑指数', metric_value: 79, threshold: 75, operator: '>', action_description: '智能音箱：播放自然白噪音·森林雨声', device_type: '智能音箱', status: '已执行' },
  { id: 'L005', tenant_id: 'T001', user_id: 'U004', user_name: '赵敏', rule_id: 'R002', triggered_at: '2024-01-15 16:05:00', metric_name: '压力敏感度', metric_value: 71, threshold: 70, operator: '>', action_description: '智能灯光：调暗暖色调，亮度30%', device_type: '智能灯光', status: '已执行' },
];

export const mockActivities: Activity[] = [
  { id: 'A001', tenant_id: 'T001', title: '周五颂钵音疗体验', description: '由资深音疗师带领，通过颂钵共振频率帮助深度放松，适合高压力人群。', date: '2024-01-19 19:00', target_tag: '重度焦虑', matched_users: 2, status: '已发布' },
  { id: 'A002', tenant_id: 'T001', title: '正念冥想入门工作坊', description: '学习正念呼吸与身体扫描技巧，帮助建立日常冥想习惯。', date: '2024-01-22 14:00', target_tag: '中度焦虑', matched_users: 3, status: '草稿' },
  { id: 'A003', tenant_id: 'T001', title: '中医养生茶道体验', description: '根据体质辨证推荐个性化养生茶饮，学习日常养生方法。', date: '2024-01-12 15:00', target_tag: '轻度压力', matched_users: 2, status: '已结束' },
];

export const dashboardStats = {
  today_measurements: 47,
  active_users: 156,
  abnormal_count: 12,
  abnormal_ratio: 25.5,
  avg_stress: 58,
  avg_health_score: 71,
  weekly_measurements: [32, 28, 45, 38, 51, 47, 42],
  weekly_labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  emotion_distribution: [
    { name: '正常', value: 35, color: '#10B981' },
    { name: '轻度压力', value: 28, color: '#F59E0B' },
    { name: '中度焦虑', value: 22, color: '#F97316' },
    { name: '重度焦虑', value: 15, color: '#EF4444' },
  ],
  assessment_data: {
    users: ['李芳', '刘洋', '赵敏', '张三', '周婷'],
    before: [82, 88, 71, 73, 76],
    after: [64, 72, 58, 61, 63],
  },
};
