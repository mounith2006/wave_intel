import numpy as np
from scipy import signal as dsp_signal
from scipy import stats

FEATURE_NAMES = [
    "mean_I", "std_I", "var_I", "skew_I", "kurt_I",
    "mean_Q", "std_Q", "var_Q", "skew_Q", "kurt_Q",
    "cross_corr_IQ", "axis_ratio",
    "mean_env", "std_env", "var_env", "max_env", "min_env",
    "gamma_max", "papr", "skew_env", "kurt_env",
    "radius_var", "radius_ratio", "fourth_moment_I", "fourth_moment_Q", "sixth_moment_I", "sixth_moment_Q",
    "mean_phase", "std_phase", "var_phase",
    "mean_dphi", "std_dphi", "var_dphi", "skew_dphi", "kurt_dphi",
    "dphi_p10", "dphi_p25", "dphi_p50", "dphi_p75", "dphi_p90", "dphi_zc",
    "norm_c20", "norm_c40", "norm_c41", "norm_c42", "norm_c60", "norm_c63", 
    "angle_c20", "angle_c40", "angle_c42", "angle_c60", "angle_c63", # Added 3 features to reach exactly 64
    "max_psd_val", "mean_psd_val", "median_psd_val",
    "peak_to_mean_psd", "peak_to_median_psd",
    "spectral_centroid", "spectral_spread", "spectral_skewness", "spectral_flatness",
    "pos_neg_energy_ratio", "asym_energy_diff", "raw_power_db"
]

def extract_iq_features(iq_samples, fs=None):
    res = batch_extract_features([iq_samples], verbose=False)
    if len(res) > 0:
        return res[0]
    return np.zeros(len(FEATURE_NAMES), dtype=np.float64)

def batch_extract_features(iq_samples_list, verbose=True):
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
        Z = arr.reshape(1, -1).astype(np.complex128)

    N, L = Z.shape
    if L == 0:
        return np.zeros((N, len(FEATURE_NAMES)), dtype=np.float64)

    power_per_sample = np.mean(np.abs(Z)**2, axis=1, keepdims=True) + 1e-12
    Z_norm = Z / np.sqrt(power_per_sample)
    
    I = np.real(Z_norm)
    Q = np.imag(Z_norm)
    env = np.abs(Z_norm)
    
    mean_I = np.mean(I, axis=1)
    std_I = np.std(I, axis=1)
    var_I = np.var(I, axis=1)
    diff_I = I - mean_I[:, None]
    skew_I = np.mean((diff_I / (std_I[:, None] + 1e-9))**3, axis=1)
    kurt_I = np.mean((diff_I / (std_I[:, None] + 1e-9))**4, axis=1) - 3.0
    
    mean_Q = np.mean(Q, axis=1)
    std_Q = np.std(Q, axis=1)
    var_Q = np.var(Q, axis=1)
    diff_Q = Q - mean_Q[:, None]
    skew_Q = np.mean((diff_Q / (std_Q[:, None] + 1e-9))**3, axis=1)
    kurt_Q = np.mean((diff_Q / (std_Q[:, None] + 1e-9))**4, axis=1) - 3.0
    
    cross_corr_IQ = np.mean(diff_I * diff_Q, axis=1) / (std_I * std_Q + 1e-9)
    axis_ratio = var_I / (var_Q + 1e-9)
    
    mean_env = np.mean(env, axis=1)
    std_env = np.std(env, axis=1)
    var_env = np.var(env, axis=1)
    max_env = np.max(env, axis=1)
    min_env = np.min(env, axis=1)
    gamma_max = var_env
    papr = (max_env**2) / (np.mean(env**2, axis=1) + 1e-9)
    diff_env = env - mean_env[:, None]
    skew_env = np.mean((diff_env / (std_env[:, None] + 1e-9))**3, axis=1)
    kurt_env = np.mean((diff_env / (std_env[:, None] + 1e-9))**4, axis=1) - 3.0
    
    radius_var = np.var(env**2, axis=1)
    radius_ratio = np.mean(env**4, axis=1) / ((np.mean(env**2, axis=1))**2 + 1e-9)
    fourth_moment_I = np.mean(I**4, axis=1)
    fourth_moment_Q = np.mean(Q**4, axis=1)
    sixth_moment_I = np.mean(I**6, axis=1)
    sixth_moment_Q = np.mean(Q**6, axis=1)
    
    phase = np.angle(Z_norm)
    mean_phase = np.mean(phase, axis=1)
    std_phase = np.std(phase, axis=1)
    var_phase = np.var(phase, axis=1)
    
    if L > 1:
        dphi = np.angle(Z_norm[:, 1:] * np.conj(Z_norm[:, :-1]))
        mean_dphi = np.mean(dphi, axis=1)
        std_dphi = np.std(dphi, axis=1)
        var_dphi = np.var(dphi, axis=1)
        diff_dphi = dphi - mean_dphi[:, None]
        skew_dphi = np.mean((diff_dphi / (std_dphi[:, None] + 1e-9))**3, axis=1)
        kurt_dphi = np.mean((diff_dphi / (std_dphi[:, None] + 1e-9))**4, axis=1) - 3.0
        
        abs_dphi = np.abs(dphi)
        dphi_p10 = np.percentile(abs_dphi, 10, axis=1)
        dphi_p25 = np.percentile(abs_dphi, 25, axis=1)
        dphi_p50 = np.percentile(abs_dphi, 50, axis=1)
        dphi_p75 = np.percentile(abs_dphi, 75, axis=1)
        dphi_p90 = np.percentile(abs_dphi, 90, axis=1)
        
        dphi_zc = np.sum((dphi[:, 1:] * dphi[:, :-1]) < 0, axis=1) / float(L - 2)
    else:
        mean_dphi = np.zeros(N)
        std_dphi = np.zeros(N)
        var_dphi = np.zeros(N)
        skew_dphi = np.zeros(N)
        kurt_dphi = np.zeros(N)
        dphi_p10 = np.zeros(N)
        dphi_p25 = np.zeros(N)
        dphi_p50 = np.zeros(N)
        dphi_p75 = np.zeros(N)
        dphi_p90 = np.zeros(N)
        dphi_zc = np.zeros(N)
    
    zc = Z_norm - np.mean(Z_norm, axis=1, keepdims=True)
    m20 = np.mean(zc**2, axis=1)
    m21 = np.mean(np.abs(zc)**2, axis=1)
    m40 = np.mean(zc**4, axis=1)
    m41 = np.mean((zc**3) * np.conj(zc), axis=1)
    m42 = np.mean((np.abs(zc)**2) * (zc**2), axis=1)
    m60 = np.mean(zc**6, axis=1)
    m63 = np.mean(np.abs(zc)**6, axis=1)
    
    c20 = m20
    c40 = m40 - 3.0 * (m20**2)
    c41 = m41 - 3.0 * m20 * m21
    c42 = m42 - np.abs(m20)**2 - 2.0 * (m21**2)
    c60 = m60 - 15.0 * c40 * m20 - 30.0 * (m20**3)
    c63 = m63 - 6.0 * np.abs(c42) * m21 - 9.0 * np.abs(c40) * np.conj(m20) - 18.0 * m20 * (m21**2)
    
    norm_c20 = np.abs(c20) / (m21 + 1e-9)
    norm_c40 = np.abs(c40) / (m21**2 + 1e-9)
    norm_c41 = np.abs(c41) / (m21**2 + 1e-9)
    norm_c42 = np.abs(c42) / (m21**2 + 1e-9)
    norm_c60 = np.abs(c60) / (m21**3 + 1e-9)
    norm_c63 = np.abs(c63) / (m21**3 + 1e-9)
    
    angle_c20 = np.angle(c20)
    angle_c40 = np.angle(c40)
    angle_c42 = np.angle(c42)
    angle_c60 = np.angle(c60)
    angle_c63 = np.angle(c63)
    
    fft_vals = np.abs(np.fft.fft(Z_norm, axis=1))
    psd = (fft_vals**2) / float(L)
    psd_shifted = np.fft.fftshift(psd, axes=1)
    
    max_psd_val = np.max(psd, axis=1)
    mean_psd_val = np.mean(psd, axis=1)
    median_psd_val = np.median(psd, axis=1)
    
    peak_to_mean_psd = max_psd_val / (mean_psd_val + 1e-9)
    peak_to_median_psd = max_psd_val / (median_psd_val + 1e-9)
    
    freq_indices = np.arange(L)
    total_psd = np.sum(psd, axis=1) + 1e-12
    spectral_centroid = np.sum(freq_indices[None, :] * psd, axis=1) / total_psd
    spectral_spread = np.sqrt(np.sum(((freq_indices[None, :] - spectral_centroid[:, None])**2) * psd, axis=1) / total_psd)
    spectral_skewness = np.sum(((freq_indices[None, :] - spectral_centroid[:, None])**3) * psd, axis=1) / (spectral_spread**3 * total_psd + 1e-9)
    
    log_psd = np.log(psd + 1e-12)
    geom_mean = np.exp(np.mean(log_psd, axis=1))
    spectral_flatness = geom_mean / (mean_psd_val + 1e-9)
    
    half_l = L // 2
    pos_energy = np.sum(psd_shifted[:, half_l:], axis=1) + 1e-12
    neg_energy = np.sum(psd_shifted[:, :half_l], axis=1) + 1e-12
    pos_neg_energy_ratio = pos_energy / neg_energy
    asym_energy_diff = (pos_energy - neg_energy) / (pos_energy + neg_energy)
    
    raw_power_db = 10.0 * np.log10(power_per_sample.squeeze() + 1e-12)
    
    X = np.column_stack([
        mean_I, std_I, var_I, skew_I, kurt_I,
        mean_Q, std_Q, var_Q, skew_Q, kurt_Q,
        cross_corr_IQ, axis_ratio,
        mean_env, std_env, var_env, max_env, min_env,
        gamma_max, papr, skew_env, kurt_env,
        radius_var, radius_ratio, fourth_moment_I, fourth_moment_Q, sixth_moment_I, sixth_moment_Q,
        mean_phase, std_phase, var_phase,
        mean_dphi, std_dphi, var_dphi, skew_dphi, kurt_dphi,
        dphi_p10, dphi_p25, dphi_p50, dphi_p75, dphi_p90, dphi_zc,
        norm_c20, norm_c40, norm_c41, norm_c42, norm_c60, norm_c63, angle_c20, angle_c40, angle_c42, angle_c60, angle_c63,
        max_psd_val, mean_psd_val, median_psd_val,
        peak_to_mean_psd, peak_to_median_psd,
        spectral_centroid, spectral_spread, spectral_skewness, spectral_flatness,
        pos_neg_energy_ratio, asym_energy_diff, raw_power_db
    ])
    
    return np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
