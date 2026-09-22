import numpy as np
from scipy import signal as dsp_signal
from sklearn.cluster import KMeans

def compute_constellation(signal_data, fs, fc=None, max_points=10000, target_clusters=4):
    """
    Extracts IQ scatter plot coordinates, estimates constellation cluster centroids,
    and returns decision boundaries and EVM stats.
    For complex IQ signals, preserves native baseband I/Q samples directly.
    """
    n_samples = len(signal_data)
    if n_samples == 0:
        return {"i": [], "q": [], "clusters": [], "evm_percent": 0.0, "estimated_carrier_freq": 0.0}

    # Bound processing to max 10000 points
    limit = min(n_samples, max_points)
    bounded_sig = signal_data[:limit]

    is_complex = np.iscomplexobj(bounded_sig)
    
    if is_complex:
        # Complex IQ is ALREADY baseband I + jQ. Do NOT apply carrier downconversion or lowpass filtering.
        subsampled = bounded_sig
        est_fc = 0.0
    else:
        # Real signal (e.g. WAV): convert to analytic complex signal using Hilbert transform
        analytic_sig = dsp_signal.hilbert(bounded_sig)

        has_valid_fs = fs is not None and fs > 0
        if fc is None or fc <= 0:
            if has_valid_fs:
                fft_vals = np.abs(np.fft.fft(analytic_sig[:min(4096, len(analytic_sig))]))
                freqs = np.fft.fftfreq(min(4096, len(analytic_sig)), d=1.0 / float(fs))
                est_fc = abs(float(freqs[np.argmax(fft_vals)]))
            else:
                est_fc = 0.0
        else:
            est_fc = float(fc)

        if has_valid_fs and est_fc > 0:
            t = np.arange(len(analytic_sig)) / float(fs)
            baseband_iq = analytic_sig * np.exp(-1j * 2 * np.pi * est_fc * t)
            cutoff = max(float(fs) * 0.1, est_fc * 0.5)
            b, a = dsp_signal.butter(4, min(0.49, cutoff / (float(fs) / 2.0)), btype='low')
            subsampled = dsp_signal.filtfilt(b, a, baseband_iq)
        else:
            subsampled = analytic_sig

    # Subsample if still larger than max_points
    if len(subsampled) > max_points:
        step = len(subsampled) // max_points
        subsampled = subsampled[::step][:max_points]

    # Normalize amplitude / power to unit RMS
    rms_power = np.sqrt(np.mean(np.abs(subsampled) ** 2))
    if rms_power > 1e-12:
        norm_iq = subsampled / rms_power
    else:
        norm_iq = subsampled

    i_coords = np.real(norm_iq)
    q_coords = np.imag(norm_iq)

    print(f"[Constellation] points={len(i_coords)}")
    print(f"[Constellation] i_min={round(float(np.min(i_coords)), 4) if len(i_coords)>0 else 0.0}")
    print(f"[Constellation] i_max={round(float(np.max(i_coords)), 4) if len(i_coords)>0 else 0.0}")
    print(f"[Constellation] q_min={round(float(np.min(q_coords)), 4) if len(q_coords)>0 else 0.0}")
    print(f"[Constellation] q_max={round(float(np.max(q_coords)), 4) if len(q_coords)>0 else 0.0}")

    # Estimate cluster centroids via K-Means
    cluster_centroids = []
    evm_percent = 0.0
    if len(norm_iq) >= target_clusters:
        try:
            X = np.column_stack((i_coords, q_coords))
            kmeans = KMeans(n_clusters=min(target_clusters, len(X)), n_init=5, random_state=42)
            kmeans.fit(X)
            centers = kmeans.cluster_centers_
            cluster_centroids = [{"i": round(float(c[0]), 3), "q": round(float(c[1]), 3)} for c in centers]

            # EVM calculation (mean distance to nearest cluster center)
            distances = np.min(kmeans.transform(X), axis=1)
            mean_dist = np.mean(distances)
            evm_percent = round(float(mean_dist * 100.0), 2)
        except Exception:
            cluster_centroids = []
            evm_percent = 5.0

    return {
        "i": [round(float(x), 4) for x in i_coords],
        "q": [round(float(y), 4) for y in q_coords],
        "clusters": cluster_centroids,
        "evm_percent": evm_percent,
        "estimated_carrier_freq": round(est_fc, 2)
    }

