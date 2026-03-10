/**
 * ============================================================
 * API Layer - 统一数据访问接口
 * ============================================================
 * 
 * 所有页面应该通过这个模块获取数据，而不是直接导入 mockData。
 * 
 * 工作模式:
 *   - Mock模式 (默认): 使用前端内置的模拟数据，无需后端
 *   - Live模式: 通过 HTTP 调用真实后端 API
 * 
 * 切换方式:
 *   在 .env 文件中设置:
 *     VITE_API_BASE_URL=http://localhost:8000/api/v1
 *     VITE_API_MODE=live
 * 
 * 使用示例:
 *   import { api } from '@/api';
 *   const users = await api.users.list('T001');
 *   const report = await api.measurements.getReport('MR-001');
 */

import { getApiConfig, http } from './client';
import type {
  Tenant, User, CreateUserRequest,
  Device, BindDeviceRequest,
  MeasurementRecord, MeasurementSummary,
  StartMeasurementRequest, StartMeasurementResponse,
  StopMeasurementRequest, StopMeasurementResponse,
  InterventionRule, CreateRuleRequest, UpdateRuleRequest,
  InterventionLog,
  Activity, CreateActivityRequest,
  DashboardStats,
  DerivedMetrics,
  PaginatedResponse,
  AlgorithmTestResult,
} from './types';

// Re-export all types for convenience
export type * from './types';
export { getApiConfig } from './client';

// ============================================================
// Mock Data Imports (only used in mock mode)
// ============================================================
import {
  mockTenants, mockUsers, mockDevices, mockRecords,
  defaultRules, defaultLogs, mockActivities, dashboardStats,
} from '../data/mockData';
import {
  MockAlgorithmService, generateMockRawData,
} from '../services/MockAlgorithmService';
import { InterventionEngine } from '../services/InterventionEngine';

// ============================================================
// Mock State (mutable state for mock mode CRUD)
// ============================================================
let _mockRules = [...defaultRules];
let _mockLogs = [...defaultLogs];
const _mockEngine = new InterventionEngine(_mockRules);
_mockEngine.addHistoryLogs(_mockLogs);

// ============================================================
// API Service Definition
// ============================================================

export const api = {

  // ──────────────────────────────────────────────
  // Tenants
  // ──────────────────────────────────────────────
  tenants: {
    async list(): Promise<Tenant[]> {
      if (getApiConfig().isMock) return mockTenants;
      return http.get<Tenant[]>('/tenants');
    },

    async get(id: string): Promise<Tenant> {
      if (getApiConfig().isMock) {
        const t = mockTenants.find(t => t.id === id);
        if (!t) throw new Error(`Tenant ${id} not found`);
        return t;
      }
      return http.get<Tenant>(`/tenants/${id}`);
    },
  },

  // ──────────────────────────────────────────────
  // Users
  // ──────────────────────────────────────────────
  users: {
    async list(tenantId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<User>> {
      if (getApiConfig().isMock) {
        const filtered = mockUsers.filter(u => u.tenant_id === tenantId);
        return {
          items: filtered.slice((page - 1) * pageSize, page * pageSize),
          total: filtered.length,
          page,
          page_size: pageSize,
          total_pages: Math.ceil(filtered.length / pageSize),
        };
      }
      return http.get<PaginatedResponse<User>>('/users', {
        tenant_id: tenantId, page, page_size: pageSize,
      });
    },

    async get(userId: string): Promise<User> {
      if (getApiConfig().isMock) {
        const u = mockUsers.find(u => u.id === userId);
        if (!u) throw new Error(`User ${userId} not found`);
        return u;
      }
      return http.get<User>(`/users/${userId}`);
    },

    async create(data: CreateUserRequest): Promise<User> {
      if (getApiConfig().isMock) {
        const bmi = Math.round(data.weight / ((data.height / 100) ** 2) * 10) / 10;
        const newUser: User = {
          id: `U${String(mockUsers.length + 1).padStart(3, '0')}`,
          ...data,
          bmi,
          tag: '正常',
        };
        mockUsers.push(newUser);
        console.log('[Mock API] Created user:', newUser);
        return newUser;
      }
      return http.post<User>('/users', data);
    },

    async getByTag(tenantId: string, tag: string): Promise<User[]> {
      if (getApiConfig().isMock) {
        return mockUsers.filter(u => u.tenant_id === tenantId && u.tag === tag);
      }
      return http.get<User[]>('/users/by-tag', { tenant_id: tenantId, tag });
    },
  },

  // ──────────────────────────────────────────────
  // Devices
  // ──────────────────────────────────────────────
  devices: {
    async list(tenantId: string): Promise<Device[]> {
      if (getApiConfig().isMock) return mockDevices.filter(d => d.tenant_id === tenantId);
      return http.get<Device[]>('/devices', { tenant_id: tenantId });
    },

    async bind(data: BindDeviceRequest): Promise<{ status: string }> {
      if (getApiConfig().isMock) {
        console.log('[Mock API] Device bound:', data);
        return { status: 'bound' };
      }
      return http.post('/devices/bind', data);
    },
  },

  // ──────────────────────────────────────────────
  // Measurements (检测记录)
  // ──────────────────────────────────────────────
  measurements: {
    /** 获取用户的检测记录列表 */
    async listByUser(userId: string): Promise<MeasurementSummary[]> {
      if (getApiConfig().isMock) {
        return mockRecords
          .filter(r => r.user_id === userId)
          .map(r => ({
            id: r.id,
            user_id: r.user_id,
            user_name: r.user_name,
            device_id: r.device_id,
            start_time: r.start_time,
            end_time: r.end_time,
            duration_minutes: r.duration_minutes,
            health_score: r.derived_metrics.health_score,
            stress_sensitivity: r.derived_metrics.stress_sensitivity,
            primary_constitution: r.derived_metrics.tcm_constitution.primary,
          }));
      }
      return http.get<MeasurementSummary[]>(`/measurements/user/${userId}`);
    },

    /** 获取商家下所有检测记录 */
    async listByTenant(tenantId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<MeasurementSummary>> {
      if (getApiConfig().isMock) {
        const all = mockRecords.map(r => ({
          id: r.id,
          user_id: r.user_id,
          user_name: r.user_name,
          device_id: r.device_id,
          start_time: r.start_time,
          end_time: r.end_time,
          duration_minutes: r.duration_minutes,
          health_score: r.derived_metrics.health_score,
          stress_sensitivity: r.derived_metrics.stress_sensitivity,
          primary_constitution: r.derived_metrics.tcm_constitution.primary,
        }));
        return {
          items: all.slice((page - 1) * pageSize, page * pageSize),
          total: all.length,
          page,
          page_size: pageSize,
          total_pages: Math.ceil(all.length / pageSize),
        };
      }
      return http.get<PaginatedResponse<MeasurementSummary>>('/measurements', {
        tenant_id: tenantId, page, page_size: pageSize,
      });
    },

    /** 获取检测报告详情 */
    async getReport(measurementId: string): Promise<MeasurementRecord> {
      if (getApiConfig().isMock) {
        const r = mockRecords.find(r => r.id === measurementId);
        if (!r) throw new Error(`Record ${measurementId} not found`);
        return r;
      }
      return http.get<MeasurementRecord>(`/measurements/${measurementId}/report`);
    },

    /** 开始检测 (后端开始接收 MQTT 数据) */
    async start(data: StartMeasurementRequest): Promise<StartMeasurementResponse> {
      if (getApiConfig().isMock) {
        console.log('[Mock API] Measurement started:', data);
        return {
          measurement_id: `MR-${Date.now()}`,
          status: 'started',
          message: '检测已开始，请保持坐姿',
        };
      }
      return http.post<StartMeasurementResponse>('/measurements/start', data);
    },

    /** 结束检测 (触发算法计算 + AI分析) */
    async stop(data: StopMeasurementRequest): Promise<StopMeasurementResponse> {
      if (getApiConfig().isMock) {
        console.log('[Mock API] Measurement stopped:', data);
        return {
          measurement_id: data.measurement_id,
          status: 'completed',
          message: '报告生成完毕',
          report_ready: true,
        };
      }
      return http.post<StopMeasurementResponse>('/measurements/stop', data);
    },

    /** 使用模拟算法生成一份报告 (前端直接计算，不经后端) */
    generateMockReport(
      userName: string,
      userId: string,
      durationMinutes: number,
      scenario: 'normal' | 'stressed' | 'relaxed' = 'normal',
    ): MeasurementRecord {
      const seed = Date.now() % 10000;
      const rawData = generateMockRawData(durationMinutes, seed, scenario);
      const service = new MockAlgorithmService();
      const result = service.compute(rawData);

      const m = result.derived_metrics;
      const stressLabel = m.stress_sensitivity > 70 ? '偏高' : m.stress_sensitivity > 50 ? '中等' : '正常';
      const scoreLabel = m.health_score > 75 ? '良好' : m.health_score > 60 ? '中等' : '需关注';
      const now = new Date();
      const startStr = now.toISOString().replace('T', ' ').slice(0, 19);
      const endDate = new Date(now.getTime() + durationMinutes * 60000);
      const endStr = endDate.toISOString().replace('T', ' ').slice(0, 19);

      return {
        id: `MR-${Date.now()}`,
        user_id: userId,
        user_name: userName,
        device_id: 'Z4U524060082',
        start_time: startStr,
        end_time: endStr,
        duration_minutes: durationMinutes,
        hr_timeline: result.hr_timeline,
        br_timeline: result.br_timeline,
        time_labels: result.time_labels,
        derived_metrics: result.derived_metrics,
        ai_analysis: generateMockAIAnalysis(m, durationMinutes, scoreLabel, stressLabel),
        algorithm_log: result.algorithm_log,
      };
    },
  },

  // ──────────────────────────────────────────────
  // Intervention Rules (干预规则)
  // ──────────────────────────────────────────────
  rules: {
    async list(tenantId: string): Promise<InterventionRule[]> {
      if (getApiConfig().isMock) return _mockRules.filter(r => r.tenant_id === tenantId);
      return http.get<InterventionRule[]>('/rules', { tenant_id: tenantId });
    },

    async create(data: CreateRuleRequest): Promise<InterventionRule> {
      if (getApiConfig().isMock) {
        const newRule: InterventionRule = {
          id: `R${String(_mockRules.length + 100).padStart(3, '0')}`,
          ...data,
          enabled: data.enabled ?? true,
        };
        _mockRules.push(newRule);
        _mockEngine.updateRules(_mockRules);
        console.log('[Mock API] Created rule:', newRule);
        return newRule;
      }
      return http.post<InterventionRule>('/rules', data);
    },

    async update(ruleId: string, data: UpdateRuleRequest): Promise<InterventionRule> {
      if (getApiConfig().isMock) {
        const idx = _mockRules.findIndex(r => r.id === ruleId);
        if (idx === -1) throw new Error(`Rule ${ruleId} not found`);
        _mockRules[idx] = { ..._mockRules[idx], ...data };
        _mockEngine.updateRules(_mockRules);
        console.log('[Mock API] Updated rule:', _mockRules[idx]);
        return _mockRules[idx];
      }
      return http.patch<InterventionRule>(`/rules/${ruleId}`, data);
    },

    async delete(ruleId: string): Promise<void> {
      if (getApiConfig().isMock) {
        _mockRules = _mockRules.filter(r => r.id !== ruleId);
        _mockEngine.updateRules(_mockRules);
        console.log('[Mock API] Deleted rule:', ruleId);
        return;
      }
      return http.delete(`/rules/${ruleId}`);
    },

    async toggle(ruleId: string, enabled: boolean): Promise<InterventionRule> {
      return api.rules.update(ruleId, { enabled });
    },
  },

  // ──────────────────────────────────────────────
  // Intervention Logs (干预日志)
  // ──────────────────────────────────────────────
  logs: {
    async list(tenantId: string, page = 1, pageSize = 50): Promise<PaginatedResponse<InterventionLog>> {
      if (getApiConfig().isMock) {
        const filtered = _mockLogs.filter(l => l.tenant_id === tenantId);
        return {
          items: filtered.slice((page - 1) * pageSize, page * pageSize),
          total: filtered.length,
          page,
          page_size: pageSize,
          total_pages: Math.ceil(filtered.length / pageSize),
        };
      }
      return http.get<PaginatedResponse<InterventionLog>>('/logs', {
        tenant_id: tenantId, page, page_size: pageSize,
      });
    },

    /** 触发干预评估 (当报告生成后自动调用) */
    async evaluate(metrics: DerivedMetrics, userId: string, userName: string): Promise<InterventionLog[]> {
      if (getApiConfig().isMock) {
        const triggered = _mockEngine.evaluate(metrics, userId, userName);
        _mockLogs = [...triggered, ..._mockLogs];
        return triggered;
      }
      return http.post<InterventionLog[]>('/logs/evaluate', {
        metrics, user_id: userId, user_name: userName,
      });
    },
  },

  // ──────────────────────────────────────────────
  // Activities (活动推送)
  // ──────────────────────────────────────────────
  activities: {
    async list(tenantId: string): Promise<Activity[]> {
      if (getApiConfig().isMock) return mockActivities.filter(a => a.tenant_id === tenantId);
      return http.get<Activity[]>('/activities', { tenant_id: tenantId });
    },

    async create(data: CreateActivityRequest): Promise<Activity> {
      if (getApiConfig().isMock) {
        const matched = mockUsers.filter(u => u.tenant_id === data.tenant_id && u.tag === data.target_tag);
        const newActivity: Activity = {
          id: `A${String(mockActivities.length + 100).padStart(3, '0')}`,
          ...data,
          matched_users: matched.length,
          status: '草稿',
        };
        mockActivities.push(newActivity);
        console.log('[Mock API] Created activity:', newActivity);
        return newActivity;
      }
      return http.post<Activity>('/activities', data);
    },
  },

  // ──────────────────────────────────────────────
  // Dashboard (数据大盘)
  // ──────────────────────────────────────────────
  dashboard: {
    async getStats(tenantId: string): Promise<DashboardStats> {
      if (getApiConfig().isMock) {
        void tenantId;
        return dashboardStats;
      }
      return http.get<DashboardStats>('/dashboard/stats', { tenant_id: tenantId });
    },
  },

  // ──────────────────────────────────────────────
  // Algorithm Test (调试/验证)
  // ──────────────────────────────────────────────
  algorithm: {
    async test(
      durationMinutes: number,
      scenario: 'normal' | 'stressed' | 'relaxed',
      seed?: number,
    ): Promise<AlgorithmTestResult> {
      if (getApiConfig().isMock) {
        const rawData = generateMockRawData(durationMinutes, seed ?? 42, scenario);
        const service = new MockAlgorithmService();
        return service.compute(rawData);
      }
      return http.post<AlgorithmTestResult>('/algorithm/test', {
        duration_minutes: durationMinutes,
        scenario,
        seed,
      });
    },
  },

  // ──────────────────────────────────────────────
  // AI Service (硅基流动大模型)
  // ──────────────────────────────────────────────
  ai: {
    /** 获取 AI 服务当前配置状态 */
    async getStatus(): Promise<import('./types').AIServiceStatus> {
      if (getApiConfig().isMock) {
        return {
          configured: false,
          model: 'deepseek-ai/DeepSeek-V3',
          base_url: 'https://api.siliconflow.cn/v1',
          api_key_preview: '未配置',
          available_models: [
            { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', description: '综合能力强，性价比高（推荐）' },
            { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', description: '推理增强型，分析更深入' },
            { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5 72B', description: '阿里通义千问，中文能力优秀' },
            { id: 'Pro/Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5 7B (轻量)', description: '响应快速，适合实时场景' },
            { id: 'THUDM/glm-4-9b-chat', name: 'GLM-4 9B', description: '清华智谱，通用对话' },
          ],
          system_prompt: '(Mock模式 - 需连接后端查看)',
        };
      }
      return http.get<import('./types').AIServiceStatus>('/ai/status');
    },

    /** 动态更新 AI 配置（API Key / 模型 / 地址） */
    async updateConfig(config: import('./types').AIConfigRequest): Promise<import('./types').AIServiceStatus> {
      if (getApiConfig().isMock) {
        console.log('[Mock API] AI config update ignored in mock mode:', config);
        throw new Error('Mock 模式下不支持 AI 配置。请连接真实后端。');
      }
      return http.post<import('./types').AIServiceStatus>('/ai/config', config);
    },

    /** 测试当前 AI 配置是否可用 */
    async test(): Promise<import('./types').AITestResult> {
      if (getApiConfig().isMock) {
        throw new Error('Mock 模式下不支持 AI 测试。请连接真实后端。');
      }
      return http.post<import('./types').AITestResult>('/ai/test', {});
    },
  },
};

// ============================================================
// Helper: Mock AI analysis text
// ============================================================
function generateMockAIAnalysis(
  m: DerivedMetrics,
  durationMinutes: number,
  scoreLabel: string,
  stressLabel: string,
): string {
  return `### 总体健康状态概述

根据您${durationMinutes}分钟的智能坐垫检测数据综合分析，您的整体健康状况处于**${scoreLabel}**水平（综合评分 **${m.health_score}分**）。心率平均值 ${m.avg_hr} 次/分，心率变异性（HRV）为 ${m.hrv}ms。压力敏感度 ${m.stress_sensitivity}%，属于${stressLabel}水平。

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
