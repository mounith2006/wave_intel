import os
import sys
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sample_generator import generate_all_samples
from loader import load_signal_file, SignalLoadError
from spectrum import compute_spectrum
from waterfall import compute_waterfall
from constellation import compute_constellation
from snr import estimate_signal_parameters
from classifier import classify_modulation
from demodulator import demodulate_signal
from bitstream import analyze_bitstream
from interleaver import deinterleave_bitstream
from fec_decoder import decode_fec

def run_all_tests():
    print("==================================================")
    print("RUNNING AUTOMATED DSP SIGNAL ENGINE TEST SUITE")
    print("==================================================")
    
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
    generate_all_samples(uploads_dir)
    
    test_files = [
        ("sample_bpsk.wav", "BPSK"),
        ("sample_qpsk.wav", "QPSK"),
        ("sample_fsk.wav", "2FSK"),
        ("sample_qam16.wav", "16QAM"),
        ("sample_iq.iq", "QPSK"),
        ("sample_cw.iq", "CW / Single Tone")
    ]
    
    passed_count = 0
    total_count = len(test_files)
    
    for filename, expected_mod in test_files:
        file_path = os.path.join(uploads_dir, filename)
        print(f"\n[TESTING FILE]: {filename}")
        
        # 1. Load File (with default fs)
        sig_data, fs, meta = load_signal_file(file_path, default_fs=48000)
        print(f" -> Format: {meta['format']}, Samples: {meta['num_samples']}, Fs: {meta['sample_rate']}")
        assert meta['num_samples'] > 0, "Failed: 0 samples loaded"
        assert np.isfinite(sig_data).all(), "Failed: non-finite samples"
        
        # 2. Spectrum & PSD
        spec = compute_spectrum(sig_data, fs)
        print(f" -> Peak Freq: {spec['peak_frequency']}, Occupied BW: {spec['occupied_bandwidth']}")
        assert len(spec['freqs']) > 0, "Failed: empty spectrum freqs"
        assert np.std(spec['psd_db']) > 0, "Failed: flat -120 dB spectrum"
        
        # 3. Waterfall
        wf = compute_waterfall(sig_data, fs)
        print(f" -> Waterfall matrix shape: {len(wf['z_matrix'])} x {len(wf['z_matrix'][0]) if wf['z_matrix'] else 0}")
        assert len(wf['z_matrix']) > 1 and len(wf['z_matrix'][0]) > 1, "Failed: empty waterfall matrix"
        assert np.std(wf['z_matrix']) > 0, "Failed: uniform waterfall matrix"

        # 4. SNR & Parameters
        params = estimate_signal_parameters(sig_data, fs)
        print(f" -> SNR: {params['snr_db']} dB, Symbol Rate: {params['symbol_rate_display']} (Conf: {params.get('symbol_rate_confidence')})")
        assert params['snr_db'] > 5.0, f"Failed: abnormally low SNR ({params['snr_db']} dB)"
        if filename == "sample_cw.iq":
            assert params['symbol_rate'] is None, f"Failed: CW should have symbol_rate=None, got {params['symbol_rate']}"
            assert params['symbol_rate_display'] == "Not available", f"Failed: CW display expected 'Not available', got '{params['symbol_rate_display']}'"
        elif params['symbol_rate'] is not None:
            assert abs(params['symbol_rate'] - 1000.0) < 500.0, f"Failed: symbol_rate expected ~1000 Hz for {filename}, got {params['symbol_rate']}"
        
        # 5. Constellation
        const = compute_constellation(sig_data, fs)
        print(f" -> Constellation points: {len(const['i'])}, EVM: {const['evm_percent']}%")
        assert len(const['i']) > 0, "Failed: 0 constellation points"
        assert not all(x == 0.0 for x in const['i']), "Failed: constellation I coordinates all zero"
        
        # 6. Modulation Classification
        cls = classify_modulation(sig_data, fs)
        print(f" -> Detected Modulation: {cls['modulation']}, Confidence: {cls['confidence']}, Method: {cls.get('classification_method')}")
        assert cls['confidence'] >= 0.10, f"Low confidence: {cls['confidence']}"
        
        if filename == "sample_cw.iq":
            assert cls['modulation'] == "CW / Single Tone", f"Failed: expected 'CW / Single Tone', got '{cls['modulation']}'"
            assert cls.get('cw_detected') is True, "Failed: cw_detected flag missing"
            norm_freq = cls.get('normalized_frequency', 0.0)
            assert abs(norm_freq - 0.0625) < 0.01, f"Failed: normalized freq expected ~0.0625, got {norm_freq}"
            phase_inc = cls['features'].get('phase_inc_deg', 0.0)
            assert abs(phase_inc - 22.5) < 1.0, f"Failed: phase inc expected ~22.5 deg, got {phase_inc}"
            gamma_max = cls['features'].get('gamma_max', 1.0)
            assert gamma_max < 0.05, f"Failed: non-constant envelope (gamma_max={gamma_max})"
            print(" -> [PASS]: CW / Single Tone classification, normalized freq +0.0625, phase increment 22.5 deg, constant envelope verified")

        # 7. Demodulation
        demod = demodulate_signal(sig_data, fs, target_modulation=cls['modulation'])
        print(f" -> Recovered bits count: {demod['num_bits']}, Bits preview: {demod['bits'][:32]}")
        if filename == "sample_cw.iq":
            assert demod['num_bits'] == 0, f"Failed: CW signal expected 0 bits, got {demod['num_bits']}"
        else:
            assert demod['num_bits'] > 0, "Failed: 0 bits recovered"
        
        # 8. Bitstream analysis
        bit_res = analyze_bitstream(demod['bits'])
        print(f" -> Hex Preview: {bit_res['hex_data'][:24]}")

        # 9. Test null sample_rate handling for raw IQ
        if filename.endswith(".iq"):
            sig_iq_null, fs_null, meta_null = load_signal_file(file_path, default_fs=None)
            assert fs_null is None, "Failed: fs should be None when unprovided for raw IQ"
            spec_null = compute_spectrum(sig_iq_null, fs_null)
            assert spec_null['is_normalized_freq'] is True, "Failed: should mark is_normalized_freq=True"
            print(" -> [PASS]: Raw IQ null sample rate handling verified")
        
        passed_count += 1
        print(f"[PASS]: {filename}")
        
    print("\n==================================================")
    print(f"TEST RESULTS: {passed_count}/{total_count} PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_all_tests()

