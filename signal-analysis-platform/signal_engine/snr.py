import numpy as np
from scipy import signal as dsp_signal

def estimate_signal_parameters(signal_data, fs):
    """
    Computes real signal metrics:
    - Signal Power (dB / linear)
    - Noise Floor & Noise Power (dB)
    - SNR (dB)
    - Peak Frequency (Hz or normalized)
    - Center Frequency (Hz or normalized)
    - Occupied Bandwidth (Hz or normalized)
    """
    n_samples = len(signal_data)
    if n_samples == 0:
        return {
            "signal_power_db": -100.0,
            "noise_power_db": -100.0,
            "snr_db": 0.0,
            "peak_frequency": 0.0,
            "center_frequency": 0.0,
            "occupied_bandwidth": 0.0,
            "is_normalized_freq": fs is None or fs <= 0
        }

    # Bound sample size for parameter estimation (max 131072)
    N = min(n_samples, 131072)
    sig_bounded = signal_data[:N]

    has_valid_fs = fs is not None and fs > 0
    fs_val = float(fs) if has_valid_fs else 1.0

    is_c = np.iscomplexobj(sig_bounded)
    # Total signal power
    sig_power_linear = float(np.mean(np.abs(sig_bounded) ** 2)) + 1e-12
    sig_power_db = 10.0 * np.log10(sig_power_linear)

    # Welch PSD estimate for noise floor calculation
    nperseg = min(2048, max(256, N // 4))
    if is_c:
        freqs, psd = dsp_signal.welch(sig_bounded, fs=fs_val, nperseg=nperseg, return_onesided=False)
        freqs = np.fft.fftshift(freqs)
        psd = np.fft.fftshift(psd)
    else:
        freqs, psd = dsp_signal.welch(sig_bounded, fs=fs_val, nperseg=nperseg, return_onesided=True)

    # Estimate noise floor density from bottom 25th percentile of PSD bins
    sorted_psd = np.sort(psd)
    n_noise_bins = max(1, int(len(sorted_psd) * 0.25))
    noise_density = float(np.mean(sorted_psd[:n_noise_bins])) + 1e-15

    # Total noise power integrated across the sampling bandwidth
    df = abs(freqs[1] - freqs[0]) if len(freqs) > 1 else 1.0
    tot_noise_power_linear = float(noise_density * df * len(psd)) + 1e-15
    noise_power_db = 10.0 * np.log10(tot_noise_power_linear)

    # Calculate true SNR (dB)
    sig_pure_linear = max(1e-12, sig_power_linear - tot_noise_power_linear)
    snr_linear = max(1e-4, sig_pure_linear / tot_noise_power_linear)
    raw_snr_db = round(float(10.0 * np.log10(snr_linear)), 1)

    # Realistic measurement ceiling for noiseless/clean signals
    MAX_MEASURABLE_SNR = 60.0
    is_bounded = raw_snr_db > MAX_MEASURABLE_SNR
    snr_db = min(raw_snr_db, MAX_MEASURABLE_SNR)

    print(f"[SNR] signal_power={round(sig_power_db, 2)}")
    print(f"[SNR] noise_power={round(noise_power_db, 2)}")
    print(f"[SNR] snr_db={snr_db} (raw={raw_snr_db}, bounded={is_bounded})")

    # Peak Frequency
    peak_idx = np.argmax(psd)
    peak_freq = float(abs(freqs[peak_idx]))

    # Center Frequency (Spectral Centroid)
    center_freq = float(np.sum(abs(freqs) * psd) / (np.sum(psd) + 1e-12))

    # Occupied Bandwidth (99% power width)
    total_power = np.sum(psd)
    cum_power = np.cumsum(psd) / (total_power + 1e-12)
    idx_l = min(max(0, np.searchsorted(cum_power, 0.005)), len(freqs) - 1)
    idx_u = min(max(0, np.searchsorted(cum_power, 0.995)), len(freqs) - 1)
    bandwidth = abs(float(freqs[idx_u] - freqs[idx_l]))

    freq_decimals = 4 if not has_valid_fs else 2

    return {
        "signal_power_db": round(sig_power_db, 2),
        "noise_power_db": round(noise_power_db, 2),
        "snr_db": snr_db,
        "raw_snr_db": raw_snr_db,
        "snr_bounded": is_bounded,
        "snr_display": f"> {MAX_MEASURABLE_SNR:.1f} dB (High SNR)" if is_bounded else f"{snr_db:.1f} dB",
        "peak_frequency": round(peak_freq, freq_decimals),
        "center_frequency": round(center_freq, freq_decimals),
        "occupied_bandwidth": round(bandwidth, freq_decimals),
        "is_normalized_freq": not has_valid_fs
    }


