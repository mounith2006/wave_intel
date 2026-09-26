import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FileCheck, Activity, CheckCircle, AlertTriangle } from 'lucide-react';

export const ParameterValidation = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await api.getParamEvaluation();
        setData(result);
        setError(null);
      } catch (err) {
        setError('Parameter evaluation data not found. Run validation script first.');
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
        <p>Loading parameter validation metrics...</p>
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="space-y-1 border-b border-slate-200 pb-4">
        <h2 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
          Parameter Validation
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Synthetic Ground-Truth Validation for DSP Extraction
        </p>
      </div>
      
      <div className="app-card p-6 bg-slate-50 border border-slate-200">
        <p className="text-sm text-slate-600 leading-relaxed">
          The following metrics represent the physical parameter extraction accuracy against mathematically known synthetic ground truths. 
          Parameters such as <strong className="text-slate-800">Occupied Bandwidth</strong> are definitionally ambiguous for certain modulations and have therefore been correctly flagged as unmeasurable to prevent fabricated statistics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(data).map(([key, metrics]) => {
          const title = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const isUnavailable = metrics.ground_truth === 'Unavailable';
          
          return (
            <div key={key} className="app-card p-5 space-y-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <h3 className="font-sans font-bold text-sm text-slate-900">{title}</h3>
                {isUnavailable ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              
              {isUnavailable ? (
                <div className="flex-1 flex items-center justify-center bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <p className="text-[11px] text-amber-800 font-semibold text-center">
                    Ground truth unavailable — accuracy not measurable.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 flex-1 text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-sans text-xs">Samples</span>
                    <span className="font-mono font-bold text-slate-900">{metrics.samples}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-sans text-xs">MAE</span>
                    <span className="font-mono font-bold text-slate-900">{metrics.mae}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-sans text-xs">RMSE</span>
                    <span className="font-mono font-bold text-slate-900">{metrics.rmse}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-sans text-xs">Mean % Error</span>
                    <span className="font-mono font-bold text-blue-700">{metrics.mean_pct_error}%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
