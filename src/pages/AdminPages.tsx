import { useState, useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import {
  mockUsers, mockDevices, defaultRules, defaultLogs, mockActivities,
  dashboardStats, mockRecords,
  MockAlgorithmService, generateMockRawData, InterventionEngine,
} from '../data/mockData';
import type { InterventionRule, InterventionLog } from '../data/mockData';
import { runAlgorithmTest } from '../services/MockAlgorithmService';

type AdminPage = 'dashboard' | 'users' | 'rules' | 'logs' | 'assessment' | 'activities' | 'test' | 'ai-config';

const menuItems: { key: AdminPage; label: string; icon: string }[] = [
  { key: 'dashboard', label: '数据大盘', icon: '📊' },
  { key: 'users', label: '用户管理', icon: '👥' },
  { key: 'rules', label: '干预规则', icon: '⚙️' },
  { key: 'logs', label: '干预日志', icon: '📋' },
  { key: 'assessment', label: '效果评估', icon: '📈' },
  { key: 'activities', label: '活动推送', icon: '🎯' },
  { key: 'ai-config', label: 'AI 大模型', icon: '🤖' },
  { key: 'test', label: '算法验证', icon: '🧪' },
];

// ============ Sidebar ============
function Sidebar({ active, onChange, collapsed, onToggle }: {
  active: AdminPage; onChange: (p: AdminPage) => void; collapsed: boolean; onToggle: () => void;
}) {
  return (
    <div className={`bg-slate-900 text-white flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      <div className="p-4 flex items-center gap-3 border-b border-slate-700">
        {!collapsed && (
          <div>
            <div className="font-bold text-sm">智能坐垫管理系统</div>
            <div className="text-xs text-slate-400">同仁堂·国贸分店</div>
          </div>
        )}
        <button onClick={onToggle} className="ml-auto text-slate-400 hover:text-white p-1 text-lg">
          {collapsed ? '→' : '←'}
        </button>
      </div>
      <nav className="flex-1 py-4">
        {menuItems.map(item => (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
              active === item.key
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700">
        {!collapsed && <div className="text-xs text-slate-500">v2.0.0 · Phase 2-5 完整版</div>}
      </div>
    </div>
  );
}

// ============ Dashboard ============
function Dashboard() {
  const pieRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pieRef.current) {
      const chart = echarts.init(pieRef.current);
      chart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
        legend: { bottom: 0, textStyle: { fontSize: 11 } },
        series: [{
          type: 'pie', radius: ['40%', '65%'], center: ['50%', '45%'],
          avoidLabelOverlap: false, label: { show: false },
          data: dashboardStats.emotion_distribution.map(d => ({
            name: d.name, value: d.value, itemStyle: { color: d.color },
          })),
        }],
      });
      const r = () => chart.resize();
      window.addEventListener('resize', r);
      return () => { window.removeEventListener('resize', r); chart.dispose(); };
    }
  }, []);

  useEffect(() => {
    if (barRef.current) {
      const chart = echarts.init(barRef.current);
      chart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { top: 20, right: 20, bottom: 30, left: 40 },
        xAxis: { type: 'category', data: dashboardStats.weekly_labels, axisLabel: { fontSize: 11 } },
        yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        series: [{
          type: 'bar', data: dashboardStats.weekly_measurements,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#818CF8' }, { offset: 1, color: '#6366F1' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: 28,
        }],
      });
      const r = () => chart.resize();
      window.addEventListener('resize', r);
      return () => { window.removeEventListener('resize', r); chart.dispose(); };
    }
  }, []);

  const stats = [
    { label: '今日检测', value: dashboardStats.today_measurements, unit: '人次', icon: '🔬', color: 'from-indigo-500 to-purple-500' },
    { label: '活跃用户', value: dashboardStats.active_users, unit: '人', icon: '👥', color: 'from-emerald-500 to-teal-500' },
    { label: '异常预警', value: dashboardStats.abnormal_count, unit: '人', icon: '⚠️', color: 'from-amber-500 to-orange-500', sub: `占比 ${dashboardStats.abnormal_ratio}%` },
    { label: '平均健康分', value: dashboardStats.avg_health_score, unit: '分', icon: '❤️', color: 'from-rose-500 to-pink-500' },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">数据大盘</h1><p className="text-gray-500 text-sm">实时监控与数据概览</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className={`bg-gradient-to-br ${s.color} rounded-xl p-5 text-white shadow-lg`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm opacity-90">{s.label}</span><span className="text-2xl">{s.icon}</span>
            </div>
            <div className="text-3xl font-bold">{s.value}<span className="text-lg font-normal opacity-80 ml-1">{s.unit}</span></div>
            {'sub' in s && s.sub && <div className="text-xs opacity-80 mt-1">{s.sub}</div>}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-1">情绪分布</h3>
          <p className="text-xs text-gray-400 mb-3">本月用户情绪分类统计</p>
          <div ref={pieRef} style={{ width: '100%', height: '280px' }}></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-1">本周检测趋势</h3>
          <p className="text-xs text-gray-400 mb-3">每日检测人次统计</p>
          <div ref={barRef} style={{ width: '100%', height: '280px' }}></div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-1">设备状态</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          {mockDevices.map(d => (
            <div key={d.device_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-2xl">💺</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{d.device_id}</div>
                <div className="text-xs text-gray-500">{d.model}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                d.status === '在线' ? 'bg-emerald-100 text-emerald-700' :
                d.status === '使用中' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
              }`}>{d.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ User Management ============
function UserManagement() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">用户管理</h1><p className="text-gray-500 text-sm">管理用户档案与查看检测报告</p></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['用户', '性别/年龄', 'BMI', '最新压力', '健康评分', '标签', '操作'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockUsers.map(u => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-600">{u.name[0]}</div>
                      <div><div className="font-medium text-gray-900 text-sm">{u.name}</div><div className="text-xs text-gray-400">{u.id}</div></div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{u.gender} / {u.age}岁</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{u.bmi}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${(u.latest_stress || 0) > 70 ? 'bg-red-500' : (u.latest_stress || 0) > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${u.latest_stress}%` }}></div>
                      </div>
                      <span className="text-sm text-gray-600">{u.latest_stress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-sm font-semibold ${(u.latest_score || 0) > 75 ? 'text-emerald-600' : (u.latest_score || 0) > 60 ? 'text-amber-600' : 'text-red-600'}`}>{u.latest_score}分</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex text-xs px-2 py-1 rounded-full font-medium ${
                      u.tag === '重度焦虑' ? 'bg-red-100 text-red-700' : u.tag === '中度焦虑' ? 'bg-amber-100 text-amber-700' : u.tag === '轻度压力' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>{u.tag}</span>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => setSelectedUser(selectedUser === u.id ? null : u.id)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">查看报告</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selectedUser && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-3">📄 {mockUsers.find(u => u.id === selectedUser)?.name} 的最新检测报告</h3>
          {mockRecords.filter(r => r.user_id === selectedUser).slice(0, 1).map(r => (
            <div key={r.id} className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: '健康评分', value: `${r.derived_metrics.health_score}分`, color: 'text-emerald-600' },
                  { label: '压力敏感度', value: `${r.derived_metrics.stress_sensitivity}%`, color: 'text-amber-600' },
                  { label: 'HRV', value: `${r.derived_metrics.hrv}ms`, color: 'text-purple-600' },
                  { label: '体质倾向', value: r.derived_metrics.tcm_constitution.primary, color: 'text-teal-600' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">{item.label}</div>
                    <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-400">检测时间：{r.start_time} ~ {r.end_time} | 设备：{r.device_id}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Rule Engine (Phase 5 - Full CRUD + Auto Intervention) ============
function RuleEngine({ rules, onUpdateRules, onTriggerIntervention }: {
  rules: InterventionRule[];
  onUpdateRules: (rules: InterventionRule[]) => void;
  onTriggerIntervention: (logs: InterventionLog[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [newRule, setNewRule] = useState({
    metric: '压力敏感度',
    operator: '>' as '>' | '<' | '=',
    value: 70,
    device_type: '香薰机',
    action: '开启',
    parameter: '',
  });

  const toggleRule = (id: string) => {
    onUpdateRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const deleteRule = (id: string) => {
    onUpdateRules(rules.filter(r => r.id !== id));
  };

  const addRule = () => {
    const newId = `R${String(rules.length + 1).padStart(3, '0')}`;
    const rule: InterventionRule = {
      id: newId,
      tenant_id: 'T001',
      ...newRule,
      enabled: true,
    };
    onUpdateRules([...rules, rule]);
    setShowForm(false);
    setNewRule({ metric: '压力敏感度', operator: '>', value: 70, device_type: '香薰机', action: '开启', parameter: '' });

    console.log('═══════════════════════════════════════════════');
    console.log(`📝 [RuleEngine] 新规则创建: ${newId}`);
    console.log(`   IF ${rule.metric} ${rule.operator} ${rule.value} THEN ${rule.device_type} → ${rule.action}`);
    console.log('═══════════════════════════════════════════════');
  };

  // Simulate triggering intervention for a random user
  const simulateNewReport = () => {
    const scenarios: Array<'normal' | 'stressed' | 'relaxed'> = ['stressed', 'normal', 'relaxed'];
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];

    const rawData = generateMockRawData(5, Date.now(), scenario);
    const service = new MockAlgorithmService();
    const result = service.compute(rawData);

    const engine = new InterventionEngine(rules);
    const triggered = engine.evaluate(result.derived_metrics, user.id, user.name);

    if (triggered.length > 0) {
      onTriggerIntervention(triggered);
      alert(`✅ 模拟报告生成完成！\n用户：${user.name} (${scenario})\n压力：${result.derived_metrics.stress_sensitivity}%\n触发了 ${triggered.length} 条干预规则\n\n请查看浏览器控制台(F12)获取详细日志`);
    } else {
      alert(`报告生成完成，用户：${user.name}\n压力：${result.derived_metrics.stress_sensitivity}%\n未触发任何干预规则\n\n请查看浏览器控制台(F12)获取详细日志`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">干预规则引擎</h1><p className="text-gray-500 text-sm">配置自动化IoT干预规则（Phase 5）</p></div>
        <div className="flex gap-2">
          <button onClick={simulateNewReport}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition flex items-center gap-1">
            🔬 模拟报告生成
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            + 新建规则
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Phase 5 说明：</strong>点击"模拟报告生成"按钮，系统将：① 生成模拟原始数据 → ② 调用 MockAlgorithmService 计算指标 → ③ InterventionEngine 匹配规则 → ④ 生成干预日志并打印 console.log。
        请打开浏览器开发者工具 (F12) 查看详细输出。
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">新建干预规则</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">触发条件</label>
              <div className="flex gap-2">
                <select className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                  value={newRule.metric} onChange={e => setNewRule({ ...newRule, metric: e.target.value })}>
                  <option>压力敏感度</option><option>焦虑指数</option><option>HRV</option><option>疲劳指数</option><option>健康评分</option>
                </select>
                <select className="w-16 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                  value={newRule.operator} onChange={e => setNewRule({ ...newRule, operator: e.target.value as '>' | '<' | '=' })}>
                  <option>&gt;</option><option>&lt;</option><option>=</option>
                </select>
                <input type="number" placeholder="阈值" className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                  value={newRule.value} onChange={e => setNewRule({ ...newRule, value: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">执行动作</label>
              <div className="flex gap-2">
                <select className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                  value={newRule.device_type} onChange={e => setNewRule({ ...newRule, device_type: e.target.value })}>
                  <option>香薰机</option><option>智能灯光</option><option>智能音箱</option>
                </select>
                <select className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                  value={newRule.action} onChange={e => setNewRule({ ...newRule, action: e.target.value })}>
                  <option>开启</option><option>调暗</option><option>播放</option>
                </select>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">动作参数</label>
              <input placeholder="如：薰衣草精油，强度50%" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                value={newRule.parameter} onChange={e => setNewRule({ ...newRule, parameter: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addRule} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">保存规则</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition">取消</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rules.map(rule => (
          <div key={rule.id} className={`bg-white rounded-xl shadow-sm border p-5 transition ${rule.enabled ? 'border-indigo-200' : 'border-gray-100 opacity-60'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${rule.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                  <span className="font-semibold text-gray-800 text-sm">{rule.id}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">IF</span>
                  <span className="text-gray-700">{rule.metric}</span>
                  <span className="font-mono text-indigo-600 font-bold">{rule.operator}</span>
                  <span className="text-gray-700">{rule.value}{rule.metric === 'HRV' ? 'ms' : '%'}</span>
                  <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-medium">THEN</span>
                  <span className="text-gray-700">{rule.device_type} → {rule.action}</span>
                </div>
                <div className="text-xs text-gray-400 mt-2">参数：{rule.parameter || '(无)'}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => deleteRule(rule.id)} className="text-red-400 hover:text-red-600 text-sm px-2">🗑️</button>
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${rule.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${rule.enabled ? 'left-[22px]' : 'left-0.5'}`}></span>
                </button>
              </div>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <div className="text-center py-10 text-gray-400">暂无规则，点击"新建规则"添加</div>
        )}
      </div>
    </div>
  );
}

// ============ Intervention Logs ============
function InterventionLogs({ logs }: { logs: InterventionLog[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">IoT 干预日志</h1>
        <p className="text-gray-500 text-sm">查看所有自动化干预执行记录（含实时触发日志）</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['时间', '用户', '触发指标', '指标值', '阈值', '执行动作', '状态'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">暂无日志</td></tr>
              ) : (
                logs.map((log: InterventionLog) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{log.triggered_at}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600">{log.user_name[0]}</div>
                        <span className="text-sm font-medium text-gray-900">{log.user_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{log.metric_name}</td>
                    <td className="px-5 py-4">
                      <span className={`text-sm font-semibold ${log.metric_value > 80 ? 'text-red-600' : log.metric_value > 60 ? 'text-amber-600' : 'text-gray-600'}`}>
                        {log.metric_value}{log.metric_name === 'HRV' ? 'ms' : '%'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{log.operator} {log.threshold}</td>
                    <td className="px-5 py-4 text-sm text-gray-600 max-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{log.device_type === '香薰机' ? '🕯️' : log.device_type === '智能灯光' ? '💡' : '🔊'}</span>
                        <span className="truncate">{log.action_description}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex text-xs px-2 py-1 rounded-full font-medium ${
                        log.status === '已执行' ? 'bg-emerald-100 text-emerald-700' : log.status === '待执行' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>{log.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ Effect Assessment ============
function EffectAssessment() {
  const chartRef = useRef<HTMLDivElement>(null);
  const data = dashboardStats.assessment_data;

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['干预前压力值', '干预后压力值'], bottom: 0 },
      grid: { top: 30, right: 30, bottom: 50, left: 50 },
      xAxis: { type: 'category', data: data.users, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', fontSize: 11 } },
      series: [
        { name: '干预前压力值', type: 'bar', data: data.before, itemStyle: { color: '#F87171', borderRadius: [4, 4, 0, 0] }, barWidth: 20 },
        { name: '干预后压力值', type: 'bar', data: data.after, itemStyle: { color: '#34D399', borderRadius: [4, 4, 0, 0] }, barWidth: 20 },
      ],
    });
    const r = () => chart.resize();
    window.addEventListener('resize', r);
    return () => { window.removeEventListener('resize', r); chart.dispose(); };
  }, [data]);

  const avgBefore = Math.round(data.before.reduce((a, b) => a + b, 0) / data.before.length);
  const avgAfter = Math.round(data.after.reduce((a, b) => a + b, 0) / data.after.length);
  const improvement = Math.round(((avgBefore - avgAfter) / avgBefore) * 100);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">干预效果评估</h1><p className="text-gray-500 text-sm">对比干预前后的压力指数变化</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="text-sm text-gray-500 mb-1">平均干预前压力</div><div className="text-3xl font-bold text-red-500">{avgBefore}%</div></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><div className="text-sm text-gray-500 mb-1">平均干预后压力</div><div className="text-3xl font-bold text-emerald-500">{avgAfter}%</div></div>
        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-sm p-5 text-white"><div className="text-sm opacity-90 mb-1">综合改善率</div><div className="text-3xl font-bold">↓ {improvement}%</div><div className="text-xs opacity-80 mt-1">干预效果显著</div></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-1">用户压力指数对比</h3>
        <div ref={chartRef} style={{ width: '100%', height: '350px' }}></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-3">个体改善详情</h3>
        <div className="space-y-3">
          {data.users.map((name, i) => {
            const imp = Math.round(((data.before[i] - data.after[i]) / data.before[i]) * 100);
            return (
              <div key={name} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-600">{name[0]}</div>
                <div className="flex-1"><div className="text-sm font-medium text-gray-900">{name}</div><div className="text-xs text-gray-500">{data.before[i]}% → {data.after[i]}%</div></div>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${imp}%` }}></div></div>
                <span className="text-sm font-semibold text-emerald-600">↓{imp}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============ Activity Management ============
function ActivityManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">活动管理推送</h1><p className="text-gray-500 text-sm">创建活动并自动匹配目标用户</p></div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">+ 创建活动</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockActivities.map(a => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
            <div className={`h-2 ${a.status === '已发布' ? 'bg-emerald-500' : a.status === '草稿' ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{a.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.status === '已发布' ? 'bg-emerald-100 text-emerald-700' : a.status === '草稿' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{a.status}</span>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{a.description}</p>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-2"><span>📅</span><span>{a.date}</span></div>
                <div className="flex items-center gap-2"><span>🎯</span><span>目标人群：<span className="text-indigo-600 font-medium">{a.target_tag}</span></span></div>
                <div className="flex items-center gap-2"><span>👥</span><span>匹配用户：<span className="text-indigo-600 font-bold">{a.matched_users}</span> 人</span></div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button className="flex-1 py-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 font-medium transition">查看推送列表</button>
                <button className="py-2 px-3 text-sm text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition">📤 导出</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-1">🎯 "周五颂钵音疗" 匹配用户列表</h3>
        <p className="text-xs text-gray-400 mb-4">自动匹配标签为"重度焦虑"的用户</p>
        <table className="w-full">
          <thead><tr className="bg-gray-50 border-b border-gray-100">
            {['用户', '压力敏感度', '标签', '推送状态'].map(h => (
              <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {mockUsers.filter(u => u.tag === '重度焦虑').map(u => (
              <tr key={u.id} className="border-b border-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-sm text-red-600 font-semibold">{u.latest_stress}%</td>
                <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">{u.tag}</span></td>
                <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">待推送</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ Algorithm Test Panel (Phase 2 验证) ============
function AlgorithmTestPanel() {
  const [testResults, setTestResults] = useState<ReturnType<typeof runAlgorithmTest> | null>(null);
  const [running, setRunning] = useState(false);

  const runTests = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const results = runAlgorithmTest();
      setTestResults(results);
      setRunning(false);

      console.log('═══════════════════════════════════════════════');
      console.log('🧪 [AlgorithmTest] 测试结果:');
      results.scenarios.forEach(s => {
        console.log(`\n  ${s.passed ? '✅' : '❌'} ${s.name} (${s.scenario}):`);
        s.checks.forEach(c => console.log(`    ${c.passed ? '✅' : '❌'} ${c.check} → ${c.detail}`));
      });
      console.log('═══════════════════════════════════════════════');
    }, 500);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🧪 算法验证面板</h1>
          <p className="text-gray-500 text-sm">Phase 2: MockAlgorithmService 单元测试</p>
        </div>
        <button onClick={runTests} disabled={running}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50">
          {running ? '⏳ 运行中...' : '▶ 运行测试'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Phase 2 验证说明：</strong>本面板运行 3 组场景测试（正常/高压/放松），验证 MockAlgorithmService 接收原始 MQTT 数据后，按照 PRD 第五节算法逻辑输出的衍生指标是否在预期范围内。
      </div>

      {testResults && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            {testResults.scenarios.map(s => (
              <div key={s.name} className={`rounded-xl p-4 border ${s.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="text-lg mb-1">{s.passed ? '✅' : '❌'}</div>
                <div className="font-semibold text-gray-800 text-sm">{s.name}</div>
                <div className="text-xs text-gray-500">场景: {s.scenario}</div>
                <div className="text-xs mt-1">{s.checks.filter(c => c.passed).length}/{s.checks.length} 项通过</div>
              </div>
            ))}
          </div>

          {/* Detail */}
          {testResults.scenarios.map(s => (
            <div key={s.name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                {s.passed ? '✅' : '❌'} {s.name}
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">scenario: {s.scenario}</span>
              </h3>

              {/* Metrics Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: '压力敏感度', value: `${s.result.derived_metrics.stress_sensitivity}%` },
                  { label: 'HRV', value: `${s.result.derived_metrics.hrv}ms` },
                  { label: '自主神经', value: `${s.result.derived_metrics.autonomic_balance}` },
                  { label: '体质', value: s.result.derived_metrics.tcm_constitution.primary },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-2">
                    <div className="text-xs text-gray-500">{item.label}</div>
                    <div className="text-sm font-bold text-gray-800">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Check Results */}
              <div className="space-y-2">
                {s.checks.map((c, i) => (
                  <div key={i} className={`flex items-center gap-3 p-2 rounded-lg text-sm ${c.passed ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <span>{c.passed ? '✅' : '❌'}</span>
                    <span className="flex-1 text-gray-700">{c.check}</span>
                    <span className="text-xs text-gray-500 font-mono">{c.detail}</span>
                  </div>
                ))}
              </div>

              {/* Algorithm Log */}
              <details className="mt-3">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">查看算法日志</summary>
                <div className="mt-2 bg-slate-900 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {s.result.algorithm_log.map((line, i) => (
                    <div key={i} className={`text-xs font-mono mb-0.5 ${
                      line.includes('✅') ? 'text-emerald-400' :
                      line.includes('Step') ? 'text-indigo-400' :
                      'text-slate-400'
                    }`}>{line}</div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>
      )}

      {!testResults && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🧪</div>
          点击"运行测试"开始验证算法引擎
        </div>
      )}
    </div>
  );
}

// ============ AI Configuration Panel ============
function AIConfigPanel() {
  const [status, setStatus] = useState<{
    configured: boolean;
    model: string;
    base_url: string;
    api_key_preview: string;
    available_models: Array<{ id: string; name: string; description: string }>;
    system_prompt: string;
  } | null>(null);

  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek-ai/DeepSeek-V3');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: string; message?: string; source?: string; model?: string;
    response_time_ms?: number; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    content_preview?: string; content_length?: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [isMockMode, setIsMockMode] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/ai/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setSelectedModel(data.model);
        setIsMockMode(false);
      } else {
        setIsMockMode(true);
      }
    } catch {
      setIsMockMode(true);
      setStatus({
        configured: false,
        model: 'deepseek-ai/DeepSeek-V3',
        base_url: 'https://api.siliconflow.cn/v1',
        api_key_preview: '未配置',
        available_models: [
          { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', description: '综合能力强，性价比高（推荐）' },
          { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', description: '推理增强型，分析更深入' },
          { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5 72B', description: '阿里通义千问，中文能力优秀' },
          { id: 'Pro/Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5 7B (轻量)', description: '响应快速' },
          { id: 'THUDM/glm-4-9b-chat', name: 'GLM-4 9B', description: '清华智谱' },
        ],
        system_prompt: SYSTEM_PROMPT_TEXT,
      });
    }
  };

  const updateConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const body: Record<string, string> = { model: selectedModel };
      if (apiKey.trim()) body.api_key = apiKey.trim();

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/ai/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setApiKey('');
        setError('');
      } else {
        const err = await res.text();
        setError(`配置更新失败: ${err}`);
      }
    } catch (e) {
      setError(`网络错误: ${(e as Error).message}。请确保后端已启动 (node server/index.js)`);
    }
    setLoading(false);
  };

  const testAI = async () => {
    setLoading(true);
    setTestResult(null);
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/ai/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setError(`测试失败: ${(e as Error).message}。请确保后端已启动。`);
    }
    setLoading(false);
  };

  const models = status?.available_models || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🤖 AI 大模型配置</h1>
        <p className="text-gray-500 text-sm">管理硅基流动 AI 大模型连接 · 生成个性化健康分析报告</p>
      </div>

      {/* Connection Status Banner */}
      {isMockMode ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-amber-800 mb-1">当前为 Mock 模式 — 未连接后端</h3>
              <p className="text-sm text-amber-700 mb-3">AI 配置需要连接真实后端才能生效。请按以下步骤操作：</p>
              <div className="bg-white/60 rounded-lg p-4 font-mono text-xs text-amber-900 space-y-1">
                <div className="text-amber-600 font-sans text-sm font-semibold mb-2">启动步骤：</div>
                <div><span className="text-gray-500"># 1. 复制配置文件并填入 API Key</span></div>
                <div>cp .env.example .env</div>
                <div><span className="text-gray-500"># 2. 编辑 .env，填入你的硅基流动 API Key</span></div>
                <div>SILICONFLOW_API_KEY=sk-xxxxxxxxxxxxxxxx</div>
                <div><span className="text-gray-500"># 3. 启动后端</span></div>
                <div>node server/index.js</div>
                <div><span className="text-gray-500"># 4. 在另一个终端启动前端 (配置 .env 中的 VITE_API_MODE=live)</span></div>
                <div>npm run dev</div>
              </div>
              <a href="https://cloud.siliconflow.cn/account/ak" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                🔑 前往硅基流动获取 API Key →
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className={`rounded-xl p-5 border ${status?.configured ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{status?.configured ? '✅' : '⚠️'}</span>
            <div>
              <h3 className={`font-semibold ${status?.configured ? 'text-emerald-800' : 'text-amber-800'}`}>
                {status?.configured ? '已连接真实后端 · AI 服务就绪' : '已连接后端 · 但未配置 API Key'}
              </h3>
              <p className="text-sm text-gray-600">
                模型: <span className="font-mono font-medium">{status?.model}</span>
                {' '} · API Key: <span className="font-mono">{status?.api_key_preview}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">配置 AI 服务</h3>
        <div className="space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              硅基流动 API Key
              <a href="https://cloud.siliconflow.cn/account/ak" target="_blank" rel="noreferrer"
                className="ml-2 text-xs text-indigo-500 hover:text-indigo-700">(获取密钥 →)</a>
            </label>
            <input
              type="password"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              {isMockMode
                ? '配置后需写入 .env 文件并重启后端生效'
                : '留空则保持当前密钥不变，输入新值会立即替换'
              }
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择模型</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {models.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`text-left p-3 rounded-lg border-2 transition ${
                    selectedModel === m.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-100 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border-2 ${
                      selectedModel === m.id ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                    }`}>
                      {selectedModel === m.id && (
                        <div className="w-full h-full rounded-full bg-white scale-[0.4]"></div>
                      )}
                    </div>
                    <span className="font-medium text-sm text-gray-800">{m.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-5">{m.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5 ml-5 font-mono">{m.id}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={updateConfig}
              disabled={loading || isMockMode}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ 保存中...' : '💾 保存配置'}
            </button>
            <button
              onClick={testAI}
              disabled={loading || isMockMode}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ 测试中...' : '🧪 测试连接'}
            </button>
            <button
              onClick={checkStatus}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              🔄 刷新状态
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              ❌ {error}
            </div>
          )}
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`rounded-xl border p-5 ${testResult.status === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <h3 className={`font-semibold mb-3 ${testResult.status === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
            {testResult.status === 'success' ? '✅ AI 服务测试成功' : '❌ AI 服务测试失败'}
          </h3>
          {testResult.status === 'success' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/70 rounded-lg p-3">
                  <div className="text-xs text-gray-500">来源</div>
                  <div className="text-sm font-semibold text-gray-800">{testResult.source === 'siliconflow_api' ? '🤖 真实 API' : '📝 Fallback'}</div>
                </div>
                <div className="bg-white/70 rounded-lg p-3">
                  <div className="text-xs text-gray-500">模型</div>
                  <div className="text-sm font-semibold text-gray-800 truncate">{testResult.model}</div>
                </div>
                <div className="bg-white/70 rounded-lg p-3">
                  <div className="text-xs text-gray-500">响应时间</div>
                  <div className="text-sm font-semibold text-gray-800">{testResult.response_time_ms}ms</div>
                </div>
                <div className="bg-white/70 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Token 消耗</div>
                  <div className="text-sm font-semibold text-gray-800">{testResult.usage?.total_tokens || '—'}</div>
                </div>
              </div>
              {testResult.content_preview && (
                <div className="bg-white/70 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-2">生成内容预览 ({testResult.content_length} 字符)</div>
                  <div className="text-sm text-gray-700 leading-relaxed">{testResult.content_preview}</div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-red-700">{testResult.message}</p>
          )}
        </div>
      )}

      {/* System Prompt */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div>
            <h3 className="font-semibold text-gray-800">📜 System Prompt (PRD 第六节)</h3>
            <p className="text-xs text-gray-500 mt-0.5">发送给大模型的系统提示词，定义了报告的输出格式</p>
          </div>
          <span className="text-gray-400">{showPrompt ? '▲' : '▼'}</span>
        </button>
        {showPrompt && (
          <div className="px-6 pb-5 border-t border-gray-100 pt-4">
            <div className="bg-slate-900 rounded-lg p-4 text-sm text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
              {status?.system_prompt || SYSTEM_PROMPT_TEXT}
            </div>
          </div>
        )}
      </div>

      {/* Architecture Diagram */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">🏗️ AI 报告生成架构</h3>
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center">
          {[
            { icon: '💺', label: '智能坐垫', sub: 'MQTT 数据' },
            { icon: '→', label: '', sub: '' },
            { icon: '🧮', label: '算法引擎', sub: 'HRV/压力/体质' },
            { icon: '→', label: '', sub: '' },
            { icon: '🤖', label: '硅基流动 API', sub: status?.model || 'DeepSeek-V3' },
            { icon: '→', label: '', sub: '' },
            { icon: '📊', label: '健康报告', sub: 'Markdown 文本' },
          ].map((step, i) => (
            step.label ? (
              <div key={i} className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100 min-w-[120px]">
                <div className="text-2xl mb-1">{step.icon}</div>
                <div className="text-sm font-semibold text-gray-800">{step.label}</div>
                <div className="text-xs text-gray-500">{step.sub}</div>
              </div>
            ) : (
              <div key={i} className="text-gray-300 text-xl font-bold hidden sm:block">{step.icon}</div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

const SYSTEM_PROMPT_TEXT = `你是一位融合了中医体质学与现代心理生理学的主治医师。请根据以下智能坐垫采集到的用户生理指标JSON，生成一份严谨、有同理心的健康综合分析与建议。
必须包含以下四个模块结构返回（使用Markdown）：
### 总体健康状态概述
[分析用户整体情况，包含综合评分解读]
### 各板块详细分析
[结合HRV分析心脏自主神经调节能力、结合自主神经平衡指数分析情绪状态、结合体质评估给出中医倾向分析]
### 风险指标预警
[列出重度/中度/轻度风险项，每项包含具体数值和正常范围对比]
### 个性化健康建议
[分为短期1-3个月调整、长期6-12个月干预，并给出具体的饮食方案和作息建议。如果有中医体质倾向，请给出对应的食疗和穴位按摩建议]`;

// ============ Main Admin Component ============
export default function AdminPages() {
  const [activePage, setActivePage] = useState<AdminPage>('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  // Phase 5: Stateful rules and logs
  const [rules, setRules] = useState<InterventionRule[]>(defaultRules);
  const [logs, setLogs] = useState<InterventionLog[]>(defaultLogs);

  const handleTriggerIntervention = useCallback((newLogs: InterventionLog[]) => {
    setLogs(prev => [...newLogs, ...prev]);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar active={activePage} onChange={setActivePage} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {activePage === 'dashboard' && <Dashboard />}
          {activePage === 'users' && <UserManagement />}
          {activePage === 'rules' && <RuleEngine rules={rules} onUpdateRules={setRules} onTriggerIntervention={handleTriggerIntervention} />}
          {activePage === 'logs' && <InterventionLogs logs={logs} />}
          {activePage === 'assessment' && <EffectAssessment />}
          {activePage === 'activities' && <ActivityManagement />}
          {activePage === 'ai-config' && <AIConfigPanel />}
          {activePage === 'test' && <AlgorithmTestPanel />}
        </div>
      </main>
    </div>
  );
}
