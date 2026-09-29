import os
import json
from fastapi import FastAPI, HTTPException, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List

from .loader import load_signal_file, SignalLoadError
from .spectrum import compute_waveform_preview, compute_spectrum
from .waterfall import compute_waterfall
from .constellation import compute_constellation
from .snr import estimate_signal_parameters
from .classifier import classify_modulation
from .demodulator import demodulate_signal
from .bitstream import analyze_bitstream
from .interleaver import deinterleave_bitstream
from .fec_decoder import decode_fec
from .report_generator import (
    generate_json_report,
    generate_csv_report,
    generate_pdf_report,
)

app = FastAPI(
    title="AI Assisted Signal Analysis Engine",
    description="Python DSP and ML Modulation Engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared directory paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

class ProcessRequest(BaseModel):
    file_path: str
    sample_rate: Optional[int] = None

class SpectrumRequest(BaseModel):
    file_path: str
    sample_rate: Optional[int] = None
    n_fft: Optional[int] = 4096

class WaterfallRequest(BaseModel):
    file_path: str
    sample_rate: Optional[int] = None

class ConstellationRequest(BaseModel):
    file_path: str
    sample_rate: Optional[int] = None
    target_clusters: Optional[int] = 4

class DemodulateRequest(BaseModel):
    file_path: str
    sample_rate: Optional[int] = None
    modulation: Optional[str] = "QPSK"

class DeinterleaveRequest(BaseModel):
    bit_string: str
    method: Optional[str] = "Block"
    rows: Optional[int] = 8
    cols: Optional[int] = 16
    depth: Optional[int] = 4
    seed: Optional[int] = 42

class FECRequest(BaseModel):
    bit_string: str
    fec_scheme: Optional[str] = "Convolutional + Viterbi"

class CorrelateRequest(BaseModel):
    bit_string: str
    sync_pattern: Optional[str] = "1010101010110011"

@app.get("/")
@app.get("/health")
def health_check():
    return {"status": "ok", "engine": "Python DSP & ML Signal Processing Engine"}

def resolve_file(file_path_str: str) -> str:
    """Helper to resolve file path in uploads if given relative name or preset."""
    if not file_path_str:
        file_path_str = "sample_qpsk.wav"

    if os.path.isabs(file_path_str) and os.path.exists(file_path_str):
        return file_path_str
    
    # Check exact filename in uploads
    base_name = os.path.basename(file_path_str)
    candidate = os.path.join(UPLOADS_DIR, base_name)
    if os.path.exists(candidate):
        return candidate
    
    # Check case-insensitive or extension-stripped match in uploads
    if os.path.exists(UPLOADS_DIR):
        for fname in os.listdir(UPLOADS_DIR):
            if fname.lower() == base_name.lower() or os.path.splitext(fname)[0].lower() == os.path.splitext(base_name.lower())[0]:
                return os.path.join(UPLOADS_DIR, fname)

    # Check preset key mapping
    preset_map = {
        'bpsk': 'sample_bpsk.wav',
        'qpsk': 'sample_qpsk.wav',
        'fsk': 'sample_fsk.wav',
        'qam16': 'sample_qam16.wav',
        '16-qam': 'sample_qam16.wav',
        '16qam': 'sample_qam16.wav',
        'iq': 'sample_iq.iq'
    }
    lower = file_path_str.lower().strip()
    if lower in preset_map:
        preset_candidate = os.path.join(UPLOADS_DIR, preset_map[lower])
        if os.path.exists(preset_candidate):
            return preset_candidate
    
    raise HTTPException(status_code=404, detail=f"Signal file not found: '{file_path_str}'")

@app.post("/process")
def process_signal(req: ProcessRequest):
    stage = "file_loading"
    try:
        file_full = resolve_file(req.file_path)
        sig_data, fs, metadata = load_signal_file(file_full, default_fs=req.sample_rate)
        
        num_samples = len(sig_data)
        import numpy as np
        mag = np.abs(sig_data) if num_samples > 0 else np.array([0.0])
        mag_mean = float(np.mean(mag)) if num_samples > 0 else 0.0
        mag_max = float(np.max(mag)) if num_samples > 0 else 0.0
        is_finite = bool(np.isfinite(sig_data).all())

        print(f"[DSP] samples={num_samples}")
        print(f"[DSP] sample_rate={fs}")
        print(f"[DSP] magnitude_mean={mag_mean}")
        print(f"[DSP] magnitude_max={mag_max}")
        print(f"[DSP] finite={str(is_finite).lower()}")
        
        # 1. Waveform Preview
        stage = "waveform_preview"
        waveform = compute_waveform_preview(sig_data)
        
        # 2. Spectrum & PSD
        stage = "spectrum_analysis"
        spectrum = compute_spectrum(sig_data, fs)
        
        # 3. Waterfall Spectrogram
        stage = "waterfall_generation"
        waterfall = compute_waterfall(sig_data, fs)
        
        # 4. Constellation
        stage = "constellation_analysis"
        constellation = compute_constellation(sig_data, fs, fc=spectrum["peak_frequency"])
        
        # 5. Parameters & SNR
        stage = "snr_estimation"
        params = estimate_signal_parameters(sig_data, fs)
        
        # 6. Modulation Classification
        stage = "modulation_detection"
        classification = classify_modulation(sig_data, fs)

        # Calculate Data Rate if possible
        mod = classification.get("modulation", "")
        bps_map = {"BPSK": 1, "QPSK": 2, "8PSK": 3, "16QAM": 4, "64QAM": 6, "PAM4": 2, "QAM16": 4, "QAM64": 6}
        if params.get("symbol_rate_baud") is not None and mod in bps_map:
            params["data_rate_bps"] = params["symbol_rate_baud"] * bps_map[mod]
        
        # 7. Demodulation
        stage = "demodulation"
        demod = demodulate_signal(sig_data, fs, target_modulation=classification["modulation"], fc=params.get("peak_frequency", 0.0))
        
        # 8. Bitstream Correlation
        stage = "bitstream_analysis"
        bit_analysis = analyze_bitstream(demod["bits"])
        
        # 9. De-interleaving default
        stage = "deinterleaving"
        deinterleaved = deinterleave_bitstream(demod["bits"])
        
        # 10. FEC decoding default
        stage = "fec_decoding"
        fec_res = decode_fec(deinterleaved["restored_bits"])
        
        stage = "response_validation"
        if (len(spectrum.get("freqs", [])) == 0 or 
            len(spectrum.get("psd_db", [])) == 0 or
            len(constellation.get("i", [])) == 0 or
            len(constellation.get("q", [])) == 0 or
            len(waterfall.get("z_matrix", [])) <= 1 or
            len(waterfall.get("z_matrix", [[]])[0]) <= 1):
            raise HTTPException(
                status_code=422,
                detail={"success": False, "stage": "response_validation", "error": "Validation failed: Empty or invalid DSP response arrays"}
            )

        print(f"[Analysis] loaded samples={num_samples}")
        print(f"[Analysis] sample_rate={fs}")
        print(f"[Analysis] signal magnitude mean={mag_mean}")
        print(f"[Analysis] signal magnitude max={mag_max}")
        print(f"[Analysis] spectrum points={len(spectrum.get('freqs', []))}")
        print(f"[Analysis] waterfall shape=({len(waterfall.get('z_matrix', []))}, {len(waterfall.get('z_matrix', [[]])[0])})")
        print(f"[Analysis] constellation points={len(constellation.get('i', []))}")
        print(f"[Analysis] modulation={classification.get('modulation')}")
        print(f"[Analysis] snr={params.get('snr_db')}")
        print(f"[Analysis] COMPLETE")

        full_result = {
            "success": True,
            "metadata": metadata,
            "waveform": waveform,
            "spectrum": spectrum,
            "waterfall": waterfall,
            "constellation": constellation,
            "parameters": params,
            "classification": classification,
            "demodulation": demod,
            "bitstream": bit_analysis,
            "deinterleaving": deinterleaved,
            "fec": fec_res
        }
        
        # Cache processed result
        cache_path = os.path.join(PROCESSED_DIR, f"{metadata['file_name']}.json")
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(full_result, f)
            
        return full_result

    except SignalLoadError as err:
        print(f"[Analysis] SignalLoadError stage={err.stage} error={err.message}")
        raise HTTPException(
            status_code=422,
            detail={"success": False, "stage": err.stage, "error": err.message}
        )
    except HTTPException:
        raise
    except Exception as err:
        import traceback
        print(f"[Analysis] ERROR stage={stage} message={str(err)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail={"success": False, "error": str(err), "stage": stage}
        )


@app.post("/spectrum")
def get_spectrum(req: SpectrumRequest):
    file_full = resolve_file(req.file_path)
    sig_data, fs, _ = load_signal_file(file_full, default_fs=req.sample_rate)
    return compute_spectrum(sig_data, fs, n_fft=req.n_fft)

@app.post("/waterfall")
def get_waterfall(req: WaterfallRequest):
    file_full = resolve_file(req.file_path)
    sig_data, fs, _ = load_signal_file(file_full, default_fs=req.sample_rate)
    return compute_waterfall(sig_data, fs)

@app.post("/constellation")
def get_constellation(req: ConstellationRequest):
    file_full = resolve_file(req.file_path)
    sig_data, fs, _ = load_signal_file(file_full, default_fs=req.sample_rate)
    return compute_constellation(sig_data, fs, target_clusters=req.target_clusters)

@app.post("/demodulate")
def run_demodulate(req: DemodulateRequest):
    file_full = resolve_file(req.file_path)
    sig_data, fs, _ = load_signal_file(file_full, default_fs=req.sample_rate)
    return demodulate_signal(sig_data, fs, target_modulation=req.modulation)

@app.post("/deinterleave")
def run_deinterleave(req: DeinterleaveRequest):
    return deinterleave_bitstream(
        req.bit_string, method=req.method, rows=req.rows, cols=req.cols, depth=req.depth, seed=req.seed
    )

@app.post("/fec")
def run_fec(req: FECRequest):
    return decode_fec(req.bit_string, fec_scheme=req.fec_scheme)

@app.post("/correlate")
def run_correlate(req: CorrelateRequest):
    return analyze_bitstream(req.bit_string, sync_pattern=req.sync_pattern)

@app.get("/api/evaluation/ml")
def get_ml_evaluation():
    try:
        metrics_path = os.path.join(BASE_DIR, "ml", "results", "final_metrics.json")
        if os.path.exists(metrics_path):
            with open(metrics_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return JSONResponse(status_code=404, content={"error": "final_metrics.json not found"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/evaluation/parameters")
def get_param_evaluation():
    try:
        metrics_path = os.path.join(BASE_DIR, "ml", "results", "parameter_metrics.json")
        if os.path.exists(metrics_path):
            with open(metrics_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return JSONResponse(status_code=404, content={"error": "parameter_metrics.json not found"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/report/{file_name}")
def download_report(file_name: str, format: str = Query("json")):
    """Generates and returns downloadable PDF, JSON, or CSV report for file."""
    cache_path = os.path.join(PROCESSED_DIR, f"{file_name}.json")
    if not os.path.exists(cache_path):
        # Trigger processing if not cached
        file_full = resolve_file(file_name)
        process_signal(ProcessRequest(file_path=file_full))
        
    with open(cache_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    clean_base = os.path.splitext(file_name)[0]
    
    if format == "csv":
        out_path = os.path.join(REPORTS_DIR, f"{clean_base}_report.csv")
        generate_csv_report(data, out_path)
        return FileResponse(out_path, media_type="text/csv", filename=f"{clean_base}_report.csv")
    elif format == "pdf":
        out_path = os.path.join(REPORTS_DIR, f"{clean_base}_report.pdf")
        res_path = generate_pdf_report(data, out_path)
        media_type = "application/pdf" if res_path.endswith(".pdf") else "text/plain"
        return FileResponse(res_path, media_type=media_type, filename=os.path.basename(res_path))
    else:
        out_path = os.path.join(REPORTS_DIR, f"{clean_base}_report.json")
        generate_json_report(data, out_path)
        return FileResponse(out_path, media_type="application/json", filename=f"{clean_base}_report.json")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "signal_engine.main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )
