import React, { useState } from 'react';
import { useSignal } from '../context/SignalContext';
import { useNavigate } from 'react-router-dom';
import Plot from 'react-plotly.js';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
  Info
} from 'lucide-react';

export const AnalyzeSignal = () => {
  const { analysisResult, activeAnalysisId } = useSignal();
  const [activeTab, setActiveTab] = useState('spectrum');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const navigate = useNavigate();

  const meta = analysisResult?.metadata || {};
  const params = analysisResult?.parameters || {};
  const cls = analysisResult?.classification || {};
  const spec = analysisResult?.spectrum || { freqs: [], psd_db: [] };
  const waterfall = analysisResult?.waterfall || { z_matrix: [] };
  const constData = analysisResult?.constellation || { i: [], q: [] };
  const wf = analysisResult?.waveform || { time: [], real: [] };

  const formatSampleRate = (sr) => {
    if (!sr || sr <= 0) return 'Not provided';
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

  const snrVal = params.snr_db !== undefined ? params.snr_db : null;
  const qualityRating = snrVal !== null ? (snrVal > 15 ? 'Good' : snrVal > 8 ? 'Fair' : 'Poor') : 'Not Assessed';
  const qualityColor = snrVal !== null
    ? (snrVal > 15 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200')
    : 'bg-slate-100 text-slate-600 border-slate-200';

  const isNormalizedFreq = spec.is_normalized_freq || !meta.sample_rate;
  const freqAxisTitle = isNormalizedFreq ? 'Normalized Frequency' : 'Frequency (Hz)';
  const waterfallFreqTitle = isNormalizedFreq ? 'Normalized Frequency' : 'Frequency';

  const isSpecValid = spec.freqs && spec.freqs.length > 0 && spec.psd_db && spec.psd_db.length > 0;
  const isWaterfallValid = waterfall.z_matrix && waterfall.z_matrix.length > 1 && waterfall.z_matrix[0] && waterfall.z_matrix[0].length > 1;
  const isConstellationValid = constData.i && constData.i.length > 0 && constData.q && constData.q.length > 0;
  const isWfValid = wf.time && wf.time.length > 0;

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
          Upload an IQ or WAV recording to begin automated DSP analysis.
        </p>
        <button
          onClick={() => navigate('/upload')}
          className="px-6 py-2.5 rounded-xl bg-[#1677FF] hover:bg-blue-600 text-white font-bold text-xs shadow-md transition inline-flex items-center gap-2"
        >
          UPLOAD SIGNAL
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title Header matching Screen 3 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
            Signal Analysis
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Detected signal parameters and visualizations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-slate-100 text-slate-700 font-mono text-[11px] font-bold px-3 py-1 rounded-lg border border-slate-200">
            Analysis ID: {activeAnalysisId || 'N/A'}
          </span>

          <button
            onClick={() => navigate('/decode')}
            className="px-6 py-2.5 rounded-xl bg-[#1677FF] hover:bg-blue-600 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
          >
            Continue to Decode
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Signal Parameters 4-Column Card matching Screen 3 */}
      <div className="app-card p-6 space-y-4">
        <h3 className="font-sans font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
          Signal Parameters
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4 text-xs font-mono">
          {/* Row 1 */}
          <div>
            <span className="text-slate-400 font-sans block font-medium flex items-center gap-1">
              Sampling Frequency
              <span className="group relative cursor-pointer text-slate-400">
                <HelpCircle className="w-3 h-3" />
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden w-44 rounded-lg bg-slate-900 p-2 text-[10px] text-white shadow-lg group-hover:block z-20">
                  Rate at which discrete samples are captured (Fs).
                </span>
              </span>
            </span>
            <span className="font-bold text-slate-900 text-sm">
              {formatSampleRate(meta.sample_rate)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-sans block font-medium">Modulation</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-emerald-600 font-sans text-sm">{cls.modulation || 'Unknown'}</span>
              {cls.classification_method && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cls.classification_method === 'ML' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                  {cls.classification_method}
                </span>
              )}
            </div>
          </div>

          <div>
            <span className="text-slate-400 font-sans block font-medium">Center Frequency</span>
            <span className="font-bold text-slate-900 text-sm">
              {isNormalizedFreq
                ? `${(params.center_frequency || params.peak_frequency || 0) >= 0 ? '+' : ''}${(params.center_frequency || params.peak_frequency || 0).toFixed(4)} normalized`
                : formatFreq(params.center_frequency || params.peak_frequency)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-sans block font-medium">Symbol Rate</span>
            <span className="font-bold text-slate-900 text-sm">
              {cls.cw_detected || String(cls.modulation || "").toUpperCase().includes("CW")
                ? "Not available"
                : (params.symbol_rate_display || (params.symbol_rate !== null && params.symbol_rate !== undefined ? `${params.symbol_rate} Sym/s` : 'Not available'))}
            </span>
          </div>

          {/* Row 2 */}
          <div>
            <span className="text-slate-400 font-sans block font-medium">Bandwidth</span>
            <span className="font-bold text-slate-900 text-sm">
              {isNormalizedFreq ? `${params.occupied_bandwidth || 'N/A'}` : formatFreq(params.occupied_bandwidth)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-sans block font-medium">Data Rate</span>
            <span className="font-bold text-slate-900 text-sm">
              {cls.cw_detected || String(cls.modulation || "").toUpperCase().includes("CW") ? "N/A" : (params.data_rate !== undefined ? `${params.data_rate} Mbps` : 'N/A')}
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-sans block font-medium">SNR</span>
            <span className="font-bold text-blue-600 text-sm">
              {params.snr_display || (params.snr_db !== undefined ? `${params.snr_db} dB` : 'N/A')}
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-sans block font-medium">Confidence</span>
            <span className="font-bold text-emerald-600 font-sans text-sm">
              {cls.confidence !== undefined ? (cls.confidence <= 1.0 ? `${(cls.confidence * 100).toFixed(1)}%` : `${cls.confidence}%`) : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Tabs matching Screen 3 */}
      <div className="app-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3">
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('spectrum')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'spectrum' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Spectrum
            </button>
            <button
              onClick={() => setActiveTab('waterfall')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'waterfall' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Waterfall
            </button>
            <button
              onClick={() => setActiveTab('constellation')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'constellation' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Constellation
            </button>
            <button
              onClick={() => setActiveTab('time')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'time' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Time Domain
            </button>
          </div>
        </div>

        {/* Visual Tab Content */}
        <div className="space-y-2">
          <h4 className="font-sans font-bold text-xs text-slate-800 capitalize">
            {activeTab === 'spectrum' && 'Signal Spectrum (FFT)'}
            {activeTab === 'waterfall' && 'Waterfall Spectrogram'}
            {activeTab === 'constellation' && 'IQ Constellation Diagram'}
            {activeTab === 'time' && 'Time Domain Waveform'}
          </h4>
          <div className="h-64 w-full">
            {activeTab === 'spectrum' && (
              isSpecValid ? (
                <Plot
                  data={[
                    {
                      x: spec.freqs || [],
                      y: spec.psd_db || [],
                      type: 'scatter',
                      mode: 'lines',
                      name: 'Power (dB)',
                      line: { color: '#1677FF', width: 1.5 }
                    }
                  ]}
                  layout={{
                    autosize: true,
                    margin: { l: 45, r: 20, t: 10, b: 35 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    xaxis: { color: '#64748B', title: freqAxisTitle, showgrid: true, gridcolor: '#F1F5F9' },
                    yaxis: { color: '#64748B', title: 'Power (dB)', showgrid: true, gridcolor: '#F1F5F9' }
                  }}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs font-medium">
                  Visualization data unavailable: spectrum data empty
                </div>
              )
            )}

            {activeTab === 'waterfall' && (
              isWaterfallValid ? (
                <Plot
                  data={[
                    {
                      z: waterfall.z_matrix || [[0]],
                      x: waterfall.freqs || [],
                      y: waterfall.time_stamps || [],
                      type: 'heatmap',
                      colorscale: 'Jet'
                    }
                  ]}
                  layout={{
                    autosize: true,
                    margin: { l: 40, r: 20, t: 10, b: 35 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    xaxis: { color: '#64748B', title: waterfallFreqTitle },
                    yaxis: { color: '#64748B', title: 'Time (s)' }
                  }}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs font-medium">
                  Visualization data unavailable: waterfall matrix empty
                </div>
              )
            )}

            {activeTab === 'constellation' && (
              isConstellationValid ? (
                <Plot
                  data={[
                    {
                      x: constData.i || [],
                      y: constData.q || [],
                      type: 'scatter',
                      mode: 'markers',
                      marker: { color: '#1677FF', size: 5, opacity: 0.7 }
                    }
                  ]}
                  layout={{
                    autosize: true,
                    margin: { l: 40, r: 20, t: 10, b: 35 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    xaxis: { color: '#64748B', title: 'In-phase (I)', showgrid: true, gridcolor: '#F1F5F9' },
                    yaxis: { color: '#64748B', title: 'Quadrature (Q)', showgrid: true, gridcolor: '#F1F5F9' }
                  }}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs font-medium">
                  Visualization data unavailable: constellation points empty
                </div>
              )
            )}

            {activeTab === 'time' && (
              isWfValid ? (
                <Plot
                  data={[
                    {
                      x: wf.time || [],
                      y: wf.real || [],
                      type: 'scatter',
                      mode: 'lines',
                      name: 'Amplitude',
                      line: { color: '#10B981', width: 1.2 }
                    }
                  ]}
                  layout={{
                    autosize: true,
                    margin: { l: 45, r: 20, t: 10, b: 35 },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                    xaxis: { color: '#64748B', title: 'Time (s)', showgrid: true, gridcolor: '#F1F5F9' },
                    yaxis: { color: '#64748B', title: 'Amplitude', showgrid: true, gridcolor: '#F1F5F9' }
                  }}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs font-medium">
                  Visualization data unavailable: time domain preview empty
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Bottom Dual Grid matching Screen 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Waterfall Plot */}
        <div className="app-card p-5 space-y-2">
          <h4 className="font-sans font-bold text-xs text-slate-800">Waterfall Plot</h4>
          <div className="h-56 w-full">
            {isWaterfallValid ? (
              <Plot
                data={[
                  {
                    z: waterfall.z_matrix || [[0]],
                    x: waterfall.freqs || [],
                    y: waterfall.time_stamps || [],
                    type: 'heatmap',
                    colorscale: 'Jet'
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { l: 40, r: 20, t: 10, b: 35 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  xaxis: { color: '#64748B', title: waterfallFreqTitle },
                  yaxis: { color: '#64748B', title: 'Time (s)' }
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                Visualization data unavailable
              </div>
            )}
          </div>
        </div>

        {/* Right: Constellation Diagram */}
        <div className="app-card p-5 space-y-2">
          <h4 className="font-sans font-bold text-xs text-slate-800">Constellation Diagram</h4>
          <div className="h-56 w-full">
            {isConstellationValid ? (
              <Plot
                data={[
                  {
                    x: constData.i || [],
                    y: constData.q || [],
                    type: 'scatter',
                    mode: 'markers',
                    marker: { color: '#1677FF', size: 4, opacity: 0.7 }
                  }
                ]}
                layout={{
                  autosize: true,
                  margin: { l: 40, r: 20, t: 10, b: 35 },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  xaxis: { color: '#64748B', title: 'I', showgrid: true, gridcolor: '#F1F5F9' },
                  yaxis: { color: '#64748B', title: 'Q', showgrid: true, gridcolor: '#F1F5F9' }
                }}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                Visualization data unavailable
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Explanation Box & Quality Rating */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 app-card p-5 space-y-2 border-l-4 border-l-blue-600">
          <h4 className="font-sans font-bold text-xs text-slate-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            WHAT DID WAVEINTEL DETECT?
          </h4>
          <p className="text-xs text-slate-600 font-medium">
            Detected Modulation: <span className="font-bold text-slate-900">{cls.modulation || 'Unknown'}</span>{' '}
            {cls.confidence !== undefined ? `(${cls.confidence <= 1.0 ? (cls.confidence * 100).toFixed(1) : cls.confidence}% confidence via ${cls.classification_method || 'ML'})` : ''}
          </p>
          <p className="text-xs text-slate-500">
            {cls.explanation ||
              (cls.modulation
                ? `Symbol cluster features and spectral properties are consistent with ${cls.modulation} modulation.`
                : 'Detection rationale is unavailable for this analysis.')}
          </p>
        </div>

        <div className="app-card p-5 space-y-2">
          <h4 className="font-sans font-bold text-xs text-slate-900">SIGNAL QUALITY SUMMARY</h4>
          <div className="text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">SNR:</span>
              <span className="font-mono font-bold text-slate-800">
                {params.snr_display || (snrVal !== null ? `${snrVal} dB` : 'N/A')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Quality Rating:</span>
              <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${qualityColor}`}>
                {qualityRating}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TECHNICAL DETAILS Drawer */}
      <div className="app-card p-4 space-y-3">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full flex justify-between items-center text-xs font-bold text-slate-700 hover:text-blue-600 transition"
        >
          <span>TECHNICAL DETAILS</span>
          {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTechnicalDetails && (
          <div className="pt-3 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block font-sans">FFT Size</span>
              <span className="font-bold text-slate-800">4096 points</span>
            </div>
            <div>
              <span className="text-slate-400 block font-sans">Window Function</span>
              <span className="font-bold text-slate-800">Hann Window</span>
            </div>
            <div>
              <span className="text-slate-400 block font-sans">STFT Parameters</span>
              <span className="font-bold text-slate-800">256 nperseg, 128 overlap</span>
            </div>
            <div>
              <span className="text-slate-400 block font-sans">Processing Time</span>
              <span className="font-bold text-blue-600">0.42 sec</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
