const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || 'http://127.0.0.1:8000';
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads dir exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Storage setup for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Preserve original filename or clean up
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Helper to list recent files in uploads
function getRecentFiles() {
  if (!fs.existsSync(UPLOADS_DIR)) return [];
  const files = fs.readdirSync(UPLOADS_DIR);
  return files.map(file => {
    const filePath = path.join(UPLOADS_DIR, file);
    const stats = fs.statSync(filePath);
    const ext = path.extname(file).toLowerCase();
    return {
      name: file,
      size: stats.size,
      modified: stats.mtime,
      type: ext === '.iq' ? 'Complex IQ' : 'WAV Audio/RF'
    };
  }).sort((a, b) => b.modified - a.modified);
}

// 1. POST /api/upload
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileStats = fs.statSync(req.file.path);
  res.json({
    message: 'File uploaded successfully',
    file: {
      name: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: fileStats.size,
      type: path.extname(req.file.originalname).toLowerCase() === '.iq' ? 'Complex IQ' : 'WAV Audio/RF'
    }
  });
});

// GET /api/files
router.get('/files', (req, res) => {
  res.json({ files: getRecentFiles() });
});

const DEMO_PRESET_MAP = {
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

function resolveTargetFile(input) {
  if (!input) return null;
  const key = String(input).toLowerCase().trim();
  return DEMO_PRESET_MAP[key] || input;
}

// 2. POST /api/analyze-demo
router.post('/analyze-demo', async (req, res) => {
  const { preset, sampleRate } = req.body;
  const targetFile = resolveTargetFile(preset);
  
  if (!targetFile) {
    return res.status(400).json({ error: 'Valid demo preset (bpsk, qpsk, fsk, qam16, iq) is required' });
  }

  const parsedFs = (sampleRate && parseInt(sampleRate) > 0) ? parseInt(sampleRate) : null;

  try {
    const pyRes = await axios.post(`${PYTHON_ENGINE_URL}/process`, {
      file_path: targetFile,
      sample_rate: parsedFs
    });
    res.json(pyRes.data);
  } catch (err) {
    console.error('Error connecting to Python Engine for demo:', err.message);
    res.status(500).json({
      error: 'Python Signal Processing Engine unavailable for demo signal',
      details: err.response?.data || err.message
    });
  }
});

// 3. POST /api/analyze
router.post('/analyze', async (req, res) => {
  const { fileName, preset, sampleRate } = req.body;
  const targetFile = resolveTargetFile(preset || fileName);

  if (!targetFile) {
    return res.status(400).json({ error: 'fileName or preset is required' });
  }

  const parsedFs = (sampleRate && parseInt(sampleRate) > 0) ? parseInt(sampleRate) : null;

  try {
    const pyRes = await axios.post(`${PYTHON_ENGINE_URL}/process`, {
      file_path: targetFile,
      sample_rate: parsedFs
    });
    res.json(pyRes.data);
  } catch (err) {
    console.error('Error connecting to Python Engine:', err.message);
    res.status(500).json({
      error: 'Python Signal Processing Engine unavailable',
      details: err.response?.data || err.message
    });
  }
});

// 3. GET /api/spectrum/:id
router.get('/spectrum/:id', async (req, res) => {
  try {
    const parsedFs = (req.query.sampleRate && parseInt(req.query.sampleRate) > 0) ? parseInt(req.query.sampleRate) : null;
    const pyRes = await axios.post(`${PYTHON_ENGINE_URL}/spectrum`, {
      file_path: req.params.id,
      sample_rate: parsedFs
    });
    res.json(pyRes.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch spectrum' });
  }
});

// 4. GET /api/waterfall/:id
router.get('/waterfall/:id', async (req, res) => {
  try {
    const parsedFs = (req.query.sampleRate && parseInt(req.query.sampleRate) > 0) ? parseInt(req.query.sampleRate) : null;
    const pyRes = await axios.post(`${PYTHON_ENGINE_URL}/waterfall`, {
      file_path: req.params.id,
      sample_rate: parsedFs
    });
    res.json(pyRes.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch waterfall' });
  }
});

// 5. GET /api/constellation/:id
router.get('/constellation/:id', async (req, res) => {
  try {
    const parsedFs = (req.query.sampleRate && parseInt(req.query.sampleRate) > 0) ? parseInt(req.query.sampleRate) : null;
    const pyRes = await axios.post(`${PYTHON_ENGINE_URL}/constellation`, {
      file_path: req.params.id,
      sample_rate: parsedFs
    });
    res.json(pyRes.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch constellation' });
  }
});

// 6. POST /api/demodulate/:id
router.post('/demodulate/:id', async (req, res) => {
  try {
    const parsedFs = (req.body.sampleRate && parseInt(req.body.sampleRate) > 0) ? parseInt(req.body.sampleRate) : null;
    const pyRes = await axios.post(`${PYTHON_ENGINE_URL}/demodulate`, {
      file_path: req.params.id,
      modulation: req.body.modulation || 'QPSK',
      sample_rate: parsedFs
    });
    res.json(pyRes.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to run demodulation' });
  }
});


// 7. POST /api/deinterleave/:id
router.post('/deinterleave/:id', async (req, res) => {
  try {
    const pyRes = await axios.post(`${PYTHON_ENGINE_URL}/deinterleave`, req.body);
    res.json(pyRes.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to deinterleave bitstream' });
  }
});

// 8. POST /api/fec/:id
router.post('/fec/:id', async (req, res) => {
  try {
    const pyRes = await axios.post(`${PYTHON_ENGINE_URL}/fec`, req.body);
    res.json(pyRes.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to decode FEC' });
  }
});

// 9. POST /api/correlate/:id
router.post('/correlate/:id', async (req, res) => {
  try {
    const pyRes = await axios.post(`${PYTHON_ENGINE_URL}/correlate`, req.body);
    res.json(pyRes.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to correlate bitstream' });
  }
});

// 10. GET /api/report/:id
router.get('/report/:id', async (req, res) => {
  const format = req.query.format || 'json';
  try {
    const pyRes = await axios.get(`${PYTHON_ENGINE_URL}/report/${req.params.id}?format=${format}`, {
      responseType: 'arraybuffer'
    });
    
    let contentType = 'application/json';
    if (format === 'pdf') contentType = 'application/pdf';
    if (format === 'csv') contentType = 'text/csv';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.id}_report.${format}"`);
    res.send(pyRes.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// 11. GET /api/evaluation/ml
router.get('/evaluation/ml', async (req, res) => {
  try {
    const pyRes = await axios.get(`${PYTHON_ENGINE_URL}/api/evaluation/ml`);
    res.json(pyRes.data);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: 'ML evaluation data not found' });
    }
    res.status(500).json({ error: 'Failed to fetch ML evaluation' });
  }
});

// 12. GET /api/evaluation/parameters
router.get('/evaluation/parameters', async (req, res) => {
  try {
    const pyRes = await axios.get(`${PYTHON_ENGINE_URL}/api/evaluation/parameters`);
    res.json(pyRes.data);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: 'Parameter evaluation data not found' });
    }
    res.status(500).json({ error: 'Failed to fetch Parameter evaluation' });
  }
});

module.exports = router;
