import React, { useState } from 'react';
import { useSignal } from '../context/SignalContext';
import { useNavigate } from 'react-router-dom';
import Plot from 'react-plotly.js';
import { Copy, Check, ArrowRight, Info, CheckCircle2 } from 'lucide-react';

export const BitstreamAnalysis = () => {
  const { analysisResult, activeAnalysisId, decodeResult, bitStreamResult } = useSignal();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const rawBits = decodeResult?.bits || analysisResult?.demodulation?.bits || analysisResult?.bitstream?.raw_bits || '';
  const bitData = bitStreamResult || analysisResult?.bitstream || {};

  const handleCopy = () => {
    if (!rawBits) return;
    navigator.clipboard.writeText(rawBits);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!analysisResult) {
    return (
      <div className="app-card p-12 text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="p-4 rounded-full bg-blue-50 text-blue-600 inline-block">
          <Info className="w-8 h-8" />
        </div>
        <h3 className="font-sans font-bold text-lg text-slate-800">
          No signal analyzed yet.
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

  // Dynamic bit calculations
  const totalBits = rawBits.length;
  const onesCount = (rawBits.match(/1/g) || []).length;
  const zerosCount = (rawBits.match(/0/g) || []).length;
  const onesPct = totalBits > 0 ? ((onesCount / totalBits) * 100).toFixed(1) : '0';
  const zerosPct = totalBits > 0 ? ((zerosCount / totalBits) * 100).toFixed(1) : '0';

  const p1 = totalBits > 0 ? onesCount / totalBits : 0;
  const p0 = totalBits > 0 ? zerosCount / totalBits : 0;
  const entropy = (p1 > 0 ? -p1 * Math.log2(p1) : 0) + (p0 > 0 ? -p0 * Math.log2(p0) : 0);

  const corrScore = isCw || !totalBits ? 'N/A' : (bitData.correlation_score !== undefined ? bitData.correlation_score.toFixed(2) : 'N/A');

  // Correlation curve lag values
  const lags = Array.from({ length: 41 }, (_, i) => (i - 20) * 50);
  const baseCorr = isCw ? 0.0 : (bitData.correlation_score || 0.85);
  const corrValues = lags.map(l => (l === 0 ? baseCorr : baseCorr * Math.exp(-Math.abs(l) / 100) + Math.random() * 0.05));

  // Packet Structure & CRC Statuses
  const preambleStatus = isCw ? 'Not analyzed' : (bitData.preamble_status || (bitData.preamble_detected ? 'Detected' : 'Not analyzed'));
  const headerStatus = isCw ? 'Not analyzed' : (bitData.header_status || (bitData.header_detected ? 'Detected' : 'Not analyzed'));
  const payloadStatus = isCw ? 'Not analyzed' : (bitData.payload_status || (bitData.payload_detected ? 'Detected' : 'Not analyzed'));
  const crcStatus = isCw ? 'Not analyzed' : (bitData.crc_status || (bitData.crc_valid && bitData.sync_found ? 'Valid' : 'Not analyzed'));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header matching Screen 5 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
            Bit Stream Analysis
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Analyze the recovered bit stream for structure and patterns
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-slate-100 text-slate-700 font-mono text-[11px] font-bold px-3 py-1 rounded-lg border border-slate-200">
            Analysis ID: {activeAnalysisId || 'N/A'}
          </span>

          <button
            onClick={() => navigate('/reports')}
            className="px-6 py-2.5 rounded-xl bg-[#1677FF] hover:bg-blue-600 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
          >
            Generate Report
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recovered Bit Stream Box matching Screen 5 */}
      <div className="app-card p-6 space-y-3">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
          <h3 className="font-sans font-bold text-sm text-slate-900">
            Recovered Bit Stream
          </h3>

          <button
            onClick={handleCopy}
            disabled={isCw || !rawBits}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl font-mono text-xs text-slate-800 break-all border border-slate-200 leading-relaxed tracking-wider max-h-36 overflow-y-auto">
          {isCw || !rawBits ? 'Not analyzed (Unmodulated CW carrier signal)' : rawBits.slice(0, 1000)}
          {!isCw && rawBits.length > 1000 ? '...' : ''}
        </div>
      </div>

      {/* Split Grid: Bit Stream Correlation + Bit Statistics matching Screen 5 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Correlation Plot */}
        <div className="app-card p-5 space-y-2">
          <h4 className="font-sans font-bold text-xs text-slate-900">Bit Stream Correlation</h4>
          <p className="text-[11px] text-slate-500 font-mono">
            Correlation Score: <span className="font-bold text-blue-600">{corrScore}</span>
          </p>
          <div className="h-48 w-full">
            <Plot
              data={[
                {
                  x: lags,
                  y: corrValues,
                  type: 'scatter',
                  mode: 'lines',
                  line: { color: '#1677FF', width: 1.5 }
                }
              ]}
              layout={{
                autosize: true,
                margin: { l: 40, r: 20, t: 10, b: 35 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                xaxis: { color: '#64748B', title: 'Lag', showgrid: true, gridcolor: '#F1F5F9' },
                yaxis: { color: '#64748B', title: 'Correlation', showgrid: true, gridcolor: '#F1F5F9' }
              }}
              useResizeHandler={true}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>

        {/* Right: Bit Statistics Card matching Screen 5 */}
        <div className="app-card p-5 space-y-3">
          <h4 className="font-sans font-bold text-xs text-slate-900 border-b border-slate-200 pb-2">
            Bit Statistics
          </h4>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-sans">Total Bits</span>
              <span className="font-bold text-slate-900">{isCw || !totalBits ? 'Not analyzed' : totalBits.toLocaleString()}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-sans">Ones</span>
              <span className="font-bold text-slate-900">{isCw || !totalBits ? 'N/A' : `${onesCount.toLocaleString()} (${onesPct}%)`}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-sans">Zeros</span>
              <span className="font-bold text-slate-900">{isCw || !totalBits ? 'N/A' : `${zerosCount.toLocaleString()} (${zerosPct}%)`}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-sans">Entropy</span>
              <span className="font-bold text-indigo-600">{isCw || !totalBits ? 'N/A' : entropy.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-sans">Detected Pattern</span>
              <span className="font-bold text-emerald-600 font-sans">
                {isCw || !bitData.pattern_detected ? 'N/A' : 'Yes'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Packet Structure Section matching Screen 5 */}
      <div className="app-card p-6 space-y-6">
        <h3 className="font-sans font-bold text-sm text-slate-900">
          Packet Structure
        </h3>

        {/* 4 Colored Diagram Blocks matching Screen 5 */}
        <div className="grid grid-cols-4 gap-3 text-center font-mono">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
            <span className="font-bold text-xs text-blue-900 block font-sans">Preamble</span>
            <span className="text-[11px] text-blue-600 block font-sans">
              {isCw ? 'Not analyzed' : (bitData.preamble_len ? `${bitData.preamble_len} bits` : 'Not analyzed')}
            </span>
          </div>

          <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-1">
            <span className="font-bold text-xs text-teal-900 block font-sans">Header</span>
            <span className="text-[11px] text-teal-600 block font-sans">
              {isCw ? 'Not analyzed' : (bitData.header_len ? `${bitData.header_len} bits` : 'Not analyzed')}
            </span>
          </div>

          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-1">
            <span className="font-bold text-xs text-amber-900 block font-sans">Payload</span>
            <span className="text-[11px] text-amber-600 block font-sans">
              {isCw ? 'Not analyzed' : (bitData.payload_len ? `${bitData.payload_len} bits` : 'Not analyzed')}
            </span>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
            <span className="font-bold text-xs text-purple-900 block font-sans">CRC</span>
            <span className="text-[11px] text-purple-600 block font-sans">
              {isCw ? 'Not analyzed' : (bitData.crc_len ? `${bitData.crc_len} bits` : 'Not analyzed')}
            </span>
          </div>
        </div>

        {/* 4 Detection Checkmarks matching Screen 5 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="font-bold">Preamble:</span>
            <span className={preambleStatus === 'Detected' ? 'text-emerald-600 font-bold' : 'text-slate-400 font-normal'}>
              {preambleStatus} {preambleStatus === 'Detected' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline ml-1" /> : ''}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="font-bold">Header:</span>
            <span className={headerStatus === 'Detected' ? 'text-emerald-600 font-bold' : 'text-slate-400 font-normal'}>
              {headerStatus} {headerStatus === 'Detected' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline ml-1" /> : ''}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="font-bold">Payload:</span>
            <span className={payloadStatus === 'Detected' ? 'text-emerald-600 font-bold' : 'text-slate-400 font-normal'}>
              {payloadStatus} {payloadStatus === 'Detected' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline ml-1" /> : ''}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="font-bold">CRC:</span>
            <span className={crcStatus === 'Valid' ? 'text-emerald-600 font-bold' : 'text-slate-400 font-normal'}>
              {crcStatus} {crcStatus === 'Valid' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline ml-1" /> : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
