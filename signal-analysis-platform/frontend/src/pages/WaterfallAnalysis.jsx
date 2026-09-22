import React, { useState } from 'react';
import { useSignal } from '../context/SignalContext';
import Plot from 'react-plotly.js';
import { Layers, Download, Pause, Play, RefreshCw } from 'lucide-react';

export const WaterfallAnalysis = () => {
  const { analysisResult } = useSignal();
  const [colorScale, setColorScale] = useState('Viridis');
  const [isPaused, setIsPaused] = useState(false);
  const waterfall = analysisResult?.waterfall || { z_matrix: [], time_stamps: [], freqs: [] };

  const colorScales = ['Viridis', 'Plasma', 'Inferno', 'Jet', 'Cividis'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-orbitron text-2xl font-bold text-cyan-300 flex items-center gap-3">
            <Layers className="w-6 h-6 text-purple-400" />
            MODULE 5: WATERFALL SPECTROGRAM ANALYSIS
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Short-Time Fourier Transform (STFT) 2D time-frequency power intensity mapping.
          </p>
        </div>

        {/* Heatmap Controls */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-semibold">COLORSCALE:</label>
          <select
            value={colorScale}
            onChange={(e) => setColorScale(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs rounded-xl px-3 py-1.5 focus:outline-none"
          >
            {colorScales.map(cs => <option key={cs} value={cs}>{cs}</option>)}
          </select>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      {/* Plotly Interactive Heatmap */}
      <div className="cyber-card p-6 space-y-4">
        <div className="flex justify-between items-center text-xs font-orbitron text-cyan-300 border-b border-slate-800 pb-2">
          <span>TIME vs FREQUENCY INTENSITY HEATMAP</span>
          <span className="text-[11px] font-mono text-slate-400">Axes: X=Freq (Hz), Y=Time (s)</span>
        </div>

        <div className="h-[500px] w-full">
          <Plot
            data={[
              {
                z: waterfall.z_matrix || [[0]],
                x: waterfall.freqs || [],
                y: waterfall.time_stamps || [],
                type: 'heatmap',
                colorscale: colorScale,
                colorbar: {
                  title: 'Power (dB)',
                  tickfont: { color: '#94A3B8' },
                  titlefont: { color: '#22D3EE' }
                }
              }
            ]}
            layout={{
              autosize: true,
              margin: { l: 50, r: 20, t: 20, b: 50 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              xaxis: { color: '#64748B', title: 'Frequency (Hz)', showgrid: true, gridcolor: 'rgba(51,65,85,0.3)' },
              yaxis: { color: '#64748B', title: 'Time (Seconds)', showgrid: true, gridcolor: 'rgba(51,65,85,0.3)' }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};
