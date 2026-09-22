import React, { useState } from 'react';
import { useSignal } from '../context/SignalContext';
import { api } from '../services/api';
import Plot from 'react-plotly.js';
import { Binary, Play, Download, Cpu, CheckCircle } from 'lucide-react';

export const Demodulation = () => {
  const { analysisResult, activeFileName, sampleRate } = useSignal();
  const [selectedMod, setSelectedMod] = useState('QPSK');
  const [demodData, setDemodData] = useState(null);
  const [loading, setLoading] = useState(false);

  const initialDemod = demodData || analysisResult?.demodulation || {
    demodulated_waveform: [],
    symbols: [],
    bits: '',
    num_symbols: 0,
    num_bits: 0,
    estimated_ber: 0.001
  };

  const handleRunDemod = async () => {
    setLoading(true);
    try {
      const res = await api.runDemodulation(activeFileName, selectedMod, sampleRate);
      setDemodData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadBitstream = () => {
    const blob = new Blob([initialDemod.bits], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeFileName}_bitstream.txt`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-orbitron text-2xl font-bold text-cyan-300 flex items-center gap-3">
            <Binary className="w-6 h-6 text-cyan-400" />
            MODULE 7: BASEBAND SIGNAL DEMODULATION
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Demodulate BPSK, QPSK, 2FSK, 4FSK, and 16-QAM into recovered symbol sequences and raw bitstreams.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedMod}
            onChange={(e) => setSelectedMod(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs rounded-xl px-4 py-2 focus:outline-none"
          >
            <option value="BPSK">BPSK Demodulator</option>
            <option value="QPSK">QPSK Demodulator</option>
            <option value="2FSK">2FSK Demodulator</option>
            <option value="4FSK">4FSK Demodulator</option>
            <option value="16QAM">16-QAM Demodulator</option>
          </select>

          <button
            onClick={handleRunDemod}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glowCyan transition flex items-center gap-1.5"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            {loading ? 'DEMODULATING...' : 'RUN DEMODULATION'}
          </button>

          <button
            onClick={downloadBitstream}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            Export Bitstream
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="cyber-card p-4 space-y-1 border-l-4 border-l-cyan-500">
          <span className="text-xs text-slate-400 font-mono">RECOVERED SYMBOLS</span>
          <p className="font-mono text-xl font-bold text-cyan-300">{initialDemod.num_symbols}</p>
        </div>
        <div className="cyber-card p-4 space-y-1 border-l-4 border-l-blue-500">
          <span className="text-xs text-slate-400 font-mono">RECOVERED BITS</span>
          <p className="font-mono text-xl font-bold text-blue-300">{initialDemod.num_bits}</p>
        </div>
        <div className="cyber-card p-4 space-y-1 border-l-4 border-l-emerald-500">
          <span className="text-xs text-slate-400 font-mono">ESTIMATED BER</span>
          <p className="font-mono text-xl font-bold text-emerald-300">{initialDemod.estimated_ber}</p>
        </div>
        <div className="cyber-card p-4 space-y-1 border-l-4 border-l-purple-500">
          <span className="text-xs text-slate-400 font-mono">TARGET MOD SCHEME</span>
          <p className="font-mono text-xl font-bold text-purple-300">{selectedMod}</p>
        </div>
      </div>

      {/* Demodulated Baseband Waveform Plot */}
      <div className="cyber-card p-6 space-y-4">
        <h3 className="font-orbitron text-sm font-semibold text-cyan-300">
          DEMODULATED BASEBAND SYMBOL WAVEFORM
        </h3>
        <div className="h-64 w-full">
          <Plot
            data={[
              {
                y: initialDemod.demodulated_waveform || [],
                type: 'scatter',
                mode: 'lines',
                line: { color: '#3B82F6', width: 1.5 }
              }
            ]}
            layout={{
              autosize: true,
              margin: { l: 40, r: 20, t: 20, b: 40 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              xaxis: { color: '#64748B', title: 'Symbol Index', showgrid: true, gridcolor: 'rgba(51,65,85,0.3)' },
              yaxis: { color: '#64748B', title: 'Baseband Level', showgrid: true, gridcolor: 'rgba(51,65,85,0.3)' }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>

      {/* Bit Stream Preview Box */}
      <div className="cyber-card p-6 space-y-3">
        <h3 className="font-orbitron text-sm font-semibold text-cyan-300 flex items-center justify-between">
          <span>RECOVERED RAW BITSTREAM PREVIEW</span>
          <span className="text-xs font-mono text-slate-400">Total: {initialDemod.num_bits} bits</span>
        </h3>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 break-all max-h-48 overflow-y-auto leading-relaxed">
          {initialDemod.bits || 'No bits recovered yet.'}
        </div>
      </div>
    </div>
  );
};
