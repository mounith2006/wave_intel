import sys
import numpy as np
import os
sys.path.append('c:\\2024039393\\wave\\wave_intel\\signal-analysis-platform')

from signal_engine.loader import load_signal_file
from signal_engine.main import process_signal, ProcessRequest

print("Testing various input types...")
uploads_dir = 'c:\\2024039393\\wave\\wave_intel\\signal-analysis-platform\\uploads'

tests = [
    {"name": "WAV Input", "file": "sample_qpsk.wav", "sr": None},
    {"name": "IQ Input (no SR)", "file": "sample_iq.iq", "sr": None},
    {"name": "IQ Input (with SR)", "file": "sample_iq.iq", "sr": 2000000},
    {"name": "Synthetic FSK WAV", "file": "sample_fsk.wav", "sr": None}
]

for t in tests:
    print(f"\n--- Testing {t['name']} ---")
    try:
        req = ProcessRequest(file_path=os.path.join(uploads_dir, t['file']), sample_rate=t['sr'])
        res = process_signal(req)
        
        p = res["parameters"]
        print(f"Modulation: {res['classification']['modulation']}")
        print(f"Sampling Frequency: {p.get('sampling_frequency_hz')} ({p.get('sampling_frequency_source')})")
        print(f"Center Frequency: {p.get('center_frequency_hz')} (Hz) | {p.get('center_frequency_normalized')} (Norm)")
        print(f"Bandwidth: {p.get('bandwidth_hz')} (Hz) | {p.get('bandwidth_normalized')} (Norm)")
        print(f"Symbol Rate: {p.get('symbol_rate_baud')} (Baud) | {p.get('symbol_rate_normalized')} (Norm)")
        print(f"SNR: {p.get('snr_db')} dB")
        print(f"Data Rate: {p.get('data_rate_bps')} bps")
        print(f"Ground Truth Available: {p.get('ground_truth_available')}")
        
    except Exception as e:
        print(f"Test failed: {e}")
