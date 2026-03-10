import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as echarts from 'echarts';
import { api, getApiConfig } from '../api';
import type { MeasurementRecord, DerivedMetrics } from '../api/types';

// ============ Main Report Page ============
export default function H5Report() {
  const navigate = useNavigate();
  const { id: measurementId } = useParams<{ id: string }>();
  const [report, setReport] = useState<MeasurementRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('正在加载报告...');
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [aiSource, setAiSource] = useState<string>('unknown');

  // 加载报告数据
  useEffect(() => {
    const fetchReport = async () => {
      try {
        const config = getApiConfig();

        if (measurementId === 'local' || config.isMock) {
          // ══════════════════════════════════════
          // Mock 模式 或 降级模式：从 localStorage 读取
          // ══════════════════════════════════════
          setLoadingStatus('📦 读取本地数据...');
          await new Promise(r => setTimeout(r, 500));

          const savedData = localStorage.getItem('h5_report_data');
          if (savedData) {
            const parsed = JSON.parse(savedData);
            setReport(parsed);
            setAiSource('local_mock');
          } else {
            // 没有 localStorage 数据，就现场生成一份 mock
            setLoadingStatus('🧮 本地算法引擎计算中...');
            await new Promise(r => setTimeout(r, 800));

            const mockReport = api.measurements.generateMockReport('访客', 'U001', 30, 'normal');
            setReport(mockReport);
            setAiSource('local_mock');
          }
        } else {
          // ══════════════════════════════════════
          // Live 模式：从后端 API 获取真实报告
          // ══════════════════════════════════════
          setLoadingStatus('📡 正在从服务器获取报告...');

          const reportData = await api.measurements.getReport(measurementId!);
          setReport(reportData);

          // 检查 AI 来源
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const meta = (reportData as any).ai_meta;
          if (meta?.source) {
            setAiSource(meta.source);
          } else {
            setAiSource('backend');
          }

          console.log('✅ 报告数据加载成功:', {
            id: reportData.id,
            ai_source: meta?.source || 'unknown',
            ai_model: meta?.model || 'unknown',
          });
        }
      } catch (err) {
        console.error('❌ 加载报告失败:', err);
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [measurementId]);

  // Loading 状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center p-6">
        <svg className="animate-spin h-12 w-12 text-emerald-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-slate-300">{loadingStatus}</p>
      </div>
    );
  }

  // 错误状态
  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">😵</div>
        <h2 className="text-xl font-bold mb-2">报告加载失败</h2>
        <p className="text-slate-400 text-sm mb-6">{error || '未找到报告数据'}</p>
        <button onClick={() => navigate('/h5/register')}
          className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-medium">
          返回重新检测
        </button>
      </div>
    );
  }

  const m = report.derived_metrics;

  // AI 来源标签
  const getAiSourceLabel = () => {
    switch (aiSource) {
      case 'siliconflow_api': return { text: '🤖 AI 真实分析 (硅基流动)', color: 'bg-emerald-500/20 text-emerald-400' };
      case 'fallback_template': return { text: '📝 模板报告 (未配置API Key)', color: 'bg-amber-500/20 text-amber-400' };
      case 'fallback_api_error': return { text: '⚠️ 模板报告 (API调用失败)', color: 'bg-red-500/20 text-red-400' };
      case 'fallback_network_error': return { text: '⚠️ 模板报告 (网络错误)', color: 'bg-red-500/20 text-red-400' };
      case 'local_mock': return { text: '🟡 本地模拟 (Mock模式)', color: 'bg-amber-500/20 text-amber-400' };
      default: return { text: '📊 后端生成', color: 'bg-blue-500/20 text-blue-400' };
    }
  };

  const aiLabel = getAiSourceLabel();

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 pt-6 pb-20 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <button onClick={() => navigate('/')} className="text-white/70 text-sm flex items-center gap-1 mb-4">
            ← 返回首页
          </button>
          <h1 className="text-xl font-bold">🔬 健康综合报告</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-emerald-100">
            <span>👤 {report.user_name}</span>
            <span>·</span>
            <span>📅 {report.start_time?.split(' ')[0] || '今日'}</span>
            <span>·</span>
            <span>⏱ {report.duration_minutes}分钟</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-emerald-200">
            <span>设备：{report.device_id}</span>
            <span>·</span>
            <span>ID: {report.id}</span>
          </div>
          {/* AI Source Badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mt-3 ${aiLabel.color}`}>
            {aiLabel.text}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 -mt-14 space-y-4">
        <HealthScoreRing score={m.health_score} />
        <MetricCards metrics={m} />

        <TimelineChart
          data={report.hr_timeline} labels={report.time_labels}
          title="心率" icon="❤️" color="#EF4444" unit="bpm"
          min={50} max={115} lowerThreshold={60} upperThreshold={100}
        />

        <TimelineChart
          data={report.br_timeline} labels={report.time_labels}
          title="呼吸" icon="🫁" color="#3B82F6" unit="次/分"
          min={8} max={28} lowerThreshold={12} upperThreshold={20}
        />

        <EmotionCards metrics={m} />
        <AutonomicBalance value={m.autonomic_balance} />
        <StressGauge value={m.stress_sensitivity} />
        <TCMConstitution constitution={m.tcm_constitution} />

        {/* AI Report */}
        <AIAnalysis
          text={report.ai_analysis || '暂无AI分析数据'}
          showPrompt={showPrompt}
          onTogglePrompt={() => setShowPrompt(!showPrompt)}
          aiSource={aiSource}
        />

        {/* Algorithm Debug Panel */}
        {report.algorithm_log && report.algorithm_log.length > 0 && (
          <details className="bg-slate-900 rounded-2xl shadow overflow-hidden">
            <summary className="text-sm font-semibold text-slate-300 p-4 cursor-pointer hover:bg-slate-800 transition">
              🔧 算法引擎调试面板（开发者）
            </summary>
            <div className="p-4 pt-0 space-y-3">
              <div>
                <div className="text-xs text-indigo-400 mb-2 font-mono">算法执行日志:</div>
                <div className="bg-black/30 rounded-lg p-3 max-h-60 overflow-y-auto">
                  {report.algorithm_log.map((line, i) => (
                    <div key={i} className={`text-xs font-mono mb-0.5 ${
                      line.includes('✅') ? 'text-emerald-400' :
                      line.includes('Step') ? 'text-indigo-400' :
                      line.includes('⚠️') ? 'text-amber-400' :
                      'text-slate-400'
                    }`}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-indigo-400 mb-2 font-mono">derived_metrics JSON:</div>
                <pre className="bg-black/30 rounded-lg p-3 text-xs text-slate-400 font-mono overflow-x-auto max-h-48 overflow-y-auto">
                  {JSON.stringify(m, null, 2)}
                </pre>
              </div>
            </div>
          </details>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={() => navigate('/h5/register')}
            className="flex-1 py-3 rounded-xl border-2 border-emerald-500 text-emerald-600 font-medium hover:bg-emerald-50 transition">
            🔄 重新检测
          </button>
          <button onClick={() => navigate('/')}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium shadow hover:shadow-lg transition">
            🏠 返回首页
          </button>
        </div>
      </div>
    </div>
  );
}


// ============ Health Score Ring ============
function HealthScoreRing({ score }: { score: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score > 75 ? '#10B981' : score > 60 ? '#F59E0B' : '#EF4444';
  const label = score > 75 ? '良好' : score > 60 ? '中等' : '需关注';

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
      <h3 className="text-sm text-gray-500 mb-4 font-medium">健康综合评分</h3>
      <div className="relative inline-block">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="12" />
          <circle
            cx="90" cy="90" r={radius}
            fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            transform="rotate(-90 90 90)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>{score}</span>
          <span className="text-sm text-gray-500">{label}</span>
        </div>
      </div>
    </div>
  );
}

// ============ Metric Cards ============
function MetricCards({ metrics }: { metrics: DerivedMetrics }) {
  const cards = [
    { label: '平均心率', value: `${metrics.avg_hr}`, unit: 'bpm', icon: '❤️', color: 'text-red-500' },
    { label: '平均呼吸', value: `${metrics.avg_br}`, unit: '次/分', icon: '🫁', color: 'text-blue-500' },
    { label: 'HRV', value: `${metrics.hrv}`, unit: 'ms', icon: '📊', color: 'text-purple-500' },
    { label: '坐姿正确率', value: `${metrics.posture_correct_rate}`, unit: '%', icon: '🪑', color: 'text-teal-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c, i) => (
        <div key={i} className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{c.icon}</span>
            <span className="text-xs text-gray-500">{c.label}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${c.color}`}>{c.value}</span>
            <span className="text-xs text-gray-400">{c.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ Timeline Chart ============
function TimelineChart({ data, labels, title, icon, color, unit, min, max, lowerThreshold, upperThreshold }: {
  data: number[];
  labels: string[];
  title: string;
  icon: string;
  color: string;
  unit: string;
  min: number;
  max: number;
  lowerThreshold: number;
  upperThreshold: number;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const sampledData = data.filter((_, i) => i % 3 === 0);
    const sampledLabels = labels.filter((_, i) => i % 3 === 0);

    chart.setOption({
      grid: { top: 30, right: 15, bottom: 30, left: 45 },
      tooltip: { trigger: 'axis', formatter: (p: unknown) => {
        const params = p as Array<{ axisValue: string; value: number }>;
        return `${params[0].axisValue}<br/>${title}: ${params[0].value} ${unit}`;
      }},
      xAxis: {
        type: 'category',
        data: sampledLabels,
        axisLabel: { fontSize: 9, color: '#9CA3AF', interval: Math.floor(sampledLabels.length / 5) },
        axisLine: { lineStyle: { color: '#E5E7EB' } },
      },
      yAxis: {
        type: 'value', min, max,
        splitLine: { lineStyle: { color: '#F3F4F6' } },
        axisLabel: { fontSize: 9, color: '#9CA3AF' },
      },
      series: [{
        type: 'line',
        data: sampledData,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: color + '40' },
            { offset: 1, color: color + '05' },
          ]),
        },
        markArea: {
          silent: true,
          data: [
            [{ yAxis: lowerThreshold, itemStyle: { color: 'rgba(16,185,129,0.06)' } }, { yAxis: upperThreshold }],
            [{ yAxis: min, itemStyle: { color: 'rgba(239,68,68,0.06)' } }, { yAxis: lowerThreshold }],
            [{ yAxis: upperThreshold, itemStyle: { color: 'rgba(239,68,68,0.06)' } }, { yAxis: max }],
          ],
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', width: 1 },
          data: [
            { yAxis: lowerThreshold, lineStyle: { color: '#10B981' }, label: { formatter: `下限 ${lowerThreshold}`, fontSize: 9, color: '#10B981' } },
            { yAxis: upperThreshold, lineStyle: { color: '#EF4444' }, label: { formatter: `上限 ${upperThreshold}`, fontSize: 9, color: '#EF4444' } },
          ],
        },
      }],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [data, labels, title, color, unit, min, max, lowerThreshold, upperThreshold]);

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">{icon} {title}趋势</h3>
      <p className="text-xs text-gray-400 mb-3">检测期间{title}变化曲线</p>
      <div ref={chartRef} style={{ width: '100%', height: '220px' }}></div>
    </div>
  );
}

// ============ Autonomic Balance ============
function AutonomicBalance({ value }: { value: number }) {
  const percentage = (value / 5) * 100;
  const label = value > 2.5 ? '交感神经主导' : value > 1.8 ? '基本平衡' : '副交感神经主导';
  const labelColor = value > 2.5 ? 'text-red-500' : value > 1.8 ? 'text-emerald-500' : 'text-blue-500';

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">☯️ 自主神经评估</h3>
      <p className="text-xs text-gray-400 mb-4">交感/副交感神经平衡状态</p>
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="text-3xl animate-spin" style={{ animationDuration: '8s' }}>☯️</div>
        <div>
          <div className="text-3xl font-bold text-gray-900">{value}</div>
          <div className={`text-sm font-medium ${labelColor}`}>{label}</div>
        </div>
      </div>
      <div className="relative h-4 bg-gradient-to-r from-blue-400 via-emerald-400 to-red-400 rounded-full overflow-hidden">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full border-2 border-gray-800 shadow-lg transition-all duration-1000"
          style={{ left: `calc(${percentage}% - 10px)` }}
        ></div>
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>副交感 (放松)</span>
        <span>平衡</span>
        <span>交感 (亢奋)</span>
      </div>
    </div>
  );
}

// ============ TCM Constitution ============
function TCMConstitution({ constitution }: { constitution: DerivedMetrics['tcm_constitution'] }) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const names = Object.keys(constitution.all_scores);
    const values = Object.values(constitution.all_scores) as number[];

    chart.setOption({
      grid: { top: 10, right: 60, bottom: 5, left: 80 },
      xAxis: {
        type: 'value', max: 100,
        axisLabel: { fontSize: 9, color: '#9CA3AF' },
        splitLine: { lineStyle: { color: '#F3F4F6' } },
      },
      yAxis: {
        type: 'category', data: names,
        axisLabel: { fontSize: 11, color: '#4B5563' },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: {
            color: names[i] === constitution.primary ? '#10B981' :
              names[i] === constitution.secondary ? '#3B82F6' : '#E5E7EB',
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true, position: 'right', formatter: '{c}分', fontSize: 10,
            color: names[i] === constitution.primary ? '#10B981' : '#9CA3AF',
          },
        })),
        barWidth: 16,
      }],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [constitution]);

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">🏥 中医体质解析</h3>
      <p className="text-xs text-gray-400 mb-2">基于生理数据的体质倾向评估</p>
      <div className="flex gap-2 mb-3 flex-wrap">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
          🏆 主要：{constitution.primary}（{constitution.primary_score}分）
        </span>
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
          次要：{constitution.secondary}（{constitution.secondary_score}分）
        </span>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '280px' }}></div>
    </div>
  );
}

// ============ Stress Gauge ============
function StressGauge({ value }: { value: number }) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    chart.setOption({
      series: [{
        type: 'gauge',
        startAngle: 180, endAngle: 0,
        center: ['50%', '70%'], radius: '100%',
        min: 0, max: 100, splitNumber: 10,
        axisLine: {
          lineStyle: {
            width: 20,
            color: [[0.4, '#10B981'], [0.7, '#F59E0B'], [1, '#EF4444']],
          },
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '55%', width: 8,
          offsetCenter: [0, '-10%'],
          itemStyle: { color: 'auto' },
        },
        axisTick: { distance: -20, length: 6, lineStyle: { color: '#fff', width: 1 } },
        splitLine: { distance: -24, length: 16, lineStyle: { color: '#fff', width: 2 } },
        axisLabel: { color: '#9CA3AF', distance: -12, fontSize: 10 },
        detail: {
          valueAnimation: true, formatter: '{value}%',
          color: 'inherit', fontSize: 28, fontWeight: 'bold',
          offsetCenter: [0, '10%'],
        },
        data: [{ value }],
      }],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [value]);

  const label = value > 70 ? '高压力' : value > 50 ? '中等压力' : '低压力';
  const labelColor = value > 70 ? 'text-red-500' : value > 50 ? 'text-amber-500' : 'text-emerald-500';

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">🧠 压力敏感度</h3>
      <p className="text-xs text-gray-400 mb-2">综合生理指标的压力评估</p>
      <div ref={chartRef} style={{ width: '100%', height: '180px' }}></div>
      <div className="text-center -mt-2">
        <span className={`text-sm font-medium ${labelColor}`}>{label}</span>
      </div>
    </div>
  );
}

// ============ Emotion Cards ============
function EmotionCards({ metrics }: { metrics: DerivedMetrics }) {
  const items = [
    {
      label: '焦虑指数', value: metrics.anxiety_level, icon: '😰',
      color: metrics.anxiety_level > 70 ? 'from-red-500 to-rose-500' : metrics.anxiety_level > 50 ? 'from-amber-500 to-orange-500' : 'from-emerald-500 to-teal-500',
      desc: metrics.anxiety_level > 70 ? '偏高' : metrics.anxiety_level > 50 ? '中等' : '正常',
    },
    {
      label: '疲劳指数', value: metrics.fatigue_index, icon: '😴',
      color: metrics.fatigue_index > 70 ? 'from-red-500 to-rose-500' : metrics.fatigue_index > 50 ? 'from-amber-500 to-orange-500' : 'from-emerald-500 to-teal-500',
      desc: metrics.fatigue_index > 70 ? '偏高' : metrics.fatigue_index > 50 ? '中等' : '正常',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, i) => (
        <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 text-white shadow`}>
          <div className="text-2xl mb-2">{item.icon}</div>
          <div className="text-xs opacity-80 mb-1">{item.label}</div>
          <div className="text-3xl font-bold">{item.value}%</div>
          <div className="text-xs opacity-80 mt-1">{item.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ============ AI Analysis Section ============
const SYSTEM_PROMPT_DISPLAY = `你是一位融合了中医体质学与现代心理生理学的主治医师。请根据以下智能坐垫采集到的用户生理指标JSON，生成一份严谨、有同理心的健康综合分析与建议。
必须包含以下四个模块结构返回（使用Markdown）：
### 总体健康状态概述
[分析用户整体情况，包含综合评分解读]
### 各板块详细分析
[结合HRV分析心脏、结合自主神经分析情绪、结合体质评估中医倾向]
### 风险指标预警
[列出重度/中度/轻度风险项]
### 个性化健康建议
[分为短期1-3个月调整、长期6-12个月干预，并给出饮食和作息建议]`;

function AIAnalysis({ text, showPrompt, onTogglePrompt, aiSource }: {
  text: string; showPrompt: boolean; onTogglePrompt: () => void; aiSource: string;
}) {
  const sections = text.split('### ').filter(Boolean);

  const sourceLabel = aiSource === 'siliconflow_api'
    ? '由硅基流动 AI 大模型真实生成'
    : aiSource === 'local_mock'
    ? '前端本地模拟生成（Mock模式）'
    : '由后端模板引擎生成（未配置API Key）';

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">🤖 AI 健康分析报告</h3>
        <button
          onClick={onTogglePrompt}
          className="text-xs text-indigo-500 hover:text-indigo-700 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition"
        >
          {showPrompt ? '隐藏' : '查看'} System Prompt
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">{sourceLabel}</p>

      {showPrompt && (
        <div className="bg-slate-900 rounded-xl p-4 mb-4 text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
          <div className="text-indigo-400 mb-2">// System Prompt (PRD 第六节)</div>
          {SYSTEM_PROMPT_DISPLAY}
        </div>
      )}

      <div className="space-y-4">
        {sections.map((section, i) => {
          const lines = section.split('\n').filter(Boolean);
          const title = lines[0];
          const content = lines.slice(1).join('\n');

          return (
            <div key={i} className="border-l-4 border-emerald-400 pl-4">
              <h4 className="font-semibold text-gray-800 mb-2 text-sm">{title}</h4>
              <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                {content.split('\n').map((line, j) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <div key={j} className="font-semibold text-gray-800 mt-2 mb-1">{line.replace(/\*\*/g, '')}</div>;
                  }
                  if (line.startsWith('- ')) {
                    return <div key={j} className="flex items-start gap-1.5 mb-1"><span className="text-emerald-500 mt-0.5">•</span><span>{line.slice(2).replace(/\*\*/g, '')}</span></div>;
                  }
                  if (line.startsWith('🔴') || line.startsWith('🟡') || line.startsWith('🟢')) {
                    return <div key={j} className="mb-1.5 text-sm">{line.replace(/\*\*/g, '')}</div>;
                  }
                  if (line.startsWith('> ')) {
                    return <div key={j} className="text-xs text-gray-400 italic mt-2 p-2 bg-gray-50 rounded">{line.slice(2)}</div>;
                  }
                  const cleaned = line.replace(/\*\*/g, '');
                  return cleaned ? <p key={j} className="mb-1.5">{cleaned}</p> : null;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
