import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { socket } from '../services/api';

const SignalContext = createContext();

const LOCAL_STORAGE_KEY = 'waveintel_active_state_v4';

export const SignalProvider = ({ children }) => {
  const currentAnalysisIdRef = useRef(null);

  const [activeAnalysisId, setActiveAnalysisId] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved).activeAnalysisId || null; } catch (e) {}
    }
    return null;
  });

  const [activeFileName, setActiveFileName] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved).activeFileName || null; } catch (e) {}
    }
    return null;
  });

  const [activeFileType, setActiveFileType] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved).activeFileType || null; } catch (e) {}
    }
    return null;
  });

  const [sampleRate, setSampleRate] = useState(null);

  const [analysisResult, setAnalysisResult] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved).analysisResult || null; } catch (e) {}
    }
    return null;
  });

  const [decodeResult, setDecodeResult] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved).decodeResult || null; } catch (e) {}
    }
    return null;
  });

  const [bitStreamResult, setBitStreamResult] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved).bitStreamResult || null; } catch (e) {}
    }
    return null;
  });

  const [analysisStatus, setAnalysisStatus] = useState(() => (analysisResult ? 'completed' : 'idle'));
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressData, setProgressData] = useState({ percentage: 0, stage: '', statusText: '' });
  const [error, setError] = useState(null);

  const [recentAnalyses, setRecentAnalyses] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.recentAnalyses && Array.isArray(parsed.recentAnalyses)) {
          return parsed.recentAnalyses;
        }
      } catch (e) {}
    }
    return [];
  });

  const totalAnalyses = recentAnalyses.length;
  const signalsDetected = recentAnalyses.filter(
    a => a.modulation && a.modulation !== 'Unknown' && a.modulation !== 'N/A'
  ).length;

  const validSnrList = recentAnalyses
    .map(a => (typeof a.snr === 'number' ? a.snr : parseFloat(a.snr)))
    .filter(val => !isNaN(val));

  const avgSnrVal = validSnrList.length > 0
    ? (validSnrList.reduce((acc, curr) => acc + curr, 0) / validSnrList.length).toFixed(1)
    : '--';

  const successfulDecodes = recentAnalyses.filter(a => a.status === 'Completed').length;

  useEffect(() => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        activeAnalysisId,
        activeFileName,
        activeFileType,
        analysisResult,
        decodeResult,
        bitStreamResult,
        recentAnalyses
      })
    );
  }, [activeAnalysisId, activeFileName, activeFileType, analysisResult, decodeResult, bitStreamResult, recentAnalyses]);

  useEffect(() => {
    const handleProgress = (data) => {
      if (data && data.analysisId && currentAnalysisIdRef.current && data.analysisId !== currentAnalysisIdRef.current) {
        return;
      }
      setIsProcessing(true);
      setAnalysisStatus('processing');
      setProgressData(data || { percentage: 0, stage: 'Processing', statusText: '' });
    };

    const handleComplete = (data) => {
      if (data && data.analysisId && currentAnalysisIdRef.current && data.analysisId !== currentAnalysisIdRef.current) {
        return;
      }
      setIsProcessing(false);
      setAnalysisStatus('completed');
      setAnalysisResult(data);
      setDecodeResult(data?.demodulation || null);
      setBitStreamResult(data?.bitstream || null);
      setError(null);
      setProgressData({ percentage: 100, stage: 'Complete', statusText: 'Pipeline complete!' });

      const newId = data?.analysisId || `SIG-${Math.floor(1000 + Math.random() * 9000)}`;
      setActiveAnalysisId(newId);

      const snrVal = data?.parameters?.snr_db !== undefined ? data.parameters.snr_db : 'N/A';
      const modVal = data?.classification?.modulation || 'Unknown';
      const fileVal = data?.metadata?.file_name || activeFileName || 'signal_recording';

      setRecentAnalyses((prev) => [
        {
          id: newId,
          fileName: fileVal,
          modulation: modVal,
          snr: snrVal,
          status: 'Completed',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        },
        ...prev.filter(item => item.fileName !== fileVal)
      ]);
    };

    const handleError = (err) => {
      if (err && err.analysisId && currentAnalysisIdRef.current && err.analysisId !== currentAnalysisIdRef.current) {
        return;
      }
      setIsProcessing(false);
      setAnalysisStatus('error');
      setAnalysisResult(null);
      setDecodeResult(null);
      setBitStreamResult(null);
      const msg = typeof err === 'string'
        ? err
        : (err?.error || err?.message || (typeof err?.detail === 'string' ? err.detail : 'Failed to process signal'));
      setError(msg);
    };

    socket.off('processing_progress', handleProgress);
    socket.off('analysis_complete', handleComplete);
    socket.off('analysis_error', handleError);
    socket.off('processing_error', handleError);

    socket.on('processing_progress', handleProgress);
    socket.on('analysis_complete', handleComplete);
    socket.on('analysis_error', handleError);
    socket.on('processing_error', handleError);

    return () => {
      socket.off('processing_progress', handleProgress);
      socket.off('analysis_complete', handleComplete);
      socket.off('analysis_error', handleError);
      socket.off('processing_error', handleError);
    };
  }, [activeFileName]);

  const triggerAnalysis = (fileName = activeFileName, sr = sampleRate, preset = null) => {
    const targetFile = fileName || (preset ? `sample_${preset}.wav` : null);
    if (!targetFile && !preset) return;

    const newAnalysisId = `analysis_${Date.now()}`;
    currentAnalysisIdRef.current = newAnalysisId;

    setIsProcessing(true);
    setAnalysisStatus('processing');
    setProgressData({ percentage: 0, stage: 'Loading', statusText: 'Initializing signal analysis...' });
    setError(null);
    setAnalysisResult(null);
    setDecodeResult(null);
    setBitStreamResult(null);

    if (targetFile) setActiveFileName(targetFile);
    socket.emit('start_analysis', {
      fileName: targetFile,
      preset,
      sampleRate: sr,
      analysisId: newAnalysisId
    });
  };

  const dismissProgressOverlay = () => {
    setIsProcessing(false);
    setProgressData({ percentage: 0, stage: '', statusText: '' });
  };

  const resetAnalysis = () => {
    setAnalysisStatus('idle');
    setAnalysisResult(null);
    setDecodeResult(null);
    setBitStreamResult(null);
    setActiveAnalysisId(null);
    setIsProcessing(false);
    setProgressData({ percentage: 0, stage: '', statusText: '' });
    setError(null);
  };

  const loadStoredAnalysis = (analysisItem) => {
    setActiveAnalysisId(analysisItem.id);
    setActiveFileName(analysisItem.fileName);
    triggerAnalysis(analysisItem.fileName, sampleRate);
  };

  return (
    <SignalContext.Provider
      value={{
        activeAnalysisId,
        activeFileName,
        setActiveFileName,
        activeFileType,
        setActiveFileType,
        sampleRate,
        setSampleRate,
        analysisResult,
        setAnalysisResult,
        decodeResult,
        setDecodeResult,
        bitStreamResult,
        setBitStreamResult,
        analysisStatus,
        isProcessing,
        progressData,
        error,
        recentAnalyses,
        totalAnalyses,
        signalsDetected,
        avgSnrVal,
        successfulDecodes,
        triggerAnalysis,
        loadStoredAnalysis,
        dismissProgressOverlay,
        resetAnalysis
      }}
    >
      {children}
    </SignalContext.Provider>
  );
};

export const useSignal = () => useContext(SignalContext);



