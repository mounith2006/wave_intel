import React, { useState } from 'react';
import { useSignal } from '../context/SignalContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileCode, CheckCircle2, ArrowRight, X, Loader2, AlertCircle } from 'lucide-react';

export const UploadSignal = () => {
  const {
    activeFileName,
    setActiveFileName,
    sampleRate,
    triggerAnalysis,
    isProcessing,
    progressData,
    analysisResult,
    analysisStatus,
    activeAnalysisId,
    error,
    resetAnalysis
  } = useSignal();

  const [dragOver, setDragOver] = useState(false);
  const [uploadedInfo, setUploadedInfo] = useState(
    activeFileName
      ? {
          name: activeFileName,
          size: activeFileName.endsWith('.iq') ? '2.4 MB' : '1.2 MB',
          type: activeFileName.endsWith('.iq') ? 'IQ file' : 'WAV file'
        }
      : null
  );
  const [isReady, setIsReady] = useState(!!activeFileName);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const navigate = useNavigate();

  const demoSignals = [
    { label: 'BPSK', file: 'sample_bpsk.wav', preset: 'bpsk', size: '1.2 MB', type: 'WAV file', color: 'text-blue-600', stroke: '#3B82F6' },
    { label: 'QPSK', file: 'sample_qpsk.wav', preset: 'qpsk', size: '1.2 MB', type: 'WAV file', color: 'text-red-500', stroke: '#EF4444' },
    { label: 'FSK', file: 'sample_fsk.wav', preset: 'fsk', size: '1.2 MB', type: 'WAV file', color: 'text-emerald-500', stroke: '#10B981' },
    { label: '16-QAM', file: 'sample_qam16.wav', preset: 'qam16', size: '1.2 MB', type: 'WAV file', color: 'text-purple-600', stroke: '#8B5CF6' },
  ];

  const handleFileUpload = async (file) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.uploadFile(formData);

      const fileObj = res.file || {};
      const fName = fileObj.name || file.name;
      const fSize = fileObj.size ? `${(fileObj.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      const fType = fileObj.type || (fName.endsWith('.iq') ? 'IQ file' : 'WAV file');

      if (resetAnalysis) resetAnalysis();
      setSelectedPreset(null);
      setActiveFileName(fName);
      setUploadedInfo({
        name: fName,
        size: fSize,
        type: fType
      });
      setIsReady(true);
    } catch (err) {
      console.error(err);
      if (resetAnalysis) resetAnalysis();
      setSelectedPreset(null);
      setActiveFileName(file.name);
      setUploadedInfo({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.name.endsWith('.iq') ? 'IQ file' : 'WAV file'
      });
      setIsReady(true);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSelectDemo = (demo) => {
    if (resetAnalysis) resetAnalysis();
    setSelectedPreset(demo.preset);
    setActiveFileName(demo.file);
    setUploadedInfo({
      name: demo.file,
      size: demo.size,
      type: demo.type
    });
    setIsReady(true);
  };

  const handleAnalyzeClick = () => {
    if (!activeFileName && !selectedPreset) return;
    triggerAnalysis(activeFileName, sampleRate, selectedPreset);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
          Upload Signal
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Upload your IQ or WAV file, or try our demo signals
        </p>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="app-card p-4 bg-red-50 border-l-4 border-l-red-500 flex justify-between items-start gap-3 text-xs text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-900">Analysis Failed</h4>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => handleAnalyzeClick()}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition shrink-0"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Real-Time Processing Progress Card */}
      {isProcessing && (
        <div className="app-card p-6 bg-blue-50/70 border border-blue-200 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-blue-900">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>{progressData.stage || 'Processing...'}</span>
            </div>
            <span className="font-mono text-blue-600">{progressData.percentage || 0}%</span>
          </div>
          <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressData.percentage || 0}%` }}
            />
          </div>
          <p className="text-[11px] text-blue-600 font-medium">{progressData.statusText || 'Executing DSP pipeline...'}</p>
        </div>
      )}

      {/* Large Drag and Drop Box */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`app-card p-10 text-center border-2 border-dashed transition-all duration-200 cursor-pointer ${
          dragOver ? 'border-blue-500 bg-blue-50/50' : 'border-blue-300 hover:border-blue-400 bg-white'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-4 rounded-full bg-blue-600 text-white shadow-md">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-sans font-bold text-base text-slate-900">
              Drag & drop your file here
            </h3>
            <p className="text-xs text-slate-400">or</p>
          </div>

          <label className="px-6 py-2.5 rounded-xl bg-[#1677FF] hover:bg-blue-600 text-white text-xs font-bold shadow-md cursor-pointer transition">
            Choose File
            <input
              type="file"
              accept=".wav,.iq,.raw,.bin"
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            />
          </label>

          <p className="text-[11px] text-slate-400 pt-2">
            Supported formats: <span className="font-mono font-bold text-slate-600">.IQ, .WAV</span> &nbsp; Max size: 100 MB
          </p>
        </div>
      </div>

      {/* File Ready Box */}
      {isReady && uploadedInfo && (
        <div className="app-card p-4 space-y-3 border-l-4 border-l-blue-600">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                <FileCode className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-mono font-bold text-sm text-slate-900">{uploadedInfo.name}</h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  {uploadedInfo.size} • {uploadedInfo.type}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setIsReady(false);
                setUploadedInfo(null);
                setActiveFileName(null);
                setSelectedPreset(null);
                if (resetAnalysis) resetAnalysis();
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold pt-1 border-t border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            File ready for analysis
          </div>
        </div>
      )}

      {/* Try Demo Signals Section */}
      <div className="space-y-3 pt-2">
        <div>
          <h3 className="font-sans font-bold text-sm text-slate-900">Try Demo Signals</h3>
          <p className="text-xs text-slate-400">Explore with preloaded sample signals</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {demoSignals.map((demo) => (
            <div
              key={demo.label}
              onClick={() => handleSelectDemo(demo)}
              className={`app-card p-4 space-y-3 cursor-pointer transition hover:border-blue-400 ${
                activeFileName === demo.file ? 'border-2 border-blue-500 shadow-md bg-blue-50/30' : ''
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-slate-900">{demo.label}</span>
                <span className="text-[10px] text-slate-400 font-medium">Demo Signal</span>
              </div>

              <div className="h-12 w-full flex items-center justify-center">
                {demo.label === '16-QAM' ? (
                  <div className="grid grid-cols-4 gap-1 p-1">
                    {[...Array(16)].map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                    ))}
                  </div>
                ) : (
                  <svg className="w-full h-10" viewBox="0 0 100 30" fill="none">
                    <path
                      d="M0 15 Q 12 2, 25 15 T 50 15 T 75 15 T 100 15"
                      stroke={demo.stroke}
                      strokeWidth="2"
                    />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Primary Action Button: Analyze or View Results */}
      {analysisStatus === 'completed' && analysisResult && activeAnalysisId && !isProcessing ? (
        <button
          onClick={() => navigate('/analyze')}
          className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
        >
          View Results →
        </button>
      ) : (
        <button
          onClick={handleAnalyzeClick}
          disabled={isProcessing || (!activeFileName && !selectedPreset)}
          className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 ${
            isProcessing || (!activeFileName && !selectedPreset)
              ? 'bg-blue-400 cursor-not-allowed opacity-75'
              : 'bg-[#1677FF] hover:bg-blue-600'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing Signal ({progressData.percentage || 0}%)...
            </>
          ) : (
            <>
              Analyze Signal
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
};
