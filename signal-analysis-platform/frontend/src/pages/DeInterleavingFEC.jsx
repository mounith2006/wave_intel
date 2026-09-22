import React, { useState } from 'react';
import { useSignal } from '../context/SignalContext';
import { api } from '../services/api';
import { Shuffle, Cpu, CheckCircle, RefreshCw, BarChart } from 'lucide-react';

export const DeInterleavingFEC = () => {
  const { analysisResult, activeFileName } = useSignal();
  const [activeTab, setActiveTab] = useState('deinterleave');

  // De-interleave state
  const [deintMethod, setDeintMethod] = useState('Block');
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(16);
  const [depth, setDepth] = useState(4);
  const [seed, setSeed] = useState(42);
  const [deintRes, setDeintRes] = useState(null);

  // FEC state
  const [fecScheme, setFecScheme] = useState('Convolutional + Viterbi');
  const [fecRes, setFecRes] = useState(null);

  const initialBits = analysisResult?.demodulation?.bits || '110100101011001101010101110001';
  const deint = deintRes || analysisResult?.deinterleaving || { shuffled_bits: initialBits, restored_bits: initialBits, bit_mapping: [] };
  const fec = fecRes || analysisResult?.fec || { ber_before: 0.045, ber_after: 0.000, corrected_bits: 12, remaining_errors: 0, decoded_bits: initialBits };

  const handleRunDeinterleave = async () => {
    try {
      const res = await api.runDeinterleave(activeFileName, {
        bit_string: initialBits,
        method: deintMethod,
        rows,
        cols,
        depth,
        seed
      });
      setDeintRes(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunFEC = async () => {
    try {
      const res = await api.runFEC(activeFileName, {
        bit_string: deint.restored_bits || initialBits,
        fec_scheme: fecScheme
      });
      setFecRes(res);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-orbitron text-2xl font-bold text-cyan-300 flex items-center gap-3">
            <Shuffle className="w-6 h-6 text-indigo-400" />
            MODULE 8: DE-INTERLEAVING & FORWARD ERROR CORRECTION (FEC)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Reorder interleaved bit sequences and decode Viterbi / Reed-Solomon / LDPC FEC blocks.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('deinterleave')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'deinterleave' ? 'bg-cyan-500 text-slate-950 shadow-glowCyan font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. De-Interleaving
          </button>
          <button
            onClick={() => setActiveTab('fec')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'fec' ? 'bg-cyan-500 text-slate-950 shadow-glowCyan font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2. FEC Decoding
          </button>
        </div>
      </div>

      {activeTab === 'deinterleave' ? (
        <div className="space-y-6">
          {/* Controls */}
          <div className="cyber-card p-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">DE-INTERLEAVE METHOD:</label>
              <select
                value={deintMethod}
                onChange={(e) => setDeintMethod(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs rounded-xl p-2.5"
              >
                <option value="Block">Block De-interleaver</option>
                <option value="Convolutional">Convolutional De-interleaver</option>
                <option value="Diagonal">Diagonal De-interleaver</option>
                <option value="Pseudo Random">Pseudo-Random PRNG</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">ROWS / DEPTH:</label>
              <input
                type="number"
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">COLS / WIDTH:</label>
              <input
                type="number"
                value={cols}
                onChange={(e) => setCols(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">PRNG SEED:</label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs rounded-xl p-2.5"
              />
            </div>

            <button
              onClick={handleRunDeinterleave}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glowCyan transition flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              RUN DE-INTERLEAVE
            </button>
          </div>

          {/* Shuffled vs Restored Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="cyber-card p-6 space-y-2 border-l-4 border-l-amber-500">
              <h3 className="font-orbitron text-xs font-semibold text-amber-300">INTERLEAVED (SHUFFLED) INPUT BITS</h3>
              <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-amber-400 break-all max-h-40 overflow-y-auto leading-relaxed border border-slate-800">
                {deint.shuffled_bits}
              </div>
            </div>

            <div className="cyber-card p-6 space-y-2 border-l-4 border-l-emerald-500">
              <h3 className="font-orbitron text-xs font-semibold text-emerald-300">RESTORED (DE-INTERLEAVED) BITS</h3>
              <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-emerald-400 break-all max-h-40 overflow-y-auto leading-relaxed border border-slate-800">
                {deint.restored_bits}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* FEC Controls */}
          <div className="cyber-card p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="w-full md:w-1/2 space-y-1">
              <label className="text-xs text-slate-400 font-semibold block">FEC DECODING ARCHITECTURE:</label>
              <select
                value={fecScheme}
                onChange={(e) => setFecScheme(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs rounded-xl p-2.5"
              >
                <option value="Convolutional + Viterbi">Convolutional + Soft Viterbi (Rate 1/2, K=7)</option>
                <option value="Reed Solomon">Reed Solomon RS(255, 223)</option>
                <option value="LDPC">LDPC Parity Check Matrix (Simulation)</option>
                <option value="Concatenated">Concatenated RS + Convolutional</option>
              </select>
            </div>

            <button
              onClick={handleRunFEC}
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glowCyan transition flex items-center justify-center gap-2"
            >
              <Cpu className="w-4 h-4" />
              EXECUTE FEC DECODING
            </button>
          </div>

          {/* FEC Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="cyber-card p-4 space-y-1 border-l-4 border-l-red-500">
              <span className="text-xs text-slate-400 font-mono">BER BEFORE DECODING</span>
              <p className="font-mono text-xl font-bold text-red-400">{fec.ber_before}</p>
            </div>
            <div className="cyber-card p-4 space-y-1 border-l-4 border-l-emerald-500">
              <span className="text-xs text-slate-400 font-mono">BER AFTER DECODING</span>
              <p className="font-mono text-xl font-bold text-emerald-400">{fec.ber_after}</p>
            </div>
            <div className="cyber-card p-4 space-y-1 border-l-4 border-l-cyan-500">
              <span className="text-xs text-slate-400 font-mono">CORRECTED BITS</span>
              <p className="font-mono text-xl font-bold text-cyan-300">{fec.corrected_bits} Bits</p>
            </div>
            <div className="cyber-card p-4 space-y-1 border-l-4 border-l-indigo-500">
              <span className="text-xs text-slate-400 font-mono">REMAINING ERRORS</span>
              <p className="font-mono text-xl font-bold text-indigo-300">{fec.remaining_errors}</p>
            </div>
          </div>

          {/* Decoded Bitstream Output */}
          <div className="cyber-card p-6 space-y-3">
            <h3 className="font-orbitron text-xs font-semibold text-cyan-300">FEC DECODED PAYLOAD BITSTREAM</h3>
            <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-emerald-400 break-all max-h-44 overflow-y-auto border border-slate-800">
              {fec.decoded_bits}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
