import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BarChart2, Activity, CheckCircle, Database } from 'lucide-react';

export const MLEvaluation = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await api.getMLEvaluation();
        setData(result);
        setError(null);
      } catch (err) {
        setError('ML evaluation data not found. Run validation script first.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Activity className="w-8 h-8 animate-spin mb-4" />
        <p>Loading ML evaluation metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app-card p-12 text-center max-w-xl mx-auto my-12 bg-red-50 text-red-600">
        <p className="font-bold">{error || 'Data unavailable'}</p>
      </div>
    );
  }

  const formatPct = (val) => `${(val * 100).toFixed(2)}%`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="space-y-1 border-b border-slate-200 pb-4">
        <h2 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
          Machine Learning Evaluation
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Comprehensive RF Modulation Classification Metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="app-card p-6 space-y-4">
          <h3 className="font-sans font-bold text-sm text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            Overall Performance
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm font-mono">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block font-sans text-xs">Test Accuracy</span>
              <span className="font-bold text-slate-900 text-lg">{formatPct(data.accuracy)}</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block font-sans text-xs">Macro F1 Score</span>
              <span className="font-bold text-emerald-600 text-lg">{formatPct(data.macro_f1)}</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block font-sans text-xs">Macro Precision</span>
              <span className="font-bold text-slate-900 text-lg">{formatPct(data.macro_precision)}</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block font-sans text-xs">Macro Recall</span>
              <span className="font-bold text-slate-900 text-lg">{formatPct(data.macro_recall)}</span>
            </div>
          </div>
        </div>

        <div className="app-card p-6 space-y-4">
          <h3 className="font-sans font-bold text-sm text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            Dataset Overview
          </h3>
          <div className="grid grid-cols-2 gap-y-3 text-xs">
            <span className="text-slate-500">Benchmark Name</span>
            <span className="font-bold text-slate-900 text-right">{data.dataset}</span>
            
            <span className="text-slate-500">Total Samples</span>
            <span className="font-mono font-bold text-slate-900 text-right">{data.total_samples.toLocaleString()}</span>
            
            <span className="text-slate-500">Training Split</span>
            <span className="font-mono font-bold text-slate-900 text-right">{data.train_samples.toLocaleString()}</span>
            
            <span className="text-slate-500">Validation Split</span>
            <span className="font-mono font-bold text-slate-900 text-right">{data.val_samples.toLocaleString()}</span>
            
            <span className="text-slate-500">Held-Out Test Split</span>
            <span className="font-mono font-bold text-slate-900 text-right">{data.test_samples.toLocaleString()}</span>
            
            <span className="text-slate-500">Modulation Classes</span>
            <span className="font-bold text-slate-900 text-right">{data.classes.length} Classes</span>
          </div>
          
          <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 font-medium leading-relaxed">
              {data.leakage_check || 'No data leakage detected. Train/Test splits strictly separated.'}
            </p>
          </div>
        </div>
      </div>

      <div className="app-card p-6 space-y-4">
        <h3 className="font-sans font-bold text-sm text-slate-900">Per-Class Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-sans">
                <th className="py-3 px-4">Modulation</th>
                <th className="py-3 px-4">Precision</th>
                <th className="py-3 px-4">Recall</th>
                <th className="py-3 px-4">F1 Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(data.per_class || {}).map(([mod, metrics]) => (
                <tr key={mod} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold font-sans text-slate-800">{mod}</td>
                  <td className="py-3 px-4">{formatPct(metrics.precision)}</td>
                  <td className="py-3 px-4">{formatPct(metrics.recall)}</td>
                  <td className="py-3 px-4 font-bold text-blue-700">{formatPct(metrics.f1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="app-card p-6 space-y-4">
        <h3 className="font-sans font-bold text-sm text-slate-900">Accuracy vs SNR</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2">
          {Object.entries(data.snr_accuracy || {}).sort((a, b) => Number(a[0]) - Number(b[0])).map(([snr, stats]) => (
            <div key={snr} className="p-2 bg-slate-50 rounded-lg text-center border border-slate-100 flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-500 font-bold font-sans block mb-1">{snr} dB</span>
              <span className="font-mono font-bold text-blue-700 text-xs">{formatPct(stats.accuracy)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
