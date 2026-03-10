/**
 * ============================================================
 * API Types - 前后端共享类型定义
 * ============================================================
 * 
 * 这些类型严格匹配后端 API 的 JSON 结构。
 * 后端 Pydantic Model 应与此文件 1:1 对应。
 * 
 * 命名规则：
 *   - API 请求体: XxxRequest
 *   - API 响应体: XxxResponse
 *   - 数据库实体: Xxx (如 Tenant, User, Device)
 */

// ============================================================
// 基础通用类型
// ============================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  detail: string;
  code?: string;
}

// ============================================================
// 1. Tenant (租户/商家)
// ============================================================

export interface Tenant {
  id: string;            // UUID
  name: string;          // 商家名称
  type: '中医馆' | '酒店';
  created_at?: string;   // ISO datetime
}

export interface CreateTenantRequest {
  name: string;
  type: '中医馆' | '酒店';
}

// ============================================================
// 2. User (用户)
// ============================================================

export interface User {
  id: string;            // UUID
  tenant_id: string;     // FK → Tenant
  name: string;
  gender: '男' | '女';
  age: number;
  height: number;        // cm
  weight: number;        // kg
  bmi: number;           // 后端计算
  latest_stress?: number;
  latest_score?: number;
  tag?: string;          // 正常 | 轻度压力 | 中度焦虑 | 重度焦虑
  created_at?: string;
}

export interface CreateUserRequest {
  tenant_id: string;
  name: string;
  gender: '男' | '女';
  age: number;
  height: number;
  weight: number;
}

export interface UpdateUserRequest {
  name?: string;
  gender?: '男' | '女';
  age?: number;
  height?: number;
  weight?: number;
}

// ============================================================
// 3. Device (智能坐垫设备)
// ============================================================

export interface Device {
  device_id: string;     // 坐垫MAC/唯一码
  tenant_id: string;
  status: '在线' | '离线' | '使用中';
  model: string;
  last_heartbeat?: string;
}

export interface BindDeviceRequest {
  device_id: string;
  user_id: string;
}

// ============================================================
// 4. MQTT 数据协议 (硬件上报)
// ============================================================

export interface MQTTPayload {
  device_id: string;
  timestamp: number;      // Unix timestamp (秒)
  heart_rate: number;     // 次/分 (bpm)
  breath_rate: number;    // 次/分
  movement_level: 0 | 1 | 2;  // 0:静止, 1:微动, 2:频动
  posture_status: 0 | 1;      // 1:正确, 0:偏移
}

// ============================================================
// 5. Measurement (检测记录)
// ============================================================

/** 后端算法引擎计算出的衍生指标 */
export interface DerivedMetrics {
  // 基础聚合
  avg_hr: number;
  avg_br: number;
  max_hr: number;
  min_hr: number;
  // 高级指标
  hrv: number;                    // 心率变异性 (ms)
  stress_sensitivity: number;     // 压力敏感度 (0-100%)
  autonomic_balance: number;      // 自主神经平衡 (0-5)
  // 情绪指标
  anxiety_level: number;          // 焦虑指数 (0-100%)
  fatigue_index: number;          // 疲劳指数 (0-100%)
  // 综合评分
  health_score: number;           // 健康评分 (0-100)
  posture_correct_rate: number;   // 坐姿正确率 (0-100%)
  // 中医体质
  tcm_constitution: {
    primary: string;              // 主要体质名称
    primary_score: number;
    secondary: string;            // 次要体质名称
    secondary_score: number;
    all_scores: Record<string, number>;  // 9种体质的分数
  };
}

/** 检测记录摘要（列表用） */
export interface MeasurementSummary {
  id: string;
  user_id: string;
  user_name: string;
  device_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  health_score: number;
  stress_sensitivity: number;
  primary_constitution: string;
}

/** 检测记录详情（报告用） */
export interface MeasurementRecord {
  id: string;
  user_id: string;
  user_name: string;
  device_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  // 图表时间轴数据
  hr_timeline: number[];
  br_timeline: number[];
  time_labels: string[];
  // 衍生指标 (后端算法引擎输出)
  derived_metrics: DerivedMetrics;
  // AI 生成的报告 (Markdown)
  ai_analysis: string;
  // 算法日志 (可选，调试用)
  algorithm_log?: string[];
}

/** 开始检测请求 */
export interface StartMeasurementRequest {
  user_id: string;
  device_id: string;
}

/** 开始检测响应 */
export interface StartMeasurementResponse {
  measurement_id: string;
  status: 'started';
  message: string;
}

/** 结束检测请求（触发算法计算 + AI分析） */
export interface StopMeasurementRequest {
  measurement_id: string;
}

/** 结束检测响应 */
export interface StopMeasurementResponse {
  measurement_id: string;
  status: 'completed' | 'insufficient_data';
  message: string;
  report_ready: boolean;
  ai_source?: string;  // 'siliconflow_api' | 'fallback_template' | 'fallback_api_error'
}

// ============================================================
// 6. Intervention Rules (干预规则)
// ============================================================

export interface InterventionRule {
  id: string;
  tenant_id: string;
  metric: string;          // 压力敏感度 | 焦虑指数 | HRV | 疲劳指数 | 健康评分 | 自主神经平衡
  operator: '>' | '<' | '=' | '>=' | '<=';
  value: number;           // 阈值
  device_type: string;     // 香薰机 | 智能灯光 | 智能音箱
  action: string;          // 开启 | 调暗 | 播放
  parameter: string;       // 参数描述
  enabled: boolean;
  created_at?: string;
}

export interface CreateRuleRequest {
  tenant_id: string;
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  value: number;
  device_type: string;
  action: string;
  parameter: string;
  enabled?: boolean;
}

export interface UpdateRuleRequest {
  metric?: string;
  operator?: '>' | '<' | '=' | '>=' | '<=';
  value?: number;
  device_type?: string;
  action?: string;
  parameter?: string;
  enabled?: boolean;
}

// ============================================================
// 7. Intervention Logs (干预日志)
// ============================================================

export interface InterventionLog {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name: string;
  rule_id: string;
  triggered_at: string;
  metric_name: string;
  metric_value: number;
  threshold: number;
  operator: string;
  action_description: string;
  device_type: string;
  status: '已执行' | '待执行' | '失败';
}

// ============================================================
// 8. Activities (活动推送)
// ============================================================

export interface Activity {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  date: string;
  target_tag: string;       // 匹配的用户标签
  matched_users: number;
  status: '草稿' | '已发布' | '已结束';
}

export interface CreateActivityRequest {
  tenant_id: string;
  title: string;
  description: string;
  date: string;
  target_tag: string;
}

// ============================================================
// 9. Dashboard (数据大盘)
// ============================================================

export interface DashboardStats {
  today_measurements: number;
  active_users: number;
  abnormal_count: number;
  abnormal_ratio: number;
  avg_stress: number;
  avg_health_score: number;
  weekly_measurements: number[];
  weekly_labels: string[];
  emotion_distribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  assessment_data: {
    users: string[];
    before: number[];
    after: number[];
  };
}

// ============================================================
// 10. Realtime Data (WebSocket / SSE)
// ============================================================

export interface RealtimeDataPoint {
  heart_rate: number;
  breath_rate: number;
  movement_level: number;
  posture_status: number;
  timestamp: number;
  elapsed_seconds: number;
}

// ============================================================
// 11. Algorithm Test (调试用)
// ============================================================

export interface AlgorithmTestRequest {
  duration_minutes: number;
  scenario: 'normal' | 'stressed' | 'relaxed';
  seed?: number;
}

export interface AlgorithmTestResult {
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
  algorithm_log: string[];
}

// ============================================================
// 12. AI Service (硅基流动大模型配置)
// ============================================================

export interface AIModelInfo {
  id: string;
  name: string;
  description: string;
}

export interface AIServiceStatus {
  configured: boolean;
  model: string;
  base_url: string;
  api_key_preview: string;
  available_models: AIModelInfo[];
  system_prompt: string;
}

export interface AIConfigRequest {
  api_key?: string;
  model?: string;
  base_url?: string;
}

export interface AITestResult {
  status: 'success' | 'error';
  source?: string;
  model?: string;
  response_time_ms?: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  content_preview?: string;
  content_length?: number;
  message?: string;
}
