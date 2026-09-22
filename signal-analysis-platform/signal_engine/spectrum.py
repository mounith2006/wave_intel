import numpy as np
from scipy import signal as dsp_signal

def compute_waveform_preview(signal_data, max_points=1000):
    """Downsamples signal waveform into manageable decimated time points for UI graph."""
    n_samples = len(signal_data)
    if n_samples == 0:
        return {"time": [], "real": [], "imag": []}
    
    step = max(1, n_samples // max_points)
    subsampled = signal_data[::step]
    time_pts = np.arange(len(subsampled)) * step
    
    if np.iscomplexobj(subsampled):
        real_pts = np.real(subsampled).tolist()
        imag_pts = np.imag(subsampled).tolist()
    else:
        real_pts = subsampled.tolist()
        imag_pts = [0.0] * len(real_pts)
        
    return {
        "time": time_pts.tolist(),
        "real": [round(x, 5) for x in real_pts],
        "imag": [round(x, 5) for x in imag_pts]
    }

def compute_spectrum(signal_data, fs, n_fft=None):
    """
    Computes FFT spectrum, PSD, peak frequency, and occupied bandwidth.
    Returns structured numerical data dictionary for frontend Plotly spectrum rendering.
    Supports fs = None / 0 for normalized frequency (-0.5 to +0.5).
    """
    n_samples = len(signal_data)
    if n_samples == 0:
        return {
            "freqs": [],
            "psd_db": [],
            "magnitude": [],
            "peak_frequency": 0.0,
            "peak_power": -120.0,
            "occupied_bandwidth": 0.0,
            "is_normalized_freq": fs is None or fs <= 0
        }

    # Bound sample size for FFT performance (max 262144)
    N = min(n_samples, 262144)
    # Ensure power of 2 or close
    if N > 4096:
        N = 2 ** int(np.floor(np.log2(N)))
    N = max(N, 256)

    segment = np.asarray(signal_data[:N], dtype=np.complex128 if np.iscomplexobj(signal_data) else np.float64)
    
    # Apply Hann window
    window = dsp_signal.windows.hann(N)
    windowed_segment = segment * window

    fft_vals = np.fft.fftshift(np.fft.fft(windowed_segment, n=N))

    # Frequency axis
    has_valid_fs = fs is not None and fs > 0
    if has_valid_fs:
        freqs = np.fft.fftshift(np.fft.fftfreq(N, d=1.0 / float(fs)))
    else:
        # Normalized frequency from -0.5 to +0.5
        freqs = np.fft.fftshift(np.fft.fftfreq(N, d=1.0))

    # Power Spectral Density (PSD) in dB
    magnitude = np.abs(fft_vals) / N
    psd_linear = (magnitude ** 2) + 1e-12
    psd_db = 10.0 * np.log10(psd_linear)

    # Peak Frequency
    peak_idx = np.argmax(psd_db)
    peak_freq = float(freqs[peak_idx])
    peak_power = float(psd_db[peak_idx])

    # Occupied Bandwidth (99% power container method)
    total_power = np.sum(psd_linear)
    cum_power = np.cumsum(psd_linear) / (total_power + 1e-12)

    idx_lower = min(max(0, np.searchsorted(cum_power, 0.005)), N - 1)
    idx_upper = min(max(0, np.searchsorted(cum_power, 0.995)), N - 1)

    occupied_bw = abs(float(freqs[idx_upper] - freqs[idx_lower]))

    # Subsample vector size for frontend JSON transport if N is large
    target_pts = 1024
    if N > target_pts:
        step = N // target_pts
        freqs_out = freqs[::step]
        psd_out = psd_db[::step]
        mag_out = magnitude[::step]
    else:
        freqs_out = freqs
        psd_out = psd_db
        mag_out = magnitude

    min_db = round(float(np.min(psd_out)), 2)
    max_db = round(float(np.max(psd_out)), 2)
    std_db = round(float(np.std(psd_out)), 2)

    print(f"[Spectrum] input_samples={n_samples}")
    print(f"[Spectrum] fft_size={N}")
    print(f"[Spectrum] output_bins={len(freqs_out)}")
    print(f"[Spectrum] min_db={min_db}")
    print(f"[Spectrum] max_db={max_db}")
    print(f"[Spectrum] std_db={std_db}")

    if std_db == 0:
        print("[Spectrum] WARNING: uniform spectrum power data")

    freq_decimals = 4 if not has_valid_fs else 2

    return {
        "freqs": [round(float(f), freq_decimals) for f in freqs_out],
        "psd_db": [round(float(p), 2) for p in psd_out],
        "magnitude": [round(float(m), 6) for m in mag_out],
        "peak_frequency": round(peak_freq, freq_decimals),
        "peak_power": round(peak_power, 2),
        "occupied_bandwidth": round(occupied_bw, freq_decimals),
        "is_normalized_freq": not has_valid_fs
    }

