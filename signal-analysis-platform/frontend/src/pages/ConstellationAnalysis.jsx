import React, { useState } from 'react';
import { useSignal } from '../context/SignalContext';
import Plot from 'react-plotly.js';
import { Grid, Zap, Cpu, Target, Eye } from 'lucide-react';

export const ConstellationAnalysis = () => {
  const { analysisResult } = useSignal();
  const [showClusters, setShowClusters] = useState(true);
  const constData = analysisResult?.constellation || { i: [], q: [], clusters: [], evm_percent: 0.0 };
  const cls = analysisResult?.classification || {};

  const clusterPoints = constData.clusters || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-orbitron text-2xl font-bold text-cyan-300 flex items-center gap-3">
            <Grid className="w-6 h-6 text-emerald-400" />
            MODULE 6: IN-PHASE & QUADRATURE (IQ) CONSTELLATION
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Polar IQ scatter plot, symbol cluster centroid estimation, and Error Vector Magnitude (EVM).
          </p>
        </div>

        {/* Cluster Centroids Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowClusters(!showClusters)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
              showClusters
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 glow-border-cyan'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Eye className="w-4 h-4" />
            {showClusters ? 'Cluster Centroids ON' : 'Show Centroids'}
          </button>
        </div>
      </div>

      {/* Top EVM Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="cyber-card p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-xs text-slate-400 font-mono">DETECTED CONSTELLATION</p>
            <p className="font-mono text-xl font-bold text-emerald-300">{cls.modulation || 'QPSK'}</p>
          </div>
          <Zap className="w-6 h-6 text-emerald-400" />
        </div>

        <div className="cyber-card p-4 flex items-center justify-between border-l-4 border-l-cyan-500">
          <div>
            <p className="text-xs text-slate-400 font-mono">ESTIMATED EVM</p>
            <p className="font-mono text-xl font-bold text-cyan-300">{constData.evm_percent}%</p>
          </div>
          <Target className="w-6 h-6 text-cyan-400" />
        </div>

        <div className="cyber-card p-4 flex items-center justify-between border-l-4 border-l-purple-500">
          <div>
            <p className="text-xs text-slate-400 font-mono">SCATTER SYMBOL COUNT</p>
            <p className="font-mono text-xl font-bold text-purple-300">{constData.i.length} Points</p>
          </div>
          <Cpu className="w-6 h-6 text-purple-400" />
        </div>
      </div>

      {/* Plotly IQ Scatter Plot */}
      <div className="cyber-card p-6 space-y-4">
        <div className="flex justify-between items-center text-xs font-orbitron text-cyan-300 border-b border-slate-800 pb-2">
          <span>IQ CONSTELLATION POLAR DIAGRAM</span>
          <span className="text-[11px] font-mono text-slate-400">Axes: X=In-Phase (I), Y=Quadrature (Q)</span>
        </div>

        <div className="h-[480px] w-full">
          <Plot
            data={[
              {
                x: constData.i || [],
                y: constData.q || [],
                type: 'scatter',
                mode: 'markers',
                name: 'IQ Samples',
                marker: { color: '#22C55E', size: 4, opacity: 0.6 }
              },
              showClusters && clusterPoints.length > 0
                ? {
                    x: clusterPoints.map(c => c.i),
                    y: clusterPoints.map(c => c.q),
                    type: 'scatter',
                    mode: 'markers',
                    name: 'Cluster Centroids',
                    marker: { color: '#EF4444', size: 12, symbol: 'diamond' }
                  }
                : null
            ].filter(Boolean)}
            layout={{
              autosize: true,
              margin: { l: 50, r: 20, t: 30, b: 50 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              xaxis: {
                color: '#64748B',
                title: 'In-Phase Component (I)',
                showgrid: true,
                gridcolor: 'rgba(51,65,85,0.3)',
                zerolinecolor: 'rgba(34,211,238,0.4)'
              },
              yaxis: {
                color: '#64748B',
                title: 'Quadrature Component (Q)',
                showgrid: true,
                gridcolor: 'rgba(51,65,85,0.3)',
                zerolinecolor: 'rgba(34,211,238,0.4)'
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
