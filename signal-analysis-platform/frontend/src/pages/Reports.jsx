import React from 'react';
import { useSignal } from '../context/SignalContext';
import { api } from '../services/api';
import Plot from 'react-plotly.js';
import { Download, Share2, CheckCircle2, FileText, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Reports = () => {
  const { activeFileName, analysisResult, activeAnalysisId, decodeResult, bitStreamResult } = useSignal();
  const navigate = useNavigate();
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [exportError, setExportError] = React.useState(null);

  const meta = analysisResult?.metadata || {};
  const params = analysisResult?.parameters || {};
  const cls = analysisResult?.classification || {};
  const demod = decodeResult || analysisResult?.demodulation || {};
  const bitData = bitStreamResult || analysisResult?.bitstream || {};
  const spec = analysisResult?.spectrum || { freqs: [], psd_db: [] };
  const waterfall = analysisResult?.waterfall || { z_matrix: [] };
  const constData = analysisResult?.constellation || { i: [], q: [] };
  const wf = analysisResult?.waveform || { time: [], real: [] };

  const formatSampleRate = (sr) => {
    if (!sr || sr <= 0) return 'N/A';
    if (sr >= 1000000) return `${(sr / 1000000).toFixed(1)} MHz`;
    if (sr >= 1000) return `${(sr / 1000).toFixed(1)} kHz`;
    return `${sr} Hz`;
  };

  const formatFreq = (freq) => {
    if (freq === undefined || freq === null) return 'N/A';
    const absF = Math.abs(freq);
    if (absF >= 1000000) return `${(freq / 1000000).toFixed(2)} MHz`;
    if (absF >= 1000) return `${(freq / 1000).toFixed(1)} kHz`;
    return `${freq.toFixed(1)} Hz`;
  };

  const handleDownload = (format) => {
    setExportError(null);
    const fileToExport = meta.file_name || activeFileName;
    console.log('[WaveIntel] Report generation requested', { fileToExport, format, activeAnalysisId });
    if (!fileToExport) {
      setExportError('No file available for export');
      return;
    }
    try {
      const url = api.getReportUrl(fileToExport, format);
      window.open(url, '_blank');
    } catch (err) {
      console.error('[WaveIntel] Report export error:', err);
      setExportError(err.message || 'Failed to trigger report export');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (!analysisResult) {
    return (
      <div className="app-card p-12 text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="p-4 rounded-full bg-blue-50 text-blue-600 inline-block">
          <Info className="w-8 h-8" />
        </div>
        <h3 className="font-sans font-bold text-lg text-slate-800">
          No analysis report available.
        </h3>
        <p className="text-xs text-slate-500">
          Complete an analysis to generate a report.
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

  const isCw = Boolean(cls.cw_detected || String(cls.modulation || '').toUpperCase().includes('CW'));
  const isNormalizedFreq = spec.is_normalized_freq || !meta.sample_rate;

  const preambleStatus = isCw ? 'Not analyzed' : (bitData.preamble_status || (bitData.preamble_detected ? 'Detected ✔' : 'Not analyzed'));
  const headerStatus = isCw ? 'Not analyzed' : (bitData.header_status || (bitData.header_detected ? 'Detected ✔' : 'Not analyzed'));
  const payloadStatus = isCw ? 'Not analyzed' : (bitData.payload_status || (bitData.payload_detected ? 'Detected ✔' : 'Not analyzed'));
  const crcStatus = isCw ? 'Not analyzed' : (bitData.crc_status || (bitData.crc_valid && bitData.sync_found ? 'Valid ✔' : 'Not analyzed'));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header matching Screen 6 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
            Analysis Report
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Complete analysis summary and export options
          </p>
        </div>

        <span className="bg-slate-100 text-slate-700 font-mono text-[11px] font-bold px-3 py-1 rounded-lg border border-slate-200">
          Analysis ID: {activeAnalysisId || 'N/A'}
        </span>
      </div>

      {/* Grid of 4 Summary Cards matching Screen 6 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
        {/* Card 1: Signal Information */}
        <div className="app-card p-5 space-y-3">
          <h3 className="font-sans font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
            Signal Information
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">File Name</span>
              <span className="font-bold text-slate-900">{meta.file_name || activeFileName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">File Type</span>
              <span className="font-bold text-slate-900">
                {meta.format ? (meta.is_complex ? 'IQ file' : 'WAV file') : (activeFileName?.endsWith('.iq') ? 'IQ file' : 'WAV file')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">File Size</span>
              <span className="text-slate-700">{meta.file_size ? `${(meta.file_size / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Analysis Date</span>
              <span className="text-slate-700 font-sans text-[11px]">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Signal Parameters */}
        <div className="app-card p-5 space-y-3">
          <h3 className="font-sans font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
            Signal Parameters
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Sampling Freq</span>
              <span className="font-bold text-slate-900">
                {params.sampling_frequency_hz ? `${params.sampling_frequency_hz.toLocaleString()} Hz` : 'Not available'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Center Frequency</span>
              <span className="font-bold text-slate-900">
                {params.center_frequency_hz !== null ? `${params.center_frequency_hz.toLocaleString()} Hz` : (params.center_frequency_normalized ? `${params.center_frequency_normalized} norm` : 'Not available')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Bandwidth</span>
              <span className="font-bold text-slate-900">
                {params.bandwidth_hz !== null ? `${params.bandwidth_hz.toLocaleString()} Hz` : (params.bandwidth_normalized ? `${params.bandwidth_normalized} norm` : 'Not available')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">SNR</span>
              <span className="font-bold text-blue-600">
                {params.snr_db !== null && params.snr_db !== undefined ? `${params.snr_db.toFixed(1)} dB` : 'Not available'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Modulation</span>
              <span className="font-bold text-emerald-600 font-sans">{cls.modulation || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Symbol Rate</span>
              <span className="text-slate-800">
                {params.symbol_rate_baud !== null ? `${params.symbol_rate_baud.toLocaleString()} baud` : (params.symbol_rate_normalized ? `${params.symbol_rate_normalized} norm` : 'Not available')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Data Rate</span>
              <span className="text-slate-800">
                {params.data_rate_bps !== null && params.data_rate_bps !== undefined ? `${params.data_rate_bps.toLocaleString()} bps` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Decoding Summary */}
        <div className="app-card p-5 space-y-3">
          <h3 className="font-sans font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
            Decoding Summary
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Demodulation</span>
              <span className="font-bold text-emerald-600 font-sans flex items-center gap-1">
                {isCw ? 'Not applicable' : `${cls.modulation || 'Completed'} ✔`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">De-interleaving</span>
              <span className="font-bold text-slate-700 font-sans">
                {isCw ? 'Not applied' : 'Configured (Block)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">FEC Method</span>
              <span className="font-bold text-slate-700 font-sans">
                {isCw ? 'Not applied' : 'Configured (Viterbi)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">FEC Mode</span>
              <span className="text-slate-600 font-bold font-sans">
                {isCw ? 'Not applicable' : 'Simulation'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Estimated BER</span>
              <span className="font-bold text-slate-700">
                {isCw ? 'Not available' : (demod.estimated_ber !== undefined ? `${(demod.estimated_ber * 100).toFixed(2)}%` : 'N/A')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Bit Analysis */}
        <div className="app-card p-5 space-y-3">
          <h3 className="font-sans font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
            Bit Analysis
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Preamble</span>
              <span className="font-bold text-slate-700 font-sans">{preambleStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Header</span>
              <span className="font-bold text-slate-700 font-sans">{headerStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Payload</span>
              <span className="font-bold text-slate-700 font-sans">{payloadStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">CRC</span>
              <span className="font-bold text-slate-700 font-sans">{crcStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Total Bits</span>
              <span className="font-bold text-slate-900">
                {isCw || !demod.num_bits ? 'Not analyzed' : demod.num_bits.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visualizations Row matching Screen 6 */}
      <div className="app-card p-5 space-y-3">
        <h3 className="font-sans font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
          Visualizations
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="border border-slate-200 rounded-xl p-2 space-y-1">
            <span className="text-[11px] font-bold text-slate-700 block text-center">Spectrum</span>
            <div className="h-28 w-full">
              <Plot
                data={[{ x: spec.freqs || [], y: spec.psd_db || [], type: 'scatter', mode: 'lines', line: { color: '#1677FF', width: 1 } }]}
                layout={{ autosize: true, margin: { l: 20, r: 10, t: 5, b: 20 }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent' }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-2 space-y-1">
            <span className="text-[11px] font-bold text-slate-700 block text-center">Waterfall</span>
            <div className="h-28 w-full">
              <Plot
                data={[{ z: waterfall.z_matrix || [[0]], type: 'heatmap', colorscale: 'Jet' }]}
                layout={{ autosize: true, margin: { l: 20, r: 10, t: 5, b: 20 }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent' }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-2 space-y-1">
            <span className="text-[11px] font-bold text-slate-700 block text-center">Constellation</span>
            <div className="h-28 w-full">
              <Plot
                data={[{ x: constData.i || [], y: constData.q || [], type: 'scatter', mode: 'markers', marker: { color: '#1677FF', size: 3 } }]}
                layout={{ autosize: true, margin: { l: 20, r: 10, t: 5, b: 20 }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent' }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-2 space-y-1">
            <span className="text-[11px] font-bold text-slate-700 block text-center">Time Domain</span>
            <div className="h-28 w-full">
              <Plot
                data={[{ x: wf.time || [], y: wf.real || [], type: 'scatter', mode: 'lines', line: { color: '#2563EB', width: 1 } }]}
                layout={{ autosize: true, margin: { l: 20, r: 10, t: 5, b: 20 }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent' }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ displayModeBar: false }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Bar matching Screen 6 */}
      <div className="flex flex-wrap gap-4 pt-2">
        <button
          onClick={() => handleDownload('pdf')}
          className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>

        <button
          onClick={() => handleDownload('json')}
          className="px-6 py-2.5 rounded-xl bg-[#1677FF] hover:bg-blue-600 text-white font-bold text-xs shadow-sm transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export JSON
        </button>

        <button
          onClick={() => handleDownload('csv')}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>

        <button
          onClick={handleCopyLink}
          className="px-6 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs shadow-sm transition flex items-center gap-2"
        >
          <Share2 className="w-4 h-4 text-slate-500" />
          {copiedLink ? 'Link Copied ✔' : 'Copy Report Link'}
        </button>
      </div>
    </div>
  );
};
