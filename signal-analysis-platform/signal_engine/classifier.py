import numpy as np
from scipy import signal as dsp_signal

def extract_signal_features(signal_data, fs):
    """
    Extracts statistical features for modulation classification:
    - Envelope Variance (Gamma_max)
    - Peak-to-Average Power Ratio (PAPR)
    - Carrier Frequency Estimation (fc)
    - Higher Order Cumulants (C40, C42)
    - Spectral Peak Count & Multi-tone FSK features
    """
    n_total = len(signal_data)
    if n_total == 0:
        return {}

    # Bound sample size for feature extraction (max 65536 samples)
    sub_data = signal_data[:min(n_total, 65536)]
    n = len(sub_data)

    has_valid_fs = fs is not None and fs > 0
    fs_val = float(fs) if has_valid_fs else 1.0

    # Analytic signal
    if not np.iscomplexobj(sub_data):
        sig = dsp_signal.hilbert(sub_data)
        is_c = False
    else:
        sig = sub_data
        is_c = True

    # Spectral Peak Analysis for FSK vs PSK/QAM
    nper = min(2048, max(256, n // 4))
    freqs, psd = dsp_signal.welch(sig, fs=fs_val, nperseg=nper, return_onesided=False)
    freqs = np.fft.fftshift(freqs)
    psd = np.fft.fftshift(psd)

    # Positive frequency band
    pos_mask = freqs > (200.0 if has_valid_fs else 0.01) if not is_c else freqs >= 0
    p_freqs = freqs[pos_mask]
    p_psd = psd[pos_mask]

    max_p = np.max(p_psd) if len(p_psd) > 0 else 1.0
    peaks, _ = dsp_signal.find_peaks(p_psd, height=max_p * 0.4, distance=10)

    # 1. 2FSK Check (multiple dominant spectral peaks)
    is_fsk = False
    if len(peaks) >= 2:
        top_indices = np.argsort(p_psd[peaks])[::-1][:2]
        f1 = p_freqs[peaks[top_indices[0]]]
        f2 = p_freqs[peaks[top_indices[1]]]
        sep_threshold = 2000.0 if has_valid_fs else 0.05
        if abs(f1 - f2) > sep_threshold and (min(p_psd[peaks[top_indices[0]]], p_psd[peaks[top_indices[1]]]) / max_p) > 0.3:
            is_fsk = True

    # 2. Coarse carrier frequency
    fc_coarse = abs(float(p_freqs[np.argmax(p_psd)])) if len(p_psd) > 0 else 0.0

    if is_c:
        # Complex IQ is baseband
        bb_filt = sig
        fc = 0.0
    else:
        # Carrier refinement using 2nd power peak (for BPSK)
        fft_sq = np.abs(np.fft.fft(sig ** 2))
        freqs_sq = np.fft.fftfreq(n, d=1.0 / fs_val)
        pos_mask_sq = freqs_sq > (200 if has_valid_fs else 0.01)
        if np.any(pos_mask_sq):
            sub_freqs = freqs_sq[pos_mask_sq]
            sub_fft = fft_sq[pos_mask_sq]
            idx_sq = np.argmax(sub_fft)
            fc_sq = abs(float(sub_freqs[idx_sq])) / 2.0
            if abs(fc_sq - fc_coarse) < (500 if has_valid_fs else 0.1) and sub_fft[idx_sq] > np.mean(sub_fft) * 4:
                fc = fc_sq
            else:
                fc = fc_coarse
        else:
            fc = fc_coarse

        # Baseband downconversion for real signal
        t = np.arange(n) / fs_val
        bb = sig * np.exp(-1j * 2 * np.pi * fc * t)
        cutoff = min(0.45, max(0.01, 2500.0 / (fs_val / 2.0)))
        b, a = dsp_signal.butter(4, cutoff, btype='low')
        bb_filt = dsp_signal.filtfilt(b, a, bb)

    # Envelope & Normalized Instantaneous Amplitude
    env = np.abs(bb_filt)
    norm_env = env / (np.mean(env) + 1e-9)
    gamma_max = float(np.var(norm_env))
    papr = float(np.max(env ** 2) / (np.mean(env ** 2) + 1e-9))

    # Phase alignment for BPSK check
    ph_sq = np.angle(np.mean(bb_filt ** 2)) / 2.0
    bb_aligned = bb_filt * np.exp(-1j * ph_sq)

    real_v = float(np.var(np.real(bb_aligned)))
    imag_v = float(np.var(np.imag(bb_aligned)))
    axis_ratio = float(real_v / (imag_v + 1e-9))

    # CW / Single Tone Phase Increment & Spectral Concentration Features
    # Computed on analytic/complex signal sig to capture phase jumps during symbol transitions
    if len(sig) > 1:
        d_phi = np.angle(sig[1:] * np.conj(sig[:-1]))
        d_phi_mean = float(np.mean(d_phi))
        d_phi_std = float(np.std(d_phi))
        norm_freq = float(d_phi_mean / (2.0 * np.pi))
        phase_inc_deg = float(np.rad2deg(d_phi_mean % (2.0 * np.pi)))
    else:
        d_phi_mean = 0.0
        d_phi_std = 1.0
        norm_freq = 0.0
        phase_inc_deg = 0.0

    psd_sum = float(np.sum(p_psd)) + 1e-15
    max_psd_val = float(np.max(p_psd)) if len(p_psd) > 0 else 0.0
    psd_median = float(np.median(p_psd)) + 1e-15
    peak_to_median_psd = float(max_psd_val / psd_median)

    # Fourth order cumulants
    centered = bb_aligned - np.mean(bb_aligned)
    m20 = np.mean(centered ** 2)
    m21 = np.mean(np.abs(centered) ** 2)
    m40 = np.mean(centered ** 4)
    m42 = np.mean((centered ** 3) * np.conj(centered))

    c40 = m40 - 3 * (m20 ** 2)
    c42 = m42 - (abs(m20) ** 2) - 2 * (m21 ** 2)
    norm_c40 = float(abs(c40) / (m21 ** 2 + 1e-9))
    norm_c42 = float(abs(c42) / (m21 ** 2 + 1e-9))

    return {
        "gamma_max": round(gamma_max, 4),
        "papr": round(papr, 4),
        "axis_ratio": round(axis_ratio, 2),
        "norm_c40": round(norm_c40, 4),
        "norm_c42": round(norm_c42, 4),
        "fc": round(fc, 2),
        "is_fsk": is_fsk,
        "d_phi_std": round(d_phi_std, 4),
        "norm_freq": round(norm_freq, 4),
        "phase_inc_deg": round(phase_inc_deg, 2),
        "peak_to_median_psd": round(peak_to_median_psd, 2)
    }

def classify_modulation_heuristic(signal_data, fs):
    """
    Fallback Modulation Classifier using statistical DSP features & heuristics.
    Used when ML model is not available or fails.
    """
    feats = extract_signal_features(signal_data, fs)
    if not feats:
        return {"modulation": "Unknown / Low Confidence", "confidence": 0.0, "classification_method": "HEURISTIC", "features": {}}

    gamma_max = feats["gamma_max"]
    axis_ratio = feats["axis_ratio"]
    norm_c40 = feats["norm_c40"]
    norm_c42 = feats["norm_c42"]
    is_fsk = feats["is_fsk"]
    d_phi_std = feats.get("d_phi_std", 1.0)
    norm_freq = feats.get("norm_freq", 0.0)

    is_cw = False
    if gamma_max < 0.05 and axis_ratio < 2.5 and d_phi_std < 0.15 and not is_fsk:
        is_cw = True

    if is_cw:
        detected_mod = "CW / Single Tone"
        confidence = 0.995
        return {
            "modulation": detected_mod,
            "confidence": round(float(confidence), 4),
            "classification_method": "HEURISTIC",
            "model_name": "Statistical Heuristic Rules",
            "features": feats,
            "signal_type": "CW / Single Tone",
            "carrier_detection": True,
            "normalized_frequency": round(float(norm_freq), 4),
            "cw_detected": True,
            "explanation": f"Unmodulated Continuous Wave (CW) carrier detected at normalized frequency {norm_freq:+.4f} with constant envelope and high phase coherence."
        }

    if is_fsk:
        detected_mod = "2FSK"
        confidence = 0.982
    elif gamma_max > 0.08:
        if gamma_max < 0.25:
            detected_mod = "16QAM"
            confidence = min(0.98, 0.86 + gamma_max * 0.5)
        else:
            detected_mod = "64QAM"
            confidence = 0.920
    else:
        if axis_ratio > 3.0 or norm_c40 > 1.2:
            detected_mod = "BPSK"
            confidence = min(0.985, 0.880 + min(0.10, axis_ratio * 0.01))
        else:
            detected_mod = "QPSK"
            confidence = min(0.985, 0.900 + norm_c42 * 0.04)

    return {
        "modulation": detected_mod,
        "confidence": round(float(confidence), 4),
        "classification_method": "HEURISTIC",
        "model_name": "Statistical Heuristic Rules",
        "features": feats
    }

def classify_modulation(signal_data, fs):
    """
    Main Modulation Classifier integration point.
    If trained RadioML model exists, uses ML prediction; otherwise safely falls back to heuristic rules.
    """
    # Extract DSP features for full UI and DSP parameter pipeline compatibility
    dsp_feats = extract_signal_features(signal_data, fs)

    # CW / Single Tone special check
    if dsp_feats and dsp_feats.get("gamma_max", 1.0) < 0.05 and dsp_feats.get("axis_ratio", 1.0) < 2.5 and dsp_feats.get("d_phi_std", 1.0) < 0.15 and not dsp_feats.get("is_fsk"):
        norm_freq = dsp_feats.get("norm_freq", 0.0)
        return {
            "modulation": "CW / Single Tone",
            "confidence": 0.995,
            "classification_method": "HEURISTIC",
            "model_name": "Statistical Heuristic Rules",
            "features": dsp_feats,
            "signal_type": "CW / Single Tone",
            "carrier_detection": True,
            "normalized_frequency": round(float(norm_freq), 4),
            "cw_detected": True,
            "explanation": f"Unmodulated Continuous Wave (CW) carrier detected at normalized frequency {norm_freq:+.4f}."
        }

    try:
        from ml.predict import predict_modulation
        ml_res = predict_modulation(signal_data, sample_rate=fs)
        if ml_res and ml_res.get("classification_method") == "ML":
            if dsp_feats:
                merged_feats = {**dsp_feats, **ml_res.get("features", {})}
                ml_res["features"] = merged_feats
            return ml_res
    except Exception as e:
        import sys
        print(f"[Classifier Integration Error] ML prediction execution failed: {e}. Falling back to heuristic DSP classifier.", file=sys.stderr, flush=True)

    # Fallback to Heuristic Classifier if ML model is absent or prediction fails
    return classify_modulation_heuristic(signal_data, fs)




