import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnectionAttempts: 5
});

export const api = {
  uploadFile: async (formData) => {
    const res = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  getFiles: async () => {
    const res = await axios.get(`${API_BASE_URL}/files`);
    return res.data;
  },

  analyzeSignal: async (fileName, sampleRate = 48000) => {
    const res = await axios.post(`${API_BASE_URL}/analyze`, { fileName, sampleRate });
    return res.data;
  },

  analyzeDemo: async (preset, sampleRate = 48000) => {
    const res = await axios.post(`${API_BASE_URL}/analyze-demo`, { preset, sampleRate });
    return res.data;
  },

  getSpectrum: async (id, sampleRate = 48000) => {
    const res = await axios.get(`${API_BASE_URL}/spectrum/${id}?sampleRate=${sampleRate}`);
    return res.data;
  },

  getWaterfall: async (id, sampleRate = 48000) => {
    const res = await axios.get(`${API_BASE_URL}/waterfall/${id}?sampleRate=${sampleRate}`);
    return res.data;
  },

  getConstellation: async (id, sampleRate = 48000) => {
    const res = await axios.get(`${API_BASE_URL}/constellation/${id}?sampleRate=${sampleRate}`);
    return res.data;
  },

  runDemodulation: async (id, modulation, sampleRate = 48000) => {
    const res = await axios.post(`${API_BASE_URL}/demodulate/${id}`, { modulation, sampleRate });
    return res.data;
  },

  runDeinterleave: async (id, payload) => {
    const res = await axios.post(`${API_BASE_URL}/deinterleave/${id}`, payload);
    return res.data;
  },

  runFEC: async (id, payload) => {
    const res = await axios.post(`${API_BASE_URL}/fec/${id}`, payload);
    return res.data;
  },

  runCorrelate: async (id, payload) => {
    const res = await axios.post(`${API_BASE_URL}/correlate/${id}`, payload);
    return res.data;
  },

  getReportUrl: (id, format = 'json') => {
    return `${API_BASE_URL}/report/${id}?format=${format}`;
  },

  getMLEvaluation: async () => {
    const res = await axios.get(`${API_BASE_URL}/evaluation/ml`);
    return res.data;
  },

  getParamEvaluation: async () => {
    const res = await axios.get(`${API_BASE_URL}/evaluation/parameters`);
    return res.data;
  }
};
