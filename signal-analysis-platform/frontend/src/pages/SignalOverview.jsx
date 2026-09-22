import React from 'react';
import { useSignal } from '../context/SignalContext';
import Plot from 'react-plotly.js';
import { Info, Activity, Database, Cpu, Zap, Clock, ShieldAlert } from 'lucide-react';

export const SignalOverview = () => {
  const { analysisResult } = useSignal();

  const meta = analysisResult?.metadata || {};
  const params = analysisResult?.parameters || {};
  const cls = analysisResult?.classification || {};
  const wf = analysisResult?.waveform || { time: [], real: [], imag: [] };

  const cards = [
    { label: 'SAMPLING FREQUENCY', val: `${meta.sample_rate || 48000} Hz`, icon: Activity, color: 'text-cyan-400', border: 'border-l-cyan-500' },
    { label: 'CENTER FREQUENCY', val: `${params.center_frequency || 0} Hz`, icon: Cpu, color: 'text-blue-400', border: 'border-l-blue-500' },
    { label: 'OCCUPIED BANDWIDTH', val: `${params.occupied_bandwidth || 0} Hz`, icon: Zap, color: 'text-purple-400', border: 'border-l-purple-500' },
    { label: 'SIGNAL DURATION', val: `${meta.duration || 0.0} s`, icon: Clock, color: 'text-emerald-400', border: 'border-l-emerald-500' },
    { label: 'SIGNAL POWER', val: `${params.signal_power_db || 0} dB`, icon: Activity, color: 'text-amber-400', border: 'border-l-amber-500' },
    { label: 'NOISE POWER', val: `${params.noise_power_db || 0} dB`, icon: ShieldAlert, color: 'text-red-400', border: 'border-l-red-500' },
    { label: 'SIGNAL-TO-NOISE RATIO', val: `${params.snr_db || 0} dB`, icon: Cpu, color: 'text-cyan-300', border: 'border-l-cyan-400' },
    { label: 'PEAK FREQUENCY', val: `${params.peak_frequency || 0} Hz`, icon: Zap, color: 'text-indigo-400', border: 'border-l-indigo-500' },
    { label: 'FILE FORMAT', val: meta.format || 'Complex IQ', icon: Database, color: 'text-emerald-300', border: 'border-l-emerald-400' }
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="font-orbitron text-2xl font-bold text-cyan-300 flex items-center gap-3">
          <Info className="w-6 h-6 text-cyan-400" />
          MODULE 3: SIGNAL OVERVIEW & PARAMETER BREAKDOWN
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Extracted signal metrics, carrier parameters, power distribution, and time-domain waveform analysis.
        </p>
      </div>

      {/* Grid of 9 Parameter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className={`cyber-card p-4 space-y-1 border-l-4 ${card.border}`}>
              <div className="flex justify-between items-center text-slate-400 text-xs">
                <span>{card.label}</span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className={`font-mono text-lg font-bold ${card.color}`}>{card.val}</p>
            </div>
          );
        })}
      </div>

      {/* Mini Waveform Visualization */}
      <div className="cyber-card p-6 space-y-4">
        <h3 className="font-orbitron text-sm font-semibold text-cyan-300 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          TIME-DOMAIN SIGNAL WAVEFORM
        </h3>

        <div className="h-80 w-full">
          <Plot
            data={[
              {
                x: wf.time || [],
                y: wf.real || [],
                type: 'scatter',
                mode: 'lines',
                name: 'In-Phase (Real)',
                line: { color: '#22D3EE', width: 1.5 }
              },
              meta.is_complex
                ? {
                    x: wf.time || [],
                    y: wf.imag || [],
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Quadrature (Imag)',
                    line: { color: '#3B82F6', width: 1.5, dash: 'dot' }
                  }
                : null
            ].filter(Boolean)}
            layout={{
              autosize: true,
              margin: { l: 50, r: 20, t: 20, b: 40 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              legend: { font: { color: '#94A3B8' } },
              xaxis: { color: '#64748B', title: 'Sample Index', showgrid: true, gridcolor: 'rgba(51,65,85,0.3)' },
              yaxis: { color: '#64748B', title: 'Amplitude', showgrid: true, gridcolor: 'rgba(51,65,85,0.3)' }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};
