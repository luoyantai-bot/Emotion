/**
 * InterventionEngine - Phase 5 核心模块
 * 
 * 当新报告生成时，自动匹配干预规则，生成 IoT 干预日志。
 * 第一期不直连硬件，仅生成 Action Log 并打印 console.log。
 */

import type { DerivedMetrics } from './MockAlgorithmService';

export interface InterventionRule {
  id: string;
  tenant_id: string;
  metric: string;         // 指标名称: 压力敏感度 | 焦虑指数 | HRV | 疲劳指数
  operator: '>' | '<' | '=' | '>=' | '<=';
  value: number;
  device_type: string;    // 香薰机 | 智能灯光 | 智能音箱
  action: string;         // 开启 | 调暗 | 播放
  parameter: string;      // 参数描述
  enabled: boolean;
}

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

// 指标名称到 DerivedMetrics 字段的映射
function getMetricValue(metrics: DerivedMetrics, metricName: string): number | null {
  switch (metricName) {
    case '压力敏感度': return metrics.stress_sensitivity;
    case '焦虑指数': return metrics.anxiety_level;
    case 'HRV': return metrics.hrv;
    case '疲劳指数': return metrics.fatigue_index;
    case '健康评分': return metrics.health_score;
    case '自主神经平衡': return metrics.autonomic_balance;
    default: return null;
  }
}

// 比较运算
function evaluateCondition(actual: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case '>': return actual > threshold;
    case '<': return actual < threshold;
    case '>=': return actual >= threshold;
    case '<=': return actual <= threshold;
    case '=': return actual === threshold;
    default: return false;
  }
}

let logCounter = 1000;

export class InterventionEngine {
  private rules: InterventionRule[];
  private logs: InterventionLog[] = [];

  constructor(rules: InterventionRule[]) {
    this.rules = rules;
  }

  /**
   * 当新报告生成时调用此方法，自动匹配规则并生成干预日志
   */
  evaluate(
    metrics: DerivedMetrics,
    userId: string,
    userName: string,
    tenantId: string = 'T001'
  ): InterventionLog[] {
    const triggered: InterventionLog[] = [];
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    console.log('═══════════════════════════════════════════════');
    console.log('🔔 [InterventionEngine] 开始规则匹配...');
    console.log(`   用户: ${userName} (${userId})`);
    console.log(`   时间: ${now}`);
    console.log('───────────────────────────────────────────────');

    for (const rule of this.rules) {
      if (!rule.enabled) {
        console.log(`   ⏭️ 规则 ${rule.id} 已禁用，跳过`);
        continue;
      }

      const actualValue = getMetricValue(metrics, rule.metric);
      if (actualValue === null) {
        console.log(`   ⚠️ 规则 ${rule.id}: 未知指标 "${rule.metric}"，跳过`);
        continue;
      }

      const matched = evaluateCondition(actualValue, rule.operator, rule.value);
      const unit = rule.metric === 'HRV' ? 'ms' : rule.metric === '自主神经平衡' ? '' : '%';

      if (matched) {
        logCounter++;
        const log: InterventionLog = {
          id: `L${logCounter}`,
          tenant_id: tenantId,
          user_id: userId,
          user_name: userName,
          rule_id: rule.id,
          triggered_at: now,
          metric_name: rule.metric,
          metric_value: actualValue,
          threshold: rule.value,
          operator: rule.operator,
          action_description: `${rule.device_type}：${rule.action}${rule.parameter}`,
          device_type: rule.device_type,
          status: '已执行',
        };

        triggered.push(log);
        this.logs.push(log);

        console.log(`   ✅ 规则 ${rule.id} 触发！`);
        console.log(`      条件: ${rule.metric}(${actualValue}${unit}) ${rule.operator} ${rule.value}${unit} → TRUE`);
        console.log(`      动作: ${log.action_description}`);
        console.log(`      日志ID: ${log.id}`);
      } else {
        console.log(`   ❌ 规则 ${rule.id}: ${rule.metric}(${actualValue}${unit}) ${rule.operator} ${rule.value}${unit} → FALSE`);
      }
    }

    console.log('───────────────────────────────────────────────');
    console.log(`🔔 [InterventionEngine] 匹配完成，触发 ${triggered.length} 条干预`);
    console.log('═══════════════════════════════════════════════');

    return triggered;
  }

  /**
   * 获取所有历史日志
   */
  getAllLogs(): InterventionLog[] {
    return [...this.logs];
  }

  /**
   * 添加预设日志（用于初始化Mock数据）
   */
  addHistoryLogs(logs: InterventionLog[]) {
    this.logs.push(...logs);
  }

  /**
   * 更新规则列表
   */
  updateRules(rules: InterventionRule[]) {
    this.rules = rules;
  }

  getRules(): InterventionRule[] {
    return [...this.rules];
  }
}
