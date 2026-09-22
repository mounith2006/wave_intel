# AI Assisted Signal Analysis and Demodulation Platform

A production-quality full-stack web application designed with a futuristic defense/RF engineering dashboard UI. The platform analyzes uploaded `.IQ` and `.WAV` radio signal files, extracts carrier/spectral parameters, visualizes power spectral density (PSD) & waterfall heatmaps, classifies modulation schemes, demodulates supported signals, performs de-interleaving, decodes Forward Error Correction (FEC), and correlates bitstreams.

---

## Architecture Overview

```
                          ┌───────────────────────────┐
                          │   React 18 + Vite UI      │
                          │   Plotly.js + Tailwind    │
                          └─────────────┬─────────────┘
                                        │ (HTTP REST / Socket.io Progress)
                                        ▼
                          ┌───────────────────────────┐
                          │   Node.js + Express Server│
                          │   (Socket.io Progress Hub)│
                          └─────────────┬─────────────┘
                                        │ (HTTP Requests)
                                        ▼
                          ┌───────────────────────────┐
                          │   Python FastAPI Engine   │
                          │   NumPy / SciPy / Scikit  │
                          └───────────────────────────┘
```

---

## System Directory Structure

```
signal-analysis-platform/
├── frontend/             # React + Vite + Tailwind CSS + Plotly.js + Lucide Icons
│   ├── src/
│   │   ├── components/   # Header, Sidebar, ProcessingOverlay
│   │   ├── context/      # SignalContext telemetry store
│   │   ├── pages/        # 10 Sidebar Navigation Modules
│   │   └── services/     # Axios & Socket.io API client
│   └── package.json
├── backend/              # Node.js + Express + Socket.io Server
│   ├── routes/           # REST API router
│   ├── server.js         # Socket.io progress pipeline & HTTP listener
│   └── package.json
├── signal_engine/        # Python 3 DSP Engine & FastAPI Service
│   ├── loader.py         # WAV & complex raw IQ file parser
│   ├── spectrum.py       # FFT, PSD, peak frequency, occupied bandwidth
│   ├── waterfall.py      # STFT spectrogram heatmap computation
│   ├── constellation.py  # IQ scatter plot, carrier recovery, EVM, centroids
│   ├── snr.py            # Noise floor, signal power & SNR calculation
│   ├── classifier.py     # Statistical heuristics + Random Forest classifier
│   ├── demodulator.py    # BPSK, QPSK, 2FSK, 4FSK & 16-QAM demodulators
│   ├── interleaver.py    # Block, Conv, Diagonal, PRNG de-interleavers
│   ├── fec_decoder.py    # Viterbi, Reed-Solomon & LDPC decoders
│   ├── bitstream.py      # Preamble correlation, header/payload & CRC-32
│   ├── sample_generator.py # Reproducible synthetic signal generator
│   ├── report_generator.py # PDF, JSON & CSV report exporter
│   ├── test_engine.py    # Automated test suite
│   ├── main.py           # FastAPI application
│   └── requirements.txt
├── uploads/              # Raw signal uploads (.WAV, .IQ)
├── processed/            # Extracted spectral data cache
├── reports/              # Generated PDF/JSON/CSV analysis reports
├── docker/               # Dockerfiles for Frontend, Backend, Signal Engine
├── docker-compose.yml    # Multi-container orchestration
└── README.md
```

---

## 10 Sidebar Modules

1. **Dashboard (`/`)**: System telemetry overview, metrics cards, active file status, 4 interactive mini visualization graphs.
2. **Signal Input (`/upload`)**: Drag-and-drop file uploader for `.WAV` & `.IQ` captures + quick-load synthetic demonstration buttons.
3. **Signal Overview (`/overview`)**: Parameter breakdown cards (sampling frequency, center frequency, occupied bandwidth, SNR, signal power, noise floor) + mini waveform.
4. **Spectrum Analysis (`/spectrum`)**: Plotly FFT spectrum, Power Spectral Density (PSD in dB), peak frequency markers, occupied bandwidth container.
5. **Waterfall Analysis (`/waterfall`)**: Time vs Frequency Short-Time Fourier Transform (STFT) heatmap matrix with customizable color scales.
6. **Constellation Analysis (`/constellation`)**: Polar IQ scatter plot, cluster centroid estimation via K-Means, and Error Vector Magnitude (EVM) calculation.
7. **Demodulation (`/demodulation`)**: Demodulate FSK, BPSK, QPSK, and 16-QAM signals into symbol sequences and bitstreams.
8. **De-Interleaving & FEC (`/deinterleave-fec`)**: Dual-tab module for Block/Convolutional/Diagonal/PRNG de-interleaving and Viterbi/Reed-Solomon/LDPC FEC decoding with BER metrics.
9. **Bit Stream Analysis (`/bitstream`)**: Binary & Hex inspector, preamble correlation search, color-coded header/payload separation, CRC-32 validation.
10. **Reports (`/reports`)**: Export downloadable PDF, JSON, and CSV telemetry reports.

---

## Getting Started & Running Locally

### 1. Generate Demonstration Sample Signals

```bash
cd signal-analysis-platform
python signal_engine/sample_generator.py
```

Generates `sample_bpsk.wav`, `sample_qpsk.wav`, `sample_fsk.wav`, `sample_qam16.wav`, and `sample_iq.iq` in `uploads/`.

### 2. Run Python Signal Engine (Port 8000)

```bash
cd signal_engine
pip install -r requirements.txt
python main.py
```

### 3. Run Node.js Backend Server (Port 5000)

```bash
cd backend
npm install
npm start
```

### 4. Run React Frontend (Port 5173)

```bash
cd frontend
npm install
npm run dev
```

---

## Running with Docker Compose

```bash
docker-compose up --build
```

Access the frontend at `http://localhost:80`, backend at `http://localhost:5000`, and Python FastAPI engine at `http://localhost:8000`.

---

## Automated Testing

Run the automated Python DSP test suite:

```bash
python signal_engine/test_engine.py
```

Tests file parsing, FFT calculation, SNR estimation, constellation generation, modulation classification, and bit recovery across all synthetic sample files.
