const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;
const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || 'http://127.0.0.1:8000';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register API routes
app.use('/api', apiRoutes);

// Serve uploads statically if needed
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const DEMO_PRESETS = {
  'bpsk': 'sample_bpsk.wav',
  'sample_bpsk.wav': 'sample_bpsk.wav',
  'qpsk': 'sample_qpsk.wav',
  'sample_qpsk.wav': 'sample_qpsk.wav',
  'fsk': 'sample_fsk.wav',
  'sample_fsk.wav': 'sample_fsk.wav',
  'qam16': 'sample_qam16.wav',
  '16-qam': 'sample_qam16.wav',
  '16qam': 'sample_qam16.wav',
  'sample_qam16.wav': 'sample_qam16.wav',
  'iq': 'sample_iq.iq',
  'sample_iq.iq': 'sample_iq.iq'
};

function resolveDemoFile(input) {
  if (!input) return 'sample_qpsk.wav';
  const lower = String(input).toLowerCase().trim();
  return DEMO_PRESETS[lower] || input;
}

// Socket.io Real-Time Signal Processing Pipeline
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on('start_analysis', async (data) => {
    const { fileName, preset, sampleRate, analysisId } = data || {};
    const targetFile = resolveDemoFile(preset || fileName);
    const currAnalysisId = analysisId || `analysis_${Date.now()}`;
    const parsedFs = (sampleRate && parseInt(sampleRate) > 0) ? parseInt(sampleRate) : null;
    console.log(`[Analysis] START file=${targetFile} analysisId=${currAnalysisId} fs=${parsedFs}`);

    const emitProgress = (percentage, stage, statusText) => {
      socket.emit('processing_progress', {
        analysisId: currAnalysisId,
        percentage,
        stage,
        statusText
      });
    };

    try {
      // 5% Loading
      emitProgress(5, 'Loading', 'Loading signal file from storage...');
      console.log('[Analysis] SIGNAL LOADED');

      // 15% Preprocessing
      emitProgress(15, 'Preprocessing', 'Filtering, noise reduction & normalization...');
      console.log('[Analysis] PREPROCESSING');

      // 30% Feature Extraction
      emitProgress(30, 'Feature Extraction', 'Extracting statistical moments, cumulants & phase variance...');
      console.log('[Analysis] FEATURE EXTRACTION');

      // 45% Spectrum Analysis
      emitProgress(45, 'Spectrum Analysis', 'Computing FFT, PSD, occupied bandwidth & waterfall matrix...');
      console.log('[Analysis] SIGNAL ANALYSIS');

      // 60% Modulation Detection
      emitProgress(60, 'Modulation Detection', 'Running hybrid DSP rules and ML classifier...');
      console.log('[Analysis] MODULATION DETECTION');

      // Execute Python engine process request with resolved file
      const pyRes = await axios.post(`${PYTHON_ENGINE_URL}/process`, {
        file_path: targetFile,
        sample_rate: parsedFs
      });

      // 75% Demodulation & Visualization
      emitProgress(75, 'Demodulation', 'Demodulating baseband symbols & bitstream recovery...');
      console.log('[Analysis] VISUALIZATION');

      // 85% De-interleaving
      emitProgress(85, 'De-interleaving', 'Running bit de-interleaving pipeline...');

      // 95% FEC
      emitProgress(95, 'FEC', 'Decoding Viterbi/Reed-Solomon FEC & calculating BER...');

      // 100% Complete
      emitProgress(100, 'Complete', 'Signal processing pipeline complete!');
      console.log('[Analysis] COMPLETE');

      socket.emit('analysis_complete', {
        analysisId: currAnalysisId,
        ...pyRes.data
      });

    } catch (err) {
      const errDetail = err.response?.data?.detail;
      let stageName = 'iq_validation';
      let errorMsg = 'Failed to process signal';

      if (typeof errDetail === 'object' && errDetail !== null) {
        stageName = errDetail.stage || stageName;
        errorMsg = errDetail.error || errorMsg;
      } else if (typeof errDetail === 'string') {
        errorMsg = errDetail;
      } else if (err.message) {
        errorMsg = err.message;
      }

      console.error(`[Analysis] ERROR stage=${stageName} analysisId=${currAnalysisId} message=${errorMsg}`);

      const errorPayload = {
        analysisId: currAnalysisId,
        success: false,
        stage: stageName,
        error: errorMsg,
        message: errorMsg
      };

      socket.emit('analysis_error', errorPayload);
      socket.emit('processing_error', errorPayload);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});


server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Node.js Backend Server running on http://localhost:${PORT}`);
  console.log(`Connected to Python Signal Engine at: ${PYTHON_ENGINE_URL}`);
  console.log(`==================================================`);
});
