import numpy as np
from scipy import signal as dsp_signal

def estimate_symbol_rate(signal_data, fs=None):
    """
    DSP-based Symbol Rate ($R_s$) Estimator using Cyclostationary Transition Autocorrelation.
    
    Algorithm:
    1. Converts real waveform to analytic complex baseband signal via Hilbert transform.
    2. Estimates coarse carrier offset $f_c$ and downconverts complex signal to baseband ($z[n]$).
    3. Computes multi-feature transition signals:
       - Complex derivative magnitude $|z[n] - z[n-1]|$
       - Envelope magnitude squared difference $| |z[n]|^2 - |z[n-1]|^2 |$
       - Instantaneous frequency acceleration $| \Delta f_{inst}[n] |$
    4. Computes autocorrelation $R_{ww}(\tau)$ of combined transition signal via FFT.
    5. Detects fundamental lag $\tau_{peak} = SPS$ (Samples Per Symbol) from first significant autocorrelation peak.
    6. Computes symbol rate $R_s = f_s / SPS$ and estimation confidence.
    
    Returns dict:
    {
        "symbol_rate": float (Hz) or None,
        "symbol_rate_ksym_s": float (kSym/s) or None,
        "symbol_rate_display": str ("1.0 kSym/s", "500 Sym/s", or "Not available"),
        "confidence": float (0.0 to 1.0),
        "sps": float (samples per symbol) or None,
        "is_normalized_freq": bool
    }
    """
    if signal_data is None or len(signal_data) < 256:
        return {
            "symbol_rate": None,
            "symbol_rate_ksym_s": None,
            "symbol_rate_display": "Not available",
            "confidence": 0.0,
            "sps": None,
            "is_normalized_freq": fs is None or fs <= 0
        }

    n_samples = len(signal_data)
    N = min(n_samples, 65536)
    sig = signal_data[:N]

    has_valid_fs = fs is not None and fs > 0
    fs_val = float(fs) if has_valid_fs else 1.0

    # 1. Convert to complex analytic signal
    if not np.iscomplexobj(sig):
        sig = dsp_signal.hilbert(sig - np.mean(sig))
    else:
        sig = sig - np.mean(sig)

    # 2. Downconvert coarse carrier frequency
    fft_sig = np.fft.fft(sig)
    freqs_sig = np.fft.fftfreq(len(sig), d=1.0 / fs_val)
    peak_idx = np.argmax(np.abs(fft_sig))
    fc_est = freqs_sig[peak_idx]

    t = np.arange(len(sig)) / fs_val
    z = sig * np.exp(-1j * 2 * np.pi * fc_est * t)
    z = z / (np.mean(np.abs(z)) + 1e-12)

    # 3. Multi-feature transition signals
    w_diff_c = np.abs(np.diff(z, prepend=z[0]))
    
    mag_sq = np.abs(z) ** 2
    w_diff_m = np.abs(np.diff(mag_sq, prepend=mag_sq[0]))

    phase_unwrapped = np.unwrap(np.angle(z))
    inst_freq = np.diff(phase_unwrapped, prepend=phase_unwrapped[0])
    w_diff_f = np.abs(np.diff(inst_freq, prepend=inst_freq[0]))

    # Check for unmodulated CW / flat tone before normalization
    std_c = float(np.std(w_diff_c))
    std_m = float(np.std(w_diff_m))
    std_f = float(np.std(w_diff_f))

    if std_c < 1e-4 and std_m < 1e-4 and std_f < 1e-4:
        return {
            "symbol_rate": None,
            "symbol_rate_ksym_s": None,
            "symbol_rate_display": "Not available",
            "confidence": 0.0,
            "sps": None,
            "is_normalized_freq": not has_valid_fs
        }

    def std_sig(arr, std_val):
        return (arr - np.mean(arr)) / (std_val + 1e-12) if std_val >= 1e-4 else np.zeros_like(arr)

    w = std_sig(w_diff_c, std_c) + std_sig(w_diff_m, std_m) + std_sig(w_diff_f, std_f)

    # Variance check for unmodulated CW tone / flat noise
    if np.std(w) < 1e-5:
        return {
            "symbol_rate": None,
            "symbol_rate_ksym_s": None,
            "symbol_rate_display": "Not available",
            "confidence": 0.0,
            "sps": None,
            "is_normalized_freq": not has_valid_fs
        }

    # 4. Transition signal autocorrelation via FFT
    n_fft = 2 ** int(np.ceil(np.log2(2 * len(w))))
    W = np.fft.rfft(w - np.mean(w), n=n_fft)
    acf_full = np.fft.irfft(np.abs(W) ** 2)
    acf = acf_full[:len(w) // 2]
    acf_norm = acf / (acf[0] + 1e-12)

    # Search bounds for Samples Per Symbol (SPS)
    min_sps = 4
    max_sps = min(300, len(acf) - 2)

    acf_sub = acf_norm[min_sps:max_sps]
    peaks, props = dsp_signal.find_peaks(acf_sub, height=0.015, distance=3, prominence=0.008)

    if len(peaks) == 0:
        return {
            "symbol_rate": None,
            "symbol_rate_ksym_s": None,
            "symbol_rate_display": "Not available",
            "confidence": 0.0,
            "sps": None,
            "is_normalized_freq": not has_valid_fs
        }

    # First peak in ACF represents fundamental symbol period (SPS)
    first_peak_rel = peaks[0]
    sps_est = float(min_sps + first_peak_rel)
    peak_val = props['peak_heights'][0]

    # Fundamental Symbol Rate
    best_rs = fs_val / sps_est
    confidence = float(np.clip(peak_val * 3.5, 0.0, 1.0))

    if confidence < 0.20:
        return {
            "symbol_rate": None,
            "symbol_rate_ksym_s": None,
            "symbol_rate_display": "Not available",
            "confidence": round(confidence, 3),
            "sps": None,
            "is_normalized_freq": not has_valid_fs
        }

    # Formatted output
    rs_hz = round(float(best_rs), 2) if has_valid_fs else round(float(best_rs), 4)
    rs_ksym = round(float(best_rs / 1000.0), 3) if has_valid_fs else None

    if has_valid_fs:
        if rs_hz >= 1000.0:
            display_str = f"{rs_ksym:.1f} kSym/s" if abs(rs_ksym - round(rs_ksym)) < 0.01 else f"{rs_ksym:.2f} kSym/s"
        else:
            display_str = f"{rs_hz:.0f} Sym/s"
    else:
        display_str = f"{rs_hz:.4f} normalized"

    return {
        "symbol_rate": rs_hz,
        "symbol_rate_ksym_s": rs_ksym,
        "symbol_rate_display": display_str,
        "confidence": round(float(confidence), 3),
        "sps": round(float(sps_est), 2),
        "is_normalized_freq": not has_valid_fs
    }
