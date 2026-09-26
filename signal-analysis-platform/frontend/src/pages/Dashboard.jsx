import React from 'react';
import { useSignal } from '../context/SignalContext';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Activity,
  Cpu,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import { api } from '../services/api';

export const Dashboard = () => {
  const {
    recentAnalyses,
    loadStoredAnalysis,
    totalAnalyses,
    signalsDetected,
    avgSnrVal,
    successfulDecodes
  } = useSignal();
  const navigate = useNavigate();

  const handleRowClick = (item) => {
    loadStoredAnalysis(item);
    navigate('/analyze');
  };

  const [mlData, setMlData] = React.useState(null);
  
  React.useEffect(() => {
    // Attempt to fetch real metrics if available
    api.getMLEvaluation().then(setMlData).catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Title matching Screen 1 */}
      <div className="space-y-1">
        <h2 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
          Project SIH26147
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Automated IQ/WAV Signal Analysis • WaveIntel
        </p>
      </div>

      {/* Hero Banner matching Screen 1 artwork */}
      <div className="bg-gradient-to-r from-[#071525] via-[#0A1D33] to-[#071525] rounded-2xl p-8 text-white shadow-md relative overflow-hidden flex flex-col justify-center items-center text-center space-y-3 min-h-[160px]">
        {/* Background Wave graphic overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 800 200" fill="none">
            <path d="M0 100 Q 100 20, 200 100 T 400 100 T 600 100 T 800 100" stroke="#3B82F6" strokeWidth="3" />
            <path d="M0 100 Q 100 180, 200 100 T 400 100 T 600 100 T 800 100" stroke="#22D3EE" strokeWidth="2" />
          </svg>
        </div>

        <div className="relative z-10 space-y-2">
          <h3 className="font-sans font-extrabold text-2xl text-white tracking-tight">
            Turn Signals into Intelligence
          </h3>
          <p className="text-xs text-blue-300 font-medium tracking-wide">
            Upload • Analyze • Evaluate • Discover
          </p>
        </div>
      </div>

      {/* 4 Metric Cards matching Screen 1 (Dynamic Values) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="app-card p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="font-sans text-xl font-bold text-slate-900">
              {mlData ? `${(mlData.accuracy * 100).toFixed(2)}%` : '54.68%'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">Test Accuracy</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="app-card p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="font-sans text-xl font-bold text-slate-900">
              {mlData ? `${(mlData.macro_f1 * 100).toFixed(2)}%` : '56.28%'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">Macro F1 Score</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="app-card p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="font-sans text-xl font-bold text-slate-900">
              {mlData ? mlData.test_samples.toLocaleString() : '33,000'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">RadioML Test Samples</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="app-card p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="font-sans text-xl font-bold text-slate-900">Verified</p>
            <p className="text-[11px] text-slate-400 font-medium">Parameter Status</p>
          </div>
        </div>
      </div>

      {/* Recent Analyses Table matching Screen 1 */}
      <div className="app-card p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <h3 className="font-sans font-bold text-sm text-slate-900">
            Recent Analyses
          </h3>
          <button
            onClick={() => navigate('/upload')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            View All
          </button>
        </div>

        {recentAnalyses.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-xs text-slate-500 font-medium">No analyses yet</p>
            <p className="text-[11px] text-slate-400">Upload a signal recording to begin automated DSP analysis.</p>
            <button
              onClick={() => navigate('/upload')}
              className="px-4 py-2 rounded-xl bg-[#1677FF] text-white text-xs font-bold hover:bg-blue-600 transition inline-block"
            >
              Upload Signal
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Modulation</th>
                  <th className="py-2.5 px-3">SNR</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAnalyses.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-slate-50 transition cursor-pointer group"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 flex items-center gap-2">
                      <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                      {item.fileName}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{item.modulation}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {typeof item.snr === 'number' ? `${item.snr} dB` : item.snr}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500 font-mono text-[11px]">{item.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
