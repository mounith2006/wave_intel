import React, { useState } from 'react';
import { useSignal } from '../context/SignalContext';
import { api } from '../services/api';
import { Upload, FileText, CheckCircle, Radio, Play, HardDrive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SignalInput = () => {
  const { activeFileName, setActiveFileName, sampleRate, setSampleRate, triggerAnalysis, analysisResult } = useSignal();
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const navigate = useNavigate();

  const sampleFiles = [
    { name: 'sample_qpsk.wav', type: 'QPSK PCM WAV', desc: 'QPSK modulated carrier @ 8000 Hz, Fs=48000 Hz' },
    { name: 'sample_bpsk.wav', type: 'BPSK PCM WAV', desc: 'BPSK modulated carrier @ 6000 Hz, Fs=48000 Hz' },
    { name: 'sample_fsk.wav', type: '2FSK PCM WAV', desc: '2FSK modulated carrier @ 5000 Hz, Fs=48000 Hz' },
    { name: 'sample_qam16.wav', type: '16-QAM PCM WAV', desc: '16-QAM modulated carrier @ 10000 Hz, Fs=48000 Hz' },
    { name: 'sample_iq.iq', type: 'Complex IQ', desc: 'Raw binary float32 complex IQ stream' },
  ];

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadStatus('Uploading file...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.uploadFile(formData);
      setSelectedFile(res.file);
      setActiveFileName(res.file.name);
      setUploadStatus(`Uploaded: ${res.file.name}`);
    } catch (err) {
      setUploadStatus('Upload failed');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = (filename) => {
    setActiveFileName(filename);
    setSelectedFile({ name: filename, size: 230400, type: filename.endsWith('.iq') ? 'Complex IQ' : 'WAV Audio' });
    setUploadStatus(`Loaded synthetic sample: ${filename}`);
  };

  const startAnalysis = () => {
    triggerAnalysis(activeFileName, sampleRate);
    navigate('/overview');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="font-orbitron text-2xl font-bold text-cyan-300 flex items-center gap-3">
          <Upload className="w-6 h-6 text-cyan-400" />
          MODULE 2: SIGNAL FILE INPUT & INGESTION
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Upload raw .IQ binary captures or PCM .WAV radio signal recordings for DSP parameter extraction.
        </p>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`cyber-card p-10 text-center border-2 border-dashed transition-all duration-300 cursor-pointer ${
          dragOver ? 'border-cyan-400 bg-cyan-950/20 glow-border-cyan' : 'border-slate-700/80 hover:border-cyan-500/50'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Upload className="w-10 h-10 animate-bounce" />
          </div>
          <div>
            <h3 className="font-orbitron font-semibold text-lg text-slate-200">
              DRAG & DROP SIGNAL FILE HERE
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports <span className="text-cyan-300 font-mono font-bold">.IQ</span> (complex float32/int16) and{' '}
              <span className="text-cyan-300 font-mono font-bold">.WAV</span> (PCM radio audio)
            </p>
          </div>

          <label className="px-5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold cursor-pointer transition">
            Browse Files...
            <input
              type="file"
              accept=".wav,.iq,.raw,.bin"
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            />
          </label>

          {uploadStatus && (
            <p className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded border border-emerald-800">
              {uploadStatus}
            </p>
          )}
        </div>
      </div>

      {/* Quick Load Preset Sample Signals */}
      <div className="cyber-card p-6 space-y-4">
        <h3 className="font-orbitron text-sm font-semibold text-cyan-300 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-blue-400" />
          PRE-LOADED DEMONSTRATION SIGNALS
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sampleFiles.map((sample) => (
            <div
              key={sample.name}
              onClick={() => handleSelectSample(sample.name)}
              className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                activeFileName === sample.name
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-glowCyan'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-xs font-bold text-cyan-300">{sample.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-700/50">
                  {sample.type}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{sample.desc}</p>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-emerald-400">
                  {activeFileName === sample.name ? '● SELECTED' : 'Select →'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration & Trigger */}
      <div className="cyber-card p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-semibold block">SAMPLING RATE CONFIGURATION (Hz):</label>
          <select
            value={sampleRate}
            onChange={(e) => setSampleRate(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs rounded-xl px-4 py-2 focus:outline-none focus:border-cyan-400"
          >
            <option value={48000}>48,000 Hz (Standard Audio / RF)</option>
            <option value={96000}>96,000 Hz (High Res RF)</option>
            <option value={100000}>100,000 Hz (SDR Stream)</option>
            <option value={250000}>250,000 Hz (Wideband IQ)</option>
          </select>
        </div>

        <button
          onClick={startAnalysis}
          className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-orbitron font-extrabold text-sm shadow-glowCyan transition flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          ANALYZE SIGNAL TELEMETRY
        </button>
      </div>
    </div>
  );
};
