import numpy as np
from scipy import signal as dsp_signal

def compute_waterfall(signal_data, fs, nperseg=256, noverlap=128, max_time_bins=100, max_freq_bins=128):
    """
    Computes Short-Time Fourier Transform (STFT) matrix for interactive waterfall heatmap.
    Returns:
    - time_stamps: list of time indices (y-axis)
    - freqs: list of frequency values (x-axis)
    - z_matrix: 2D array [time_bin][freq_bin] in dB
    """
    n_samples = len(signal_data)
    if n_samples == 0:
        return {"time_stamps": [], "freqs": [], "z_matrix": []}

    # Limit max input size to 262144 samples
    N = min(n_samples, 262144)
    sig_bounded = signal_data[:N]

    if N < 64:
        nperseg = max(16, N)
        noverlap = nperseg // 2

    has_valid_fs = fs is not None and fs > 0
    fs_val = float(fs) if has_valid_fs else 1.0

    # Compute STFT / Spectrogram
    if np.iscomplexobj(sig_bounded):
        freqs, time_pts, Zxx = dsp_signal.stft(
            sig_bounded, fs=fs_val, nperseg=nperseg, noverlap=noverlap, return_onesided=False
        )
        freqs = np.fft.fftshift(freqs)
        Zxx = np.fft.fftshift(Zxx, axes=0)
    else:
        freqs, time_pts, Zxx = dsp_signal.stft(
            sig_bounded, fs=fs_val, nperseg=nperseg, noverlap=noverlap, return_onesided=True
        )

    # Convert magnitude to dB
    power = np.abs(Zxx) ** 2 + 1e-12
    power_db = 10.0 * np.log10(power) # shape: [freq_bins, time_bins]

    # Downsample time/freq axes if necessary to keep payload light for UI rendering
    n_freq, n_time = power_db.shape
    step_freq = max(1, n_freq // max_freq_bins)
    step_time = max(1, n_time // max_time_bins)

    freqs_sub = freqs[::step_freq]
    time_sub = time_pts[::step_time]
    matrix_sub = power_db[::step_freq, ::step_time].T # Transpose to [time][freq] for Plotly

    rows, cols = matrix_sub.shape
    std_val = round(float(np.std(matrix_sub)), 2)
    print(f"[Waterfall] rows={rows}")
    print(f"[Waterfall] columns={cols}")
    print(f"[Waterfall] std={std_val}")

    if std_val == 0:
        print("[Waterfall] WARNING: uniform waterfall data")

    freq_decimals = 4 if not has_valid_fs else 2

    return {
        "time_stamps": [round(float(t), 4) for t in time_sub.tolist()],
        "freqs": [round(float(f), freq_decimals) for f in freqs_sub.tolist()],
        "z_matrix": np.round(matrix_sub, 2).tolist(),
        "is_normalized_freq": not has_valid_fs
    }

