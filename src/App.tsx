import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { getApiConfig } from './api';
import H5Register from './pages/H5Register';
import H5Measurement from './pages/H5Measurement';
import H5Report from './pages/H5Report';
import AdminPages from './pages/AdminPages';

function ApiModeIndicator() {
  const config = getApiConfig();
  return (
    <div className="fixed bottom-3 right-3 z-50">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm border ${
        config.isLive
          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
          : 'bg-amber-500/20 border-amber-500/30 text-amber-300'
      }`}>
        <div className={`w-2 h-2 rounded-full animate-pulse ${config.isLive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        {config.isLive ? `Live: ${config.baseUrl}` : 'Mock Mode'}
      </div>
    </div>
  );
}

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl"></div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Logo */}
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl shadow-emerald-500/20 mb-8 animate-float">
            <span className="text-5xl">🧘</span>
          </div>
        </div>

        {/* Title */}
        <div className="animate-fade-in-up anim-delay-1">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            情绪健康管理平台
            <br />
           
          </h1>
          <p className="text-lg text-indigo-300 mb-2 max-w-2xl mx-auto">
            融合中医体质学 · 现代心理生理学 · AI大模型分析
          </p>
        </div>

        {/* Feature tags */}
        <div className="flex flex-wrap justify-center gap-3 mt-8 mb-10 animate-fade-in-up anim-delay-2">
          {['心率监测', 'HRV分析', '中医体质', '压力评估', 'AI报告', 'IoT联动'].map((tag, i) => (
            <span
              key={tag}
              className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-sm backdrop-blur"
              style={{ animationDelay: `${0.3 + i * 0.1}s` }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto animate-fade-in-up anim-delay-3">
          {/* H5 User Card */}
          <button
            onClick={() => navigate('/h5/register')}
            className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-left hover:border-emerald-400/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition">
              <span className="text-2xl">📱</span>
            </div>
            <div className="text-emerald-400 text-sm font-medium mb-2">H5 用户端</div>
            <h2 className="text-xl font-bold text-white mb-2">个人健康检测</h2>
            <p className="text-sm text-indigo-300/80 mb-4">
              扫码绑定设备，实时监测心率与呼吸数据，生成个性化健康报告
            </p>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium group-hover:gap-3 transition-all">
              开始体验
              <span className="text-lg">→</span>
            </div>
          </button>

          {/* Admin Card */}
          <button
            onClick={() => navigate('/admin')}
            className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-left hover:border-indigo-400/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/30 transition">
              <span className="text-2xl">💼</span>
            </div>
            <div className="text-indigo-400 text-sm font-medium mb-2">SaaS 管理后台</div>
            <h2 className="text-xl font-bold text-white mb-2">商家运营管理</h2>
            <p className="text-sm text-indigo-300/80 mb-4">
              数据大盘、用户管理、干预规则配置、IoT设备联动、活动推送
            </p>
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium group-hover:gap-3 transition-all">
              进入后台
              <span className="text-lg">→</span>
            </div>
          </button>
        </div>

        {/* Bottom Info */}
        <div className="mt-12 animate-fade-in-up anim-delay-4">
          <div className="flex flex-wrap justify-center gap-8 text-xs text-indigo-400/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              MQTT 实时数据通信
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
              AI 大模型分析引擎
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
              IoT 设备自动化控制
            </div>
          </div>
        </div>

        {/* Architecture diagram */}
        <div className="mt-10 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 max-w-3xl mx-auto animate-fade-in-up anim-delay-5">
          <h3 className="text-sm font-semibold text-indigo-300 mb-4">系统架构</h3>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { name: '智能坐垫', icon: '💺', color: 'from-teal-500/20 to-emerald-500/20' },
              { name: '→', icon: '', color: '' },
              { name: 'MQTT', icon: '📡', color: 'from-blue-500/20 to-cyan-500/20' },
              { name: '→', icon: '', color: '' },
              { name: '算法引擎', icon: '⚙️', color: 'from-purple-500/20 to-indigo-500/20' },
              { name: '→', icon: '', color: '' },
              { name: 'AI 大模型', icon: '🤖', color: 'from-amber-500/20 to-orange-500/20' },
              { name: '→', icon: '', color: '' },
              { name: '报告/干预', icon: '📊', color: 'from-rose-500/20 to-pink-500/20' },
            ].map((item, i) =>
              item.icon ? (
                <div key={i} className={`bg-gradient-to-br ${item.color} border border-white/10 rounded-xl px-4 py-3 text-center`}>
                  <div className="text-xl mb-1">{item.icon}</div>
                  <div className="text-xs text-indigo-300">{item.name}</div>
                </div>
              ) : (
                <span key={i} className="text-indigo-500 text-lg font-bold">{item.name}</span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <ApiModeIndicator />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/h5/register" element={<H5Register />} />
        <Route path="/h5/measure" element={<H5Measurement />} />
        <Route path="/h5/report/:id" element={<H5Report />} />
        <Route path="/h5/report" element={<H5Report />} />
        <Route path="/admin" element={<AdminPages />} />
      </Routes>
    </HashRouter>
  );
}
