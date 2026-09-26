import numpy as np
from scipy import signal as dsp_signal
from scipy import stats

FEATURE_NAMES = [
    # I/Q Statistics
    "mean_I", "std_I", "var_I", "skew_I", "kurt_I",
    "mean_Q", "std_Q", "var_Q", "skew_Q", "kurt_Q",
    "cross_corr_IQ", "axis_ratio",
    # Envelope & Amplitude Statistics
    "mean_env", "std_env", "var_env", "max_env", "min_env",
    "gamma_max", "papr", "skew_env", "kurt_env",
    # Phase Statistics
    "mean_phase", "std_phase", "var_phase",
    "mean_dphi", "std_dphi", "var_dphi",
    # Power Statistics
    "mean_power", "std_power", "max_power", "min_power", "power_db",
    # Higher-Order Cumulants
    "norm_c20", "norm_c40", "norm_c42",
    # Spectral Features
    "max_psd_val", "mean_psd_val", "median_psd_val",
    "peak_to_mean_psd", "peak_to_median_psd",
    "spectral_centroid", "spectral_spread", "spectral_flatness",
    "pos_neg_energy_ratio",
    # Constellation Moments
    "fourth_moment_I", "fourth_moment_Q"
]

def to_complex_iq(iq_samples):
    """
    Converts various input formats (RadioML (2, N), (N, 2), 1D complex, 1D real)
    into a standardized 1D complex numpy array z = I + 1j*Q.
    """
    if iq_samples is None:
        return np.array([], dtype=np.complex128)

    arr = np.asarray(iq_samples)
    if arr.size == 0:
        return np.array([], dtype=np.complex128)

    if np.iscomplexobj(arr):
        return arr.flatten().astype(np.complex128)

    if arr.ndim == 2:
        if arr.shape[0] == 2:
            # RadioML shape (2, 128): row 0 = I, row 1 = Q
            return (arr[0, :] + 1j * arr[1, :]).astype(np.complex128)
        elif arr.shape[1] == 2:
            # Transposed shape (128, 2): col 0 = I, col 1 = Q
            return (arr[:, 0] + 1j * arr[:, 1]).astype(np.complex128)

    if arr.ndim == 1:
        # Real 1D signal: convert to analytic signal via Hilbert transform
        try:
            return dsp_signal.hilbert(arr.astype(np.float64))
        except Exception:
            return arr.astype(np.complex128)

    return arr.flatten().astype(np.complex128)

def extract_iq_features(iq_samples, fs=None):
    """
    Extracts comprehensive statistical and spectral features from a single IQ sample.
    Returns:
        np.ndarray of shape (num_features,) containing float64 values.
    """
    z = to_complex_iq(iq_samples)
    if len(z) == 0:
        return np.zeros(len(FEATURE_NAMES), dtype=np.float64)

    if not np.isfinite(z).all():
        z = np.nan_to_num(z, nan=0.0, posinf=0.0, neginf=0.0)

    n = len(z)
    I = np.real(z)
    Q = np.imag(z)

    # 1. I & Q Raw Statistics
    mean_I = float(np.mean(I))
    std_I = float(np.std(I))
    var_I = float(np.var(I))
    skew_I = float(stats.skew(I)) if std_I > 1e-9 else 0.0
    kurt_I = float(stats.kurtosis(I)) if std_I > 1e-9 else 0.0

    mean_Q = float(np.mean(Q))
    std_Q = float(np.std(Q))
    var_Q = float(np.var(Q))
    skew_Q = float(stats.skew(Q)) if std_Q > 1e-9 else 0.0
    kurt_Q = float(stats.kurtosis(Q)) if std_Q > 1e-9 else 0.0

    if std_I > 1e-9 and std_Q > 1e-9:
        corr_mat = np.corrcoef(I, Q)
        cross_corr_IQ = float(corr_mat[0, 1]) if np.isfinite(corr_mat[0, 1]) else 0.0
    else:
        cross_corr_IQ = 0.0

    axis_ratio = float(var_I / (var_Q + 1e-9))

    # 2. Envelope & Amplitude Statistics
    env = np.abs(z)
    mean_env = float(np.mean(env))
    std_env = float(np.std(env))
    var_env = float(np.var(env))
    max_env = float(np.max(env))
    min_env = float(np.min(env))

    norm_env = env / (mean_env + 1e-9)
    gamma_max = float(np.var(norm_env))
    mean_sq_power = float(np.mean(env ** 2))
    papr = float(np.max(env ** 2) / (mean_sq_power + 1e-9))
    skew_env = float(stats.skew(env)) if std_env > 1e-9 else 0.0
    kurt_env = float(stats.kurtosis(env)) if std_env > 1e-9 else 0.0

    # 3. Phase Statistics
    phase = np.angle(z)
    mean_phase = float(np.mean(phase))
    std_phase = float(np.std(phase))
    var_phase = float(np.var(phase))

    if n > 1:
        dphi = np.angle(z[1:] * np.conj(z[:-1]))
        mean_dphi = float(np.mean(dphi))
        std_dphi = float(np.std(dphi))
        var_dphi = float(np.var(dphi))
    else:
        mean_dphi, std_dphi, var_dphi = 0.0, 0.0, 0.0

    # 4. Power Statistics
    power = env ** 2
    mean_power = float(np.mean(power))
    std_power = float(np.std(power))
    max_power = float(np.max(power))
    min_power = float(np.min(power))
    power_db = float(10.0 * np.log10(mean_power + 1e-12))

    # 5. Higher-Order Cumulants
    zc = z - np.mean(z)
    m20 = np.mean(zc ** 2)
    m21 = np.mean(np.abs(zc) ** 2)
    m40 = np.mean(zc ** 4)
    m42 = np.mean((zc ** 3) * np.conj(zc))

    c20 = m20
    c40 = m40 - 3.0 * (m20 ** 2)
    c42 = m42 - (np.abs(m20) ** 2) - 2.0 * (m21 ** 2)

    norm_c20 = float(np.abs(c20) / (m21 + 1e-9))
    norm_c40 = float(np.abs(c40) / (m21 ** 2 + 1e-9))
    norm_c42 = float(np.abs(c42) / (m21 ** 2 + 1e-9))

    # 6. Spectral Features
    fft_vals = np.abs(np.fft.fft(z))
    psd = (fft_vals ** 2) / float(n)
    psd_shifted = np.fft.fftshift(psd)

    max_psd_val = float(np.max(psd))
    mean_psd_val = float(np.mean(psd))
    median_psd_val = float(np.median(psd))

    peak_to_mean_psd = float(max_psd_val / (mean_psd_val + 1e-9))
    peak_to_median_psd = float(max_psd_val / (median_psd_val + 1e-9))

    freq_indices = np.arange(n)
    total_psd = np.sum(psd) + 1e-12
    spectral_centroid = float(np.sum(freq_indices * psd) / total_psd)
    spectral_spread = float(np.sqrt(np.sum(((freq_indices - spectral_centroid) ** 2) * psd) / total_psd))

    log_psd = np.log(psd + 1e-12)
    geom_mean = float(np.exp(np.mean(log_psd)))
    spectral_flatness = float(geom_mean / (mean_psd_val + 1e-9))

    half_n = n // 2
    pos_energy = np.sum(psd_shifted[half_n:]) + 1e-12
    neg_energy = np.sum(psd_shifted[:half_n]) + 1e-12
    pos_neg_energy_ratio = float(pos_energy / neg_energy)

    # 7. Constellation Moments
    fourth_moment_I = float(np.mean(I ** 4))
    fourth_moment_Q = float(np.mean(Q ** 4))

    features = [
        mean_I, std_I, var_I, skew_I, kurt_I,
        mean_Q, std_Q, var_Q, skew_Q, kurt_Q,
        cross_corr_IQ, axis_ratio,
        mean_env, std_env, var_env, max_env, min_env,
        gamma_max, papr, skew_env, kurt_env,
        mean_phase, std_phase, var_phase,
        mean_dphi, std_dphi, var_dphi,
        mean_power, std_power, max_power, min_power, power_db,
        norm_c20, norm_c40, norm_c42,
        max_psd_val, mean_psd_val, median_psd_val,
        peak_to_mean_psd, peak_to_median_psd,
        spectral_centroid, spectral_spread, spectral_flatness,
        pos_neg_energy_ratio,
        fourth_moment_I, fourth_moment_Q
    ]

    res = np.array(features, dtype=np.float64)
    return np.nan_to_num(res, nan=0.0, posinf=0.0, neginf=0.0)

def batch_extract_features(iq_samples_list, verbose=True):
    """
    High-speed vectorized feature extraction across batch of IQ samples.
    """
    arr = np.asarray(iq_samples_list)
    if len(arr) == 0:
        return np.zeros((0, len(FEATURE_NAMES)), dtype=np.float64)

    if arr.ndim == 3:
        if arr.shape[1] == 2:
            Z = (arr[:, 0, :] + 1j * arr[:, 1, :]).astype(np.complex128)
        elif arr.shape[2] == 2:
            Z = (arr[:, :, 0] + 1j * arr[:, :, 1]).astype(np.complex128)
        else:
            Z = arr.reshape(arr.shape[0], -1).astype(np.complex128)
    elif arr.ndim == 2:
        Z = arr.astype(np.complex128)
    else:
        X = np.zeros((len(iq_samples_list), len(FEATURE_NAMES)), dtype=np.float64)
        for i in range(len(iq_samples_list)):
            X[i] = extract_iq_features(iq_samples_list[i])
        return X

    N, L = Z.shape
    I = np.real(Z)
    Q = np.imag(Z)

    # 1. I & Q Raw Statistics
    mean_I = np.mean(I, axis=1)
    std_I = np.std(I, axis=1)
    var_I = np.var(I, axis=1)
    diff_I = I - mean_I[:, None]
    skew_I = np.mean((diff_I / (std_I[:, None] + 1e-9)) ** 3, axis=1)
    kurt_I = np.mean((diff_I / (std_I[:, None] + 1e-9)) ** 4, axis=1) - 3.0

    mean_Q = np.mean(Q, axis=1)
    std_Q = np.std(Q, axis=1)
    var_Q = np.var(Q, axis=1)
    diff_Q = Q - mean_Q[:, None]
    skew_Q = np.mean((diff_Q / (std_Q[:, None] + 1e-9)) ** 3, axis=1)
    kurt_Q = np.mean((diff_Q / (std_Q[:, None] + 1e-9)) ** 4, axis=1) - 3.0

    cross_corr_IQ = np.mean(diff_I * diff_Q, axis=1) / (std_I * std_Q + 1e-9)
    axis_ratio = var_I / (var_Q + 1e-9)

    # 2. Envelope & Amplitude Statistics
    env = np.abs(Z)
    mean_env = np.mean(env, axis=1)
    std_env = np.std(env, axis=1)
    var_env = np.var(env, axis=1)
    max_env = np.max(env, axis=1)
    min_env = np.min(env, axis=1)

    norm_env = env / (mean_env[:, None] + 1e-9)
    gamma_max = np.var(norm_env, axis=1)
    mean_sq_power = np.mean(env ** 2, axis=1)
    papr = np.max(env ** 2, axis=1) / (mean_sq_power + 1e-9)

    diff_env = env - mean_env[:, None]
    skew_env = np.mean((diff_env / (std_env[:, None] + 1e-9)) ** 3, axis=1)
    kurt_env = np.mean((diff_env / (std_env[:, None] + 1e-9)) ** 4, axis=1) - 3.0

    # 3. Phase Statistics
    phase = np.angle(Z)
    mean_phase = np.mean(phase, axis=1)
    std_phase = np.std(phase, axis=1)
    var_phase = np.var(phase, axis=1)

    if L > 1:
        dphi = np.angle(Z[:, 1:] * np.conj(Z[:, :-1]))
        mean_dphi = np.mean(dphi, axis=1)
        std_dphi = np.std(dphi, axis=1)
        var_dphi = np.var(dphi, axis=1)
    else:
        mean_dphi = np.zeros(N)
        std_dphi = np.zeros(N)
        var_dphi = np.zeros(N)

    # 4. Power Statistics
    power = env ** 2
    mean_power = np.mean(power, axis=1)
    std_power = np.std(power, axis=1)
    max_power = np.max(power, axis=1)
    min_power = np.min(power, axis=1)
    power_db = 10.0 * np.log10(mean_power + 1e-12)

    # 5. Higher-Order Cumulants
    zc = Z - np.mean(Z, axis=1, keepdims=True)
    m20 = np.mean(zc ** 2, axis=1)
    m21 = np.mean(np.abs(zc) ** 2, axis=1)
    m40 = np.mean(zc ** 4, axis=1)
    m42 = np.mean((zc ** 3) * np.conj(zc), axis=1)

    c20 = m20
    c40 = m40 - 3.0 * (m20 ** 2)
    c42 = m42 - (np.abs(m20) ** 2) - 2.0 * (m21 ** 2)

    norm_c20 = np.abs(c20) / (m21 + 1e-9)
    norm_c40 = np.abs(c40) / (m21 ** 2 + 1e-9)
    norm_c42 = np.abs(c42) / (m21 ** 2 + 1e-9)

    # 6. Spectral Features
    fft_vals = np.abs(np.fft.fft(Z, axis=1))
    psd = (fft_vals ** 2) / float(L)
    psd_shifted = np.fft.fftshift(psd, axes=1)

    max_psd_val = np.max(psd, axis=1)
    mean_psd_val = np.mean(psd, axis=1)
    median_psd_val = np.median(psd, axis=1)

    peak_to_mean_psd = max_psd_val / (mean_psd_val + 1e-9)
    peak_to_median_psd = max_psd_val / (median_psd_val + 1e-9)

    freq_indices = np.arange(L)
    total_psd = np.sum(psd, axis=1) + 1e-12
    spectral_centroid = np.sum(freq_indices[None, :] * psd, axis=1) / total_psd
    spectral_spread = np.sqrt(np.sum(((freq_indices[None, :] - spectral_centroid[:, None]) ** 2) * psd, axis=1) / total_psd)

    log_psd = np.log(psd + 1e-12)
    geom_mean = np.exp(np.mean(log_psd, axis=1))
    spectral_flatness = geom_mean / (mean_psd_val + 1e-9)

    half_l = L // 2
    pos_energy = np.sum(psd_shifted[:, half_l:], axis=1) + 1e-12
    neg_energy = np.sum(psd_shifted[:, :half_l], axis=1) + 1e-12
    pos_neg_energy_ratio = pos_energy / neg_energy

    # 7. Constellation Moments
    fourth_moment_I = np.mean(I ** 4, axis=1)
    fourth_moment_Q = np.mean(Q ** 4, axis=1)

    X = np.column_stack([
        mean_I, std_I, var_I, skew_I, kurt_I,
        mean_Q, std_Q, var_Q, skew_Q, kurt_Q,
        cross_corr_IQ, axis_ratio,
        mean_env, std_env, var_env, max_env, min_env,
        gamma_max, papr, skew_env, kurt_env,
        mean_phase, std_phase, var_phase,
        mean_dphi, std_dphi, var_dphi,
        mean_power, std_power, max_power, min_power, power_db,
        norm_c20, norm_c40, norm_c42,
        max_psd_val, mean_psd_val, median_psd_val,
        peak_to_mean_psd, peak_to_median_psd,
        spectral_centroid, spectral_spread, spectral_flatness,
        pos_neg_energy_ratio,
        fourth_moment_I, fourth_moment_Q
    ])

    return np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
