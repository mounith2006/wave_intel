# WaveIntel — Production Deployment Guide

This document contains step-by-step instructions for deploying WaveIntel using **Vercel** (Frontend) and **Render** (Node Backend + Python DSP Engine).

---

## Target Architecture

```
                  ┌────────────────────────────────────────┐
                  │          Vercel Frontend               │
                  │          (React + Vite)                │
                  └───────────────────┬────────────────────┘
                                      │
                                      │ HTTPS + Socket.io
                                      ▼
                  ┌────────────────────────────────────────┐
                  │       Render Node Backend Service      │
                  │       (Node.js + Express + Socket.io)  │
                  └───────────────────┬────────────────────┘
                                      │
                                      │ HTTP /process
                                      ▼
                  ┌────────────────────────────────────────┐
                  │       Render Python DSP Web Service    │
                  │       (Python + FastAPI + PyWavelets)  │
                  └────────────────────────────────────────┘
```

---

## 1. Frontend Deployment (Vercel)

### Deployment Steps
1. Push your repository to GitHub.
2. In Vercel Dashboard, select **Add New Project** and import the GitHub repository.
3. Configure project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables in Vercel:
   ```env
   VITE_API_BASE_URL=https://waveintel-backend.onrender.com/api
   VITE_SOCKET_URL=https://waveintel-backend.onrender.com
   ```
5. Click **Deploy**.

---

## 2. Python DSP Engine Web Service (Render)

### Option A: Render Blueprint (Automatic)
Using `render.yaml` at the root of the repository, Render automatically provisions both Python and Node services.

### Option B: Manual Configuration
1. In Render Dashboard, click **New +** $\rightarrow$ **Web Service**.
2. Connect your repository.
3. Configure settings:
   - **Name**: `waveintel-dsp`
   - **Environment**: Python
   - **Region**: Oregon or Ohio
   - **Branch**: `main`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn signal_engine.main:app --host 0.0.0.0 --port $PORT`
4. Environment Variables:
   ```env
   PORT=10000
   ```
5. Verify health check at `https://<waveintel-dsp-url>/health` $\rightarrow$ `{"status": "ok"}`.

---

## 3. Node.js Backend & Socket.io Web Service (Render)

### Configuration Settings
1. In Render Dashboard, click **New +** $\rightarrow$ **Web Service**.
2. Connect your repository.
3. Configure settings:
   - **Name**: `waveintel-backend`
   - **Environment**: Node
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Environment Variables:
   ```env
   PORT=10000
   PYTHON_ENGINE_URL=https://waveintel-dsp.onrender.com
   FRONTEND_URL=https://your-app.vercel.app
   ```
5. Verify health check at `https://<waveintel-backend-url>/health` $\rightarrow$ `{"status": "ok"}`.

---

## 4. Local Full-Stack & Docker Testing

### Run Services Locally without Docker
```bash
# Terminal 1: Python DSP Engine
python -m uvicorn signal_engine.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Node Backend
cd backend
npm start

# Terminal 3: React Frontend
cd frontend
npm run dev
```

### Run using Docker Compose
```bash
docker-compose up --build
```
- Frontend: `http://localhost`
- Node Backend: `http://localhost:5000`
- Python Engine: `http://localhost:8000`

---

## 5. Storage & Production Notes

> [!NOTE]
> Render free-tier web services use ephemeral local filesystems. Uploaded files in `uploads/`, `processed/`, and `reports/` are saved locally for test sessions. For production durability across service redeploys, attach Render Persistent Disks or object storage.
