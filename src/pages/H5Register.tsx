import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getApiConfig } from '../api';

export default function H5Register() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    gender: '男' as '男' | '女',
    age: '',
    height: '',
    weight: '',
  });

  const bmi = form.height && form.weight
    ? (parseFloat(form.weight) / Math.pow(parseFloat(form.height) / 100, 2)).toFixed(1)
    : '--';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const userData = {
        tenant_id: 'T001',
        name: form.name,
        gender: form.gender,
        age: parseInt(form.age),
        height: parseFloat(form.height),
        weight: parseFloat(form.weight),
      };

      // 调后端创建用户（Live模式）或 Mock
      const user = await api.users.create(userData);

      // 保存用户信息到 localStorage，供后续页面使用
      localStorage.setItem('h5_user', JSON.stringify({
        id: user.id,
        name: user.name,
        gender: user.gender,
        age: user.age,
        bmi: user.bmi,
      }));

      console.log(`✅ 用户创建成功: ${user.id} (${user.name}), 模式: ${getApiConfig().isLive ? 'Live' : 'Mock'}`);
      navigate('/h5/measure');
    } catch (err) {
      console.error('创建用户失败:', err);
      // 降级：仍然可以继续
      localStorage.setItem('h5_user', JSON.stringify({
        id: 'U001',
        name: form.name || '访客',
        gender: form.gender,
        age: parseInt(form.age) || 30,
        bmi: bmi !== '--' ? parseFloat(bmi) : 22,
      }));
      navigate('/h5/measure');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-8 rounded-b-[2rem]">
        <div className="max-w-md mx-auto">
          <button onClick={() => navigate('/')} className="text-white/80 text-sm mb-4 flex items-center gap-1">
            ← 返回首页
          </button>
          <div className="text-3xl mb-2">🧘‍♀️</div>
          <h1 className="text-2xl font-bold">智能坐垫检测</h1>
          <p className="text-emerald-100 text-sm mt-1">请先完善个人基础信息</p>
        </div>
      </div>

      {/* Device Info */}
      <div className="max-w-md mx-auto px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl">💺</div>
          <div>
            <div className="text-sm text-gray-500">已绑定设备</div>
            <div className="font-semibold text-gray-900">智能坐垫 Z4U524060082</div>
          </div>
          <div className="ml-auto">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              在线
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-md mx-auto px-4 mt-6 pb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            📋 个人信息档案
          </h2>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">姓名</label>
            <input
              type="text"
              required
              placeholder="请输入您的姓名"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">性别</label>
            <div className="flex gap-3">
              {(['男', '女'] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm({ ...form, gender: g })}
                  className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${
                    form.gender === g
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {g === '男' ? '👨 男' : '👩 女'}
                </button>
              ))}
            </div>
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">年龄</label>
            <input
              type="number"
              required
              min="1"
              max="120"
              placeholder="请输入年龄"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
              value={form.age}
              onChange={e => setForm({ ...form, age: e.target.value })}
            />
          </div>

          {/* Height & Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">身高 (cm)</label>
              <input
                type="number"
                required
                min="100"
                max="250"
                placeholder="170"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                value={form.height}
                onChange={e => setForm({ ...form, height: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">体重 (kg)</label>
              <input
                type="number"
                required
                min="20"
                max="300"
                placeholder="70"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                value={form.weight}
                onChange={e => setForm({ ...form, weight: e.target.value })}
              />
            </div>
          </div>

          {/* BMI Display */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">BMI 指数</span>
            <span className={`text-lg font-bold ${
              bmi === '--' ? 'text-gray-400' :
              parseFloat(bmi) < 18.5 ? 'text-blue-500' :
              parseFloat(bmi) < 24 ? 'text-emerald-500' :
              parseFloat(bmi) < 28 ? 'text-amber-500' : 'text-red-500'
            }`}>
              {bmi}
              {bmi !== '--' && (
                <span className="text-xs font-normal text-gray-500 ml-2">
                  {parseFloat(bmi) < 18.5 ? '偏瘦' : parseFloat(bmi) < 24 ? '正常' : parseFloat(bmi) < 28 ? '偏胖' : '肥胖'}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full mt-6 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all ${
            submitting
              ? 'bg-gray-400 text-white cursor-wait'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 active:scale-[0.98]'
          }`}
        >
          {submitting ? '创建档案中...' : '开始检测 →'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">
          您的数据将受到严格保护，仅用于健康分析
        </p>
      </form>
    </div>
  );
}
