import React from 'react';
import { useSignal } from '../context/SignalContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Loader2, ArrowRight } from 'lucide-react';

export const ProcessingOverlay = () => {
  const {
    isProcessing,
    progressData,
    analysisStatus,
    analysisResult,
    activeAnalysisId,
    dismissProgressOverlay
  } = useSignal();
  const navigate = useNavigate();

  if (!isProcessing && progressData.percentage !== 100) return null;

  const steps = [
    { label: 'Signal loaded', targetPct: 0 },
    { label: 'Preprocessing', targetPct: 15 },
    { label: 'Feature extraction', targetPct: 30 },
    { label: 'Signal analysis', targetPct: 45 },
    { label: 'Modulation detection', targetPct: 60 },
    { label: 'Visualization generation', targetPct: 90 },
  ];

  const handleViewResults = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log("[WaveIntel] View Results clicked");

    if (analysisStatus !== 'completed' && !analysisResult) {
      console.error("[WaveIntel] View Results failed: analysisStatus is not completed");
      return;
    }

    if (!analysisResult || !activeAnalysisId) {
      console.error("[WaveIntel] View Results failed: activeAnalysisId or analysisResult is missing");
      return;
    }

    if (dismissProgressOverlay) {
      dismissProgressOverlay();
    }

    navigate('/analyze');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h3 className="font-sans font-bold text-xl text-slate-900">
            SIGNAL ANALYSIS
          </h3>
          <p className="text-xs text-slate-500">
            {progressData.percentage < 100
              ? 'Analyzing signal parameters and spectral components...'
              : 'Analysis complete! Results ready.'}
          </p>
        </div>

        {/* Step Checklist */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          {steps.map((step, idx) => {
            const isDone = progressData.percentage > step.targetPct;
            const isCurrent = progressData.percentage === step.targetPct && isProcessing;

            return (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className={`flex items-center gap-2 font-medium ${
                  isDone ? 'text-slate-800' : isCurrent ? 'text-blue-600 font-semibold' : 'text-slate-400'
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300" />
                  )}
                  {step.label}
                </span>

                <span className="text-[11px] font-mono text-slate-400">
                  {isDone ? 'Done' : isCurrent ? 'Processing...' : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>Progress</span>
            <span className="text-blue-600 font-mono font-bold">{progressData.percentage}%</span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-blue-600 transition-all duration-300 rounded-full"
              style={{ width: `${progressData.percentage}%` }}
            />
          </div>
        </div>

        {/* Action Button at 100% */}
        {progressData.percentage === 100 && (
          <button
            onClick={handleViewResults}
            className="w-full py-3 rounded-xl bg-[#1677FF] hover:bg-blue-600 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer relative z-10"
          >
            VIEW RESULTS
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

