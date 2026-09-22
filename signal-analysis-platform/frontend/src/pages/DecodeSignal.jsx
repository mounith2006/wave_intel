import React, { useState } from 'react';
import { useSignal } from '../context/SignalContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle2, ArrowRight, Info } from 'lucide-react';

export const DecodeSignal = () => {
  const { analysisResult, activeFileName, sampleRate, activeAnalysisId, decodeResult, setDecodeResult, setAnalysisResult } = useSignal();
  const navigate = useNavigate();

  // Step 1 Demod state
  const [selectedMod, setSelectedMod] = useState('Auto Detect');
  const [demodRes, setDemodRes] = useState(null);
  const [demodDone, setDemodDone] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Step 2 Deinterleave state
  const [deintMethod, setDeintMethod] = useState('Auto Detect');
  const [deintRadio, setDeintRadio] = useState('Block');
  const [deintDone, setDeintDone] = useState(true);

  // Step 3 FEC state
  const [fecMethod, setFecMethod] = useState('Auto Detect');
  const [fecRadio, setFecRadio] = useState('Reed-Solomon');
  const [fecDone, setFecDone] = useState(true);

  const currentDemod = demodRes || decodeResult || analysisResult?.demodulation || {
    symbols: [],
    bits: '',
    num_symbols: 0,
    num_bits: 0,
    estimated_ber: 'Not available'
  };

  const handleRunDemod = async () => {
    setApiError(null);
    console.log('[WaveIntel] Decode requested', { activeFileName, activeAnalysisId, selectedMod });
    try {
      const targetMod = selectedMod === 'Auto Detect' ? (analysisResult?.classification?.modulation || 'QPSK') : selectedMod;
      const res = await api.runDemodulation(activeFileName, targetMod, sampleRate);
      console.log('[WaveIntel] Decode response received', res);
      setDemodRes(res);
      setDecodeResult(res);
      if (analysisResult) {
        setAnalysisResult({ ...analysisResult, demodulation: res });
      }
      setDemodDone(true);
    } catch (err) {
      console.error('[WaveIntel] Decode error:', err);
      setApiError(err.response?.data?.error || err.message || 'Failed to run demodulation');
    }
  };

  const handleRunDeinterleave = async () => {
    setApiError(null);
    console.log('[WaveIntel] Deinterleave requested', { deintRadio });
    try {
      const res = await api.runDeinterleave(activeFileName, {
        bit_string: currentDemod.bits,
        method: deintRadio
      });
      console.log('[WaveIntel] Deinterleave response received', res);
      setDeintDone(true);
    } catch (err) {
      console.error('[WaveIntel] Deinterleave error:', err);
      setApiError(err.response?.data?.error || err.message || 'Failed to deinterleave bitstream');
    }
  };

  const handleRunFEC = async () => {
    setApiError(null);
    console.log('[WaveIntel] FEC requested', { fecRadio });
    try {
      const res = await api.runFEC(activeFileName, {
        bit_string: currentDemod.bits,
        fec_scheme: fecRadio
      });
      console.log('[WaveIntel] FEC response received', res);
      setFecDone(true);
    } catch (err) {
      console.error('[WaveIntel] FEC error:', err);
      setApiError(err.response?.data?.error || err.message || 'Failed to decode FEC');
    }
  };

  if (!analysisResult) {
    return (
      <div className="app-card p-12 text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="p-4 rounded-full bg-blue-50 text-blue-600 inline-block">
          <Info className="w-8 h-8" />
        </div>
        <h3 className="font-sans font-bold text-lg text-slate-800">
          No decoded signal available.
        </h3>
        <p className="text-xs text-slate-500">
          Complete signal analysis first.
        </p>
        <button
          onClick={() => navigate('/upload')}
          className="px-6 py-2.5 rounded-xl bg-[#1677FF] hover:bg-blue-600 text-white font-bold text-xs shadow-md transition inline-flex items-center gap-2"
        >
          GO TO ANALYSIS
        </button>
      </div>
    );
  }

  const isCw = Boolean(
    analysisResult?.classification?.cw_detected ||
    String(analysisResult?.classification?.modulation || '').toUpperCase().includes('CW')
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header matching Screen 4 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
            Decode Signal
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Demodulation, De-interleaving and FEC Decoding
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-slate-100 text-slate-700 font-mono text-[11px] font-bold px-3 py-1 rounded-lg border border-slate-200">
            Analysis ID: {activeAnalysisId}
          </span>

          <button
            onClick={() => navigate('/bitstream')}
            className="px-6 py-2.5 rounded-xl bg-[#1677FF] hover:bg-blue-600 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
          >
            View Bit Stream
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>Error: {apiError}</span>
          <button onClick={() => setApiError(null)} className="text-red-500 hover:text-red-700 text-sm font-bold">×</button>
        </div>
      )}

      {/* STEP 1: Demodulation Card matching Screen 4 */}
      <div className="app-card p-6 space-y-4">
        <div className="flex items-start gap-3 border-b border-slate-200 pb-3">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
            1
          </div>
          <div>
            <h3 className="font-sans font-bold text-sm text-slate-900">Demodulation</h3>
            <p className="text-xs text-slate-500">Recover symbols and raw bits from the modulated signal</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="space-y-3 md:col-span-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-500 font-medium block">Modulation Method</label>
              <select
                value={isCw ? 'CW' : selectedMod}
                onChange={(e) => setSelectedMod(e.target.value)}
                disabled={isCw}
                className="w-64 bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl p-2.5 focus:border-blue-500 disabled:bg-slate-100"
              >
                <option value="CW">CW / Single Tone</option>
                <option value="Auto Detect">Auto Detect</option>
                <option value="BPSK">BPSK</option>
                <option value="QPSK">QPSK</option>
                <option value="2-FSK">2-FSK</option>
                <option value="4-FSK">4-FSK</option>
                <option value="16-QAM">16-QAM</option>
              </select>
            </div>

            <button
              onClick={handleRunDemod}
              disabled={isCw}
              className={`px-6 py-2 rounded-xl text-white font-bold text-xs shadow-sm transition ${
                isCw ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#1677FF] hover:bg-blue-600'
              }`}
            >
              Demodulate
            </button>
          </div>

          {/* Right Status Box matching Screen 4 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
              <CheckCircle2 className={`w-4 h-4 ${isCw ? 'text-slate-400' : 'text-emerald-600'}`} />
              {isCw
                ? 'Status: Not applicable'
                : selectedMod === 'Auto Detect'
                ? `Detected: ${analysisResult?.classification?.modulation || 'Unknown'}`
                : `Configured: ${selectedMod}`}
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-500 font-sans">Symbols recovered:</span>
              <span className="font-bold text-slate-800">
                {isCw ? 'N/A' : (currentDemod.num_symbols ? currentDemod.num_symbols.toLocaleString() : 'N/A')}
              </span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-500 font-sans">Bits recovered:</span>
              <span className="font-bold text-slate-800">
                {isCw ? 'Not analyzed' : (currentDemod.num_bits ? currentDemod.num_bits.toLocaleString() : 'Not analyzed')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: De-interleaving Card matching Screen 4 */}
      <div className="app-card p-6 space-y-4">
        <div className="flex items-start gap-3 border-b border-slate-200 pb-3">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
            2
          </div>
          <div>
            <h3 className="font-sans font-bold text-sm text-slate-900">De-interleaving</h3>
            <p className="text-xs text-slate-500">Reorder bits using the appropriate de-interleaving method</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="space-y-3 md:col-span-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-500 font-medium block">Method</label>
              <select
                value={isCw ? 'Not applied' : deintMethod}
                onChange={(e) => setDeintMethod(e.target.value)}
                disabled={isCw}
                className="w-64 bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl p-2.5 focus:border-blue-500 disabled:bg-slate-100"
              >
                <option value="Not applied">Not applied</option>
                <option value="Auto Detect">Auto Detect</option>
                <option value="Block">Block</option>
                <option value="Convolutional">Convolutional</option>
                <option value="Diagonal">Diagonal</option>
                <option value="Pseudo-Random">Pseudo-Random</option>
              </select>
            </div>

            {/* Radio Options matching Screen 4 */}
            <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-700">
              {['Block', 'Convolutional', 'Diagonal', 'Pseudo-Random'].map((opt) => (
                <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="deintRadio"
                    value={opt}
                    disabled={isCw}
                    checked={!isCw && deintRadio === opt}
                    onChange={(e) => setDeintRadio(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>

            <button
              onClick={handleRunDeinterleave}
              disabled={isCw}
              className={`px-6 py-2 rounded-xl text-white font-bold text-xs shadow-sm transition ${
                isCw ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#1677FF] hover:bg-blue-600'
              }`}
            >
              De-interleave
            </button>
          </div>

          {/* Right Status Box matching Screen 4 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="text-slate-500">
              Auto Detection: <span className="font-bold text-slate-700">{isCw ? 'Not applied' : 'Unavailable'}</span>
            </div>
            <div className="text-slate-500">
              Configured: <span className="font-bold text-slate-800">{isCw ? 'Not applied' : deintRadio}</span>
            </div>
            {deintDone && (
              <div className="flex items-center gap-1.5 text-slate-600 font-bold pt-1 border-t border-slate-200">
                <CheckCircle2 className={`w-4 h-4 ${isCw ? 'text-slate-400' : 'text-emerald-600'}`} />
                {isCw ? 'De-interleaving: Not applied' : 'De-interleaving completed'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STEP 3: FEC / Error Correction Card matching Screen 4 */}
      <div className="app-card p-6 space-y-4">
        <div className="flex items-start gap-3 border-b border-slate-200 pb-3">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
            3
          </div>
          <div>
            <h3 className="font-sans font-bold text-sm text-slate-900">FEC / Error Correction</h3>
            <p className="text-xs text-slate-500">Decode and correct errors using forward error correction</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="space-y-3 md:col-span-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-500 font-medium block">Method</label>
              <select
                value={isCw ? 'Not applied' : fecMethod}
                onChange={(e) => setFecMethod(e.target.value)}
                disabled={isCw}
                className="w-64 bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl p-2.5 focus:border-blue-500 disabled:bg-slate-100"
              >
                <option value="Not applied">Not applied</option>
                <option value="Auto Detect">Auto Detect</option>
                <option value="Viterbi">Viterbi</option>
                <option value="Reed-Solomon">Reed-Solomon</option>
                <option value="Concatenated">Concatenated</option>
                <option value="LDPC">LDPC</option>
              </select>
            </div>

            {/* Radio Options matching Screen 4 */}
            <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-700">
              {['Viterbi', 'Reed-Solomon', 'Concatenated', 'LDPC'].map((opt) => (
                <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="fecRadio"
                    value={opt}
                    disabled={isCw}
                    checked={!isCw && fecRadio === opt}
                    onChange={(e) => setFecRadio(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>

            <button
              onClick={handleRunFEC}
              disabled={isCw}
              className={`px-6 py-2 rounded-xl text-white font-bold text-xs shadow-sm transition ${
                isCw ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#1677FF] hover:bg-blue-600'
              }`}
            >
              Decode
            </button>
          </div>

          {/* Right Status Box matching Screen 4 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="text-slate-500">
              FEC Method: <span className="font-bold text-slate-700">{isCw ? 'Not applied' : 'Unavailable'}</span>
            </div>
            <div className="text-slate-500">
              Configured: <span className="font-bold text-slate-800">{isCw ? 'Not applied' : fecRadio}</span>
            </div>
            <div className="flex justify-between font-mono pt-1 border-t border-slate-200">
              <span className="text-slate-500 font-sans">FEC Mode:</span>
              <span className="font-bold text-slate-600">{isCw ? 'Not applicable' : 'Simulation / Prototype'}</span>
            </div>
            {fecDone && (
              <div className="flex items-center gap-1.5 text-slate-600 font-bold pt-1 border-t border-slate-200">
                <CheckCircle2 className={`w-4 h-4 ${isCw ? 'text-slate-400' : 'text-emerald-600'}`} />
                {isCw ? 'FEC: Not applied' : 'Error correction completed'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
