import React from 'react';
import { useSignal } from '../context/SignalContext';
import Plot from 'react-plotly.js';
import { Activity, Zap, Cpu, Search } from 'lucide-react';

export const SpectrumAnalysis = () => {
  const { analysisResult } = useSignal();
  const spec = analysisResult?.spectrum || { freqs: [], psd_db: [], peak_frequency: 0, peak_power: 0, occupied_bandwidth: 0 };
  const params = analysisResult?.parameters || {};

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="font-orbitron text-2xl font-bold text-cyan-300 flex items-center gap-3">
          <Activity className="w-6 h-6 text-cyan-400" />
          MODULE 4: FAST FOURIER TRANSFORM (FFT) & PSD SPECTRUM
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Interactive frequency domain analysis, power spectral density (PSD), peak markers, and occupied bandwidth.
        </p>
      </div>

      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="cyber-card p-4 flex items-center justify-between border-l-4 border-l-cyan-500">
          <div>
            <p className="text-xs text-slate-400 font-mono">PEAK FREQUENCY MARKER</p>
            <p className="font-mono text-xl font-bold text-cyan-300">{spec.peak_frequency} Hz</p>
          </div>
          <Zap className="w-6 h-6 text-cyan-400" />
        </div>

        <div className="cyber-card p-4 flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-xs text-slate-400 font-mono">PEAK POWER DENSITY</p>
            <p className="font-mono text-xl font-bold text-blue-300">{spec.peak_power} dB</p>
          </div>
          <Activity className="w-6 h-6 text-blue-400" />
        </div>

        <div className="cyber-card p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-xs text-slate-400 font-mono">OCCUPIED BANDWIDTH (99%)</p>
            <p className="font-mono text-xl font-bold text-emerald-300">{spec.occupied_bandwidth} Hz</p>
          </div>
          <Cpu className="w-6 h-6 text-emerald-400" />
        </div>
      </div>

      {/* Plotly Interactive Spectrum Graph */}
      <div className="cyber-card p-6 space-y-4">
        <div className="flex justify-between items-center text-xs font-orbitron text-cyan-300 border-b border-slate-800 pb-2">
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4 text-cyan-400" />
            POWER SPECTRAL DENSITY GRAPH (dBFS vs Frequency)
          </span>
          <span className="text-[11px] font-mono text-slate-400">Zoom / Pan / Hover Cursor Enabled</span>
        </div>

        <div className="h-[450px] w-full">
          <Plot
            data={[
              {
                x: spec.freqs || [],
                y: spec.psd_db || [],
                type: 'scatter',
                mode: 'lines',
                name: 'PSD (dB)',
                fill: 'tozeroy',
                fillcolor: 'rgba(34, 211, 238, 0.12)',
                line: { color: '#22D3EE', width: 1.5 }
              },
              {
                x: [spec.peak_frequency],
                y: [spec.peak_power],
                type: 'scatter',
                mode: 'markers+text',
                name: 'Peak Marker',
                text: [`Peak: ${spec.peak_frequency} Hz`],
                textposition: 'top center',
                marker: { color: '#EF4444', size: 10, symbol: 'cross' }
              }
            ]}
            layout={{
              autosize: true,
              margin: { l: 50, r: 20, t: 30, b: 50 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              hovermode: 'closest',
              legend: { font: { color: '#94A3B8' } },
              xaxis: {
                color: '#64748B',
                title: 'Frequency (Hz)',
                showgrid: true,
                gridcolor: 'rgba(51,65,85,0.3)'
              },
              yaxis: {
                color: '#64748B',
                title: 'Power Spectral Density (dB)',
                showgrid: true,
                gridcolor: 'rgba(51,65,85,0.3)'
              }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};
