import os
import sys
import json
import numpy as np
from math import sqrt
sys.path.append('c:\\2024039393\\wave\\wave_intel\\signal-analysis-platform')

from signal_engine.sample_generator import generate_bpsk, generate_qpsk, generate_fsk, generate_qam16
from signal_engine.snr import estimate_signal_parameters
from signal_engine.classifier import classify_modulation

def calculate_metrics(y_true, y_pred):
    valid_pairs = [(t, p) for t, p in zip(y_true, y_pred) if t is not None and p is not None]
    if not valid_pairs:
        return {"mae": "N/A", "rmse": "N/A", "mean_pct_error": "N/A"}
    
    t_arr = np.array([p[0] for p in valid_pairs])
    p_arr = np.array([p[1] for p in valid_pairs])
    
    mae = np.mean(np.abs(t_arr - p_arr))
    rmse = sqrt(np.mean((t_arr - p_arr)**2))
    
    with np.errstate(divide='ignore', invalid='ignore'):
        pct_errors = np.abs(t_arr - p_arr) / np.abs(t_arr)
        pct_errors = pct_errors[np.isfinite(pct_errors)]
        mean_pct_error = np.mean(pct_errors) * 100 if len(pct_errors) > 0 else "N/A"
        
    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "mean_pct_error": round(mean_pct_error, 2) if isinstance(mean_pct_error, float) else mean_pct_error,
        "samples": len(valid_pairs)
    }

def run_evaluation():
    print("Generating synthetic validation dataset with known ground truth...")
    
    results = []
    ground_truth = []
    predictions = []
    
    configs = [
        {"type": "BPSK", "gen": generate_bpsk, "kwargs": {"fs": 48000, "fc": 6000, "rs": 1000, "snr_db": 20}, "bps": 1},
        {"type": "QPSK", "gen": generate_qpsk, "kwargs": {"fs": 48000, "fc": 8000, "rs": 1000, "snr_db": 22}, "bps": 2},
        {"type": "FSK", "gen": generate_fsk, "kwargs": {"fs": 48000, "fc": 5000, "rs": 1000, "f_dev": 2500, "snr_db": 20, "num_levels": 2}, "bps": 1},
        {"type": "16QAM", "gen": generate_qam16, "kwargs": {"fs": 48000, "fc": 10000, "rs": 1000, "snr_db": 24}, "bps": 4},
        
        {"type": "BPSK", "gen": generate_bpsk, "kwargs": {"fs": 48000, "fc": 12000, "rs": 2000, "snr_db": 10}, "bps": 1},
        {"type": "QPSK", "gen": generate_qpsk, "kwargs": {"fs": 48000, "fc": 15000, "rs": 2500, "snr_db": 15}, "bps": 2},
        {"type": "FSK", "gen": generate_fsk, "kwargs": {"fs": 48000, "fc": 8000, "rs": 500, "f_dev": 1500, "snr_db": 12, "num_levels": 2}, "bps": 1},
        {"type": "16QAM", "gen": generate_qam16, "kwargs": {"fs": 48000, "fc": 5000, "rs": 3000, "snr_db": 18}, "bps": 4},
    ]
    
    for cfg in configs:
        iq_noisy, real_waveform, bits, fs = cfg["gen"](**cfg["kwargs"])
        params = estimate_signal_parameters(iq_noisy, fs)
        
        # Calculate Data Rate
        classification = classify_modulation(iq_noisy, fs)
        mod = classification.get("modulation", "")
        bps_map = {"BPSK": 1, "QPSK": 2, "8PSK": 3, "16QAM": 4, "64QAM": 6, "PAM4": 2, "QAM16": 4, "QAM64": 6, "2FSK": 1}
        
        if params["symbol_rate_baud"] is not None and mod in bps_map:
            params["data_rate_bps"] = params["symbol_rate_baud"] * bps_map[mod]
            
        gt = {
            "sampling_frequency_hz": cfg["kwargs"]["fs"],
            "center_frequency_hz": cfg["kwargs"]["fc"],
            "symbol_rate_baud": cfg["kwargs"]["rs"],
            "snr_db": cfg["kwargs"]["snr_db"],
            "data_rate_bps": cfg["kwargs"]["rs"] * cfg["bps"]
        }
        
        ground_truth.append(gt)
        predictions.append(params)
    
    # Calculate metrics
    param_keys = ["sampling_frequency_hz", "center_frequency_hz", "symbol_rate_baud", "snr_db", "data_rate_bps"]
    metrics = {}
    
    for key in param_keys:
        y_true = [gt[key] for gt in ground_truth]
        y_pred = [p.get(key) for p in predictions]
        metrics[key] = calculate_metrics(y_true, y_pred)
        metrics[key]["ground_truth"] = "Available"
        
    metrics["bandwidth_hz"] = {
        "mae": "N/A", "rmse": "N/A", "mean_pct_error": "N/A", "samples": len(configs), "ground_truth": "Unavailable"
    }
    
    os.makedirs("ml/results", exist_ok=True)
    with open("ml/results/parameter_metrics.json", "w") as f:
        json.dump(metrics, f, indent=4)
        
    with open("ml/results/parameter_accuracy_report.txt", "w") as f:
        f.write("Parameter | Samples | MAE | RMSE | Mean % Error | Ground Truth\n")
        f.write("-" * 80 + "\n")
        for k, v in metrics.items():
            name = k.replace("_", " ").title()
            samples = v["samples"]
            mae = v["mae"]
            rmse = v["rmse"]
            pct = v["mean_pct_error"]
            gt = v["ground_truth"]
            f.write(f"{name:22} | {samples:7} | {str(mae):7} | {str(rmse):7} | {str(pct):12} | {gt}\n")
            
    print("Parameter evaluation complete.")

if __name__ == "__main__":
    run_evaluation()
