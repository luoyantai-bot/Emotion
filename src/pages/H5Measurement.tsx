import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as echarts from 'echarts';
import { api, getApiConfig } from '../api';

export default function H5Measurement() {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const [currentHR, setCurrentHR] = useState(72);
  const [currentBR, setCurrentBR] = useState(16);
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState('');
  const [measurementId, setMeasurementId] = useState<string | null>(null);
  const hrChartRef = useRef<HTMLDivElement>(null);
  const brChartRef = useRef<HTMLDivElement>(null);
  const hrChartInstance = useRef<echarts.ECharts | null>(null);
  const brChartInstance = useRef<echarts.ECharts | null>(null);
  const hrDataRef = useRef<number[]>([]);
  const brDataRef = useRef<number[]>([]);
  const MIN_SECONDS = 5; // 5秒模拟（实际是5分钟）

  // 获取用户信息（从localStorage）
  const getUserInfo = () => {
    try {
      const saved = localStorage.getItem('h5_user');
      return saved ? JSON.parse(saved) : { id: 'U001', name: '访客用户' };
    } catch {
      return { id: 'U001', name: '访客用户' };
    }
  };

  // 页面加载时，调后端开始检测
  useEffect(() => {
    const startMeasurement = async () => {
      try {
        const user = getUserInfo();
        const result = await api.measurements.start({
          user_id: user.id,
          device_id: 'Z4U524060082',
        });
        setMeasurementId(result.measurement_id);
        console.log('✅ 检测已开始:', result);
      } catch (e) {
        console.warn('开始检测失败(可能在mock模式):', e);
        setMeasurementId(`MR-${Date.now()}`);
      }
    };
    startMeasurement();
  }, []);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mark ready after MIN_SECONDS
  useEffect(() => {
    if (elapsed >= MIN_SECONDS && !isReady) {
      setIsReady(true);
    }
  }, [elapsed, isReady]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const createChartOption = useCallback((data: number[], color: string, min: number, max: number) => ({
    animation: false,
    grid: { top: 10, right: 10, bottom: 20, left: 40 },
    xAxis: {
      type: 'category' as const,
      data: data.map((_, i) => i),
      show: false,
    },
    yAxis: {
      type: 'value' as const,
      min,
      max,
      splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } },
      axisLabel: { fontSize: 10, color: '#9CA3AF' },
    },
    series: [{
      type: 'line' as const,
      data,
      smooth: true,
      symbol: 'none',
      lineStyle: { color, width: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: color + '40' },
          { offset: 1, color: color + '05' },
        ]),
      },
    }],
  }), []);

  // Initialize charts
  useEffect(() => {
    if (hrChartRef.current && !hrChartInstance.current) {
      hrChartInstance.current = echarts.init(hrChartRef.current);
    }
    if (brChartRef.current && !brChartInstance.current) {
      brChartInstance.current = echarts.init(brChartRef.current);
    }

    const handleResize = () => {
      hrChartInstance.current?.resize();
      brChartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      hrChartInstance.current?.dispose();
      brChartInstance.current?.dispose();
      hrChartInstance.current = null;
      brChartInstance.current = null;
    };
  }, []);

  // Update chart data
  useEffect(() => {
    const interval = setInterval(() => {
      const baseHR = 72 + Math.sin(Date.now() / 5000) * 5;
      const newHR = Math.round(baseHR + (Math.random() - 0.5) * 8);
      const baseBR = 16 + Math.sin(Date.now() / 8000) * 2;
      const newBR = Math.round(baseBR + (Math.random() - 0.5) * 3);

      setCurrentHR(newHR);
      setCurrentBR(newBR);

      hrDataRef.current.push(newHR);
      brDataRef.current.push(newBR);
      if (hrDataRef.current.length > 60) hrDataRef.current.shift();
      if (brDataRef.current.length > 60) brDataRef.current.shift();

      hrChartInstance.current?.setOption(createChartOption(hrDataRef.current, '#EF4444', 55, 100));
      brChartInstance.current?.setOption(createChartOption(brDataRef.current, '#3B82F6', 10, 25));
    }, 500);

    return () => clearInterval(interval);
  }, [createChartOption]);

  // ======================================
  // 核心：点击"生成报告"时的逻辑
  // ======================================
  const handleGenerateReport = async () => {
    if (!isReady || isGenerating) return;

    setIsGenerating(true);
    const config = getApiConfig();
    const user = getUserInfo();

    if (config.isLive) {
      // ════════════════════════════════════════
      // Live 模式：调用后端 API
      // 后端会执行：算法计算 → 真实AI调用 → 干预规则 → 保存数据库
      // ════════════════════════════════════════
      try {
        setGeneratingStatus('📡 正在将数据发送到后端服务器...');
        await new Promise(r => setTimeout(r, 500));

        setGeneratingStatus('🧮 后端算法引擎计算中...');
        const stopResult = await api.measurements.stop({
          measurement_id: measurementId || `MR-${Date.now()}`,
        });

        console.log('✅ 后端处理完成:', stopResult);

        if (stopResult.ai_source === 'siliconflow_api') {
          setGeneratingStatus('🤖 AI 大模型分析完成！（真实API）');
        } else {
          setGeneratingStatus('📝 报告已生成（模板模式）');
        }

        await new Promise(r => setTimeout(r, 800));

        // 跳转到报告页，携带 measurementId
        navigate(`/h5/report/${stopResult.measurement_id}`);

      } catch (error) {
        console.error('❌ 后端调用失败:', error);
        setGeneratingStatus('⚠️ 后端调用失败，降级到本地生成...');
        await new Promise(r => setTimeout(r, 1000));

        // 降级：前端本地生成
        const mockReport = api.measurements.generateMockReport(
          user.name || '访客', user.id || 'U001', 30, 'normal'
        );
        localStorage.setItem('h5_report_data', JSON.stringify(mockReport));
        navigate('/h5/report/local');
      }
    } else {
      // ════════════════════════════════════════
      // Mock 模式：前端本地生成（无后端）
      // ════════════════════════════════════════
      setGeneratingStatus('📡 模拟数据聚合...');
      await new Promise(r => setTimeout(r, 600));

      setGeneratingStatus('🧮 本地算法引擎计算...');
      await new Promise(r => setTimeout(r, 800));

      setGeneratingStatus('📝 生成模板报告...');
      const mockReport = api.measurements.generateMockReport(
        user.name || '访客', user.id || 'U001', 30, 'normal'
      );
      localStorage.setItem('h5_report_data', JSON.stringify(mockReport));

      await new Promise(r => setTimeout(r, 600));
      navigate('/h5/report/local');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <button onClick={() => navigate('/h5/register')} className="text-white/60 text-sm flex items-center gap-1">
          ← 返回
        </button>
      </div>

      {/* API Mode indicator */}
      <div className="px-6 mb-2">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
          getApiConfig().isLive
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${getApiConfig().isLive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
          {getApiConfig().isLive ? '🔗 后端已连接 (Live)' : '🟡 Mock 模式 (无后端)'}
        </div>
      </div>

      {/* Status */}
      <div className="text-center px-6 pb-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          检测进行中
        </div>
        <div className="text-5xl font-mono font-bold tracking-wider mb-2">{formatTime(elapsed)}</div>
        <p className="text-slate-400 text-sm">
          {isReady ? '✅ 已达到最低检测时长，可随时生成报告' : `⏳ 请保持静坐，至少需要${MIN_SECONDS}秒数据采集`}
        </p>
      </div>

      {/* Vital Signs Cards */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">心率</span>
            <span className="text-2xl animate-heartbeat">❤️</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-red-400">{currentHR}</span>
            <span className="text-red-400/60 text-sm">bpm</span>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">呼吸频率</span>
            <span className="text-2xl animate-breathe">🫁</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-blue-400">{currentBR}</span>
            <span className="text-blue-400/60 text-sm">次/分</span>
          </div>
        </div>
      </div>

      {/* Heart Rate Waveform */}
      <div className="px-4 mb-3">
        <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">心率波形</span>
            <span className="text-red-400 text-xs">实时</span>
          </div>
          <div ref={hrChartRef} style={{ width: '100%', height: '120px' }}></div>
        </div>
      </div>

      {/* Breath Rate Waveform */}
      <div className="px-4 mb-6">
        <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">呼吸波形</span>
            <span className="text-blue-400 text-xs">实时</span>
          </div>
          <div ref={brChartRef} style={{ width: '100%', height: '120px' }}></div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 backdrop-blur rounded-xl p-3 text-center border border-white/10">
            <div className="text-slate-400 text-xs mb-1">微动频率</div>
            <div className="text-amber-400 font-bold">{Math.round(Math.random() * 2)}</div>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-xl p-3 text-center border border-white/10">
            <div className="text-slate-400 text-xs mb-1">坐姿状态</div>
            <div className="text-emerald-400 font-bold">正常</div>
          </div>
          <div className="bg-white/5 backdrop-blur rounded-xl p-3 text-center border border-white/10">
            <div className="text-slate-400 text-xs mb-1">数据质量</div>
            <div className="text-emerald-400 font-bold">优</div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="px-4 pb-8">
        {isGenerating ? (
          <div className="w-full py-4 rounded-2xl bg-indigo-600 text-white text-center">
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-medium">{generatingStatus}</span>
            </div>
          </div>
        ) : (
          <button
            onClick={handleGenerateReport}
            disabled={!isReady}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
              isReady
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl active:scale-[0.98]'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isReady ? '🔬 结束并生成报告' : '⏳ 数据采集中...'}
          </button>
        )}
      </div>
    </div>
  );
}
