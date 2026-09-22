import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSignal } from '../context/SignalContext';
import { Search, User, Database, CheckCircle2, ChevronRight } from 'lucide-react';

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeFileName, activeAnalysisId, analysisResult } = useSignal();

  const workflowSteps = [
    { path: '/upload', label: 'Upload' },
    { path: '/analyze', label: 'Analyze' },
    { path: '/decode', label: 'Decode' },
    { path: '/bitstream', label: 'Bit Stream' },
    { path: '/reports', label: 'Reports' },
  ];

  const getStepIndex = (path) => {
    switch (path) {
      case '/upload': return 0;
      case '/analyze': return 1;
      case '/decode': return 2;
      case '/bitstream': return 3;
      case '/reports': return 4;
      default: return -1;
    }
  };

  const currentStepIdx = getStepIndex(location.pathname);
  const meta = analysisResult?.metadata || {};

  return (
    <header className="w-full bg-white border-b border-slate-200 px-6 py-2.5 text-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-sm select-none">
      {/* Search Input Box (matching Reference UI top right) */}
      <div className="flex items-center gap-4">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search analyses..."
            className="w-full bg-slate-100 text-xs text-slate-700 pl-9 pr-4 py-1.5 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-200"
          />
        </div>

        {/* Workflow Breadcrumb Indicator */}
        {currentStepIdx >= 0 && (
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
            {workflowSteps.map((step, idx) => {
              const isDone = currentStepIdx > idx;
              const isCurrent = currentStepIdx === idx;
              return (
                <React.Fragment key={step.path}>
                  <span
                    onClick={() => navigate(step.path)}
                    className={`cursor-pointer hover:underline ${
                      isCurrent
                        ? 'text-blue-600 font-bold'
                        : isDone
                        ? 'text-slate-700 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label} {isDone ? '✓' : ''}
                  </span>
                  {idx < workflowSteps.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Header Status Controls */}
      <div className="flex items-center gap-3 text-xs">
        {/* Active Signal Badge */}
        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-slate-500 font-medium">ACTIVE:</span>
          <span className="font-mono font-bold text-slate-800">
            {meta.file_name || activeFileName || 'No signal active'}
          </span>
        </div>

        {/* Engine Status */}
        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold text-[11px]">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          ONLINE
        </div>

        {/* Analysis ID Badge matching top right of screens 3,4,5,6 */}
        <div className="bg-slate-100 text-slate-700 font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200">
          Analysis ID: {activeAnalysisId || 'N/A'}
        </div>

        {/* User Profile Avatar */}
        <button className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition">
          <User className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
