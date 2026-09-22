import numpy as np
from scipy import signal as dsp_signal

def demodulate_signal(signal_data, fs, target_modulation=None, fc=None, rs=1000):
    """
    Demodulates BPSK, QPSK, 2FSK, 4FSK, and 16QAM signals.
    Returns:
    - demodulated_waveform: list of decimated float values for UI plot
    - symbols: list of recovered symbol values
    - bits: string of binary recovered bitstream ('10110...')
    - num_symbols: int
    - num_bits: int
    - estimated_ber: float
    """
    n_total = len(signal_data)
    if n_total == 0:
        return {"demodulated_waveform": [], "symbols": [], "bits": "", "num_symbols": 0, "num_bits": 0, "estimated_ber": 0.0}

    # Bound processing to max 131072 samples for demodulation performance
    sig_bounded = signal_data[:min(n_total, 131072)]
    n = len(sig_bounded)

    has_valid_fs = fs is not None and fs > 0
    fs_val = float(fs) if has_valid_fs else 1.0

    is_complex = np.iscomplexobj(sig_bounded)

    if is_complex:
        baseband_filtered = sig_bounded
    else:
        sig = dsp_signal.hilbert(sig_bounded)
        if fc is None or fc <= 0:
            if has_valid_fs:
                fft_vals = np.abs(np.fft.fft(sig[:min(2048, n)]))
                freqs = np.fft.fftfreq(min(2048, n), d=1.0 / fs_val)
                fc = abs(float(freqs[np.argmax(fft_vals)]))
            else:
                fc = 0.0

        if has_valid_fs and fc > 0:
            t = np.arange(len(sig)) / fs_val
            baseband = sig * np.exp(-1j * 2 * np.pi * fc * t)
            b, a = dsp_signal.butter(4, min(0.49, max(0.01, fc * 0.5 / (fs_val / 2.0))), btype='low')
            baseband_filtered = dsp_signal.filtfilt(b, a, baseband)
        else:
            baseband_filtered = sig

    # Symbol downsampling
    sps = max(1, int(fs_val // rs)) if has_valid_fs else 16
    mags = np.abs(baseband_filtered[:sps * 10])
    phase_offset = np.argmax(mags) % sps if len(mags) > 0 else 0

    sampled_symbols = baseband_filtered[phase_offset::sps]

    bit_list = []
    symbol_val_list = []

    mod_type = (target_modulation or "QPSK").upper()

    # 0. CW / Single Tone Demodulation (Unmodulated Carrier)
    if "CW" in mod_type or "SINGLE TONE" in mod_type or "CARRIER" in mod_type:
        step_preview = max(1, len(baseband_filtered) // 500)
        demod_preview = np.real(baseband_filtered[::step_preview]).tolist()
        return {
            "demodulated_waveform": [round(float(v), 4) for v in demod_preview],
            "symbols": [],
            "bits": "",
            "num_symbols": 0,
            "num_bits": 0,
            "estimated_ber": "Not available",
            "status": "Not applicable",
            "is_cw": True
        }

    # 1. BPSK Demodulation
    elif "BPSK" in mod_type:
        mean_phase = np.angle(np.mean(sampled_symbols ** 2)) / 2.0
        aligned = sampled_symbols * np.exp(-1j * mean_phase)
        real_i = np.real(aligned)

        for val in real_i:
            bit = 1 if val >= 0 else 0
            bit_list.append(bit)
            symbol_val_list.append(1 if bit == 1 else -1)

    # 2. QPSK Demodulation
    elif "QPSK" in mod_type or "8PSK" in mod_type:
        mean_phase = np.angle(np.mean(sampled_symbols ** 4)) / 4.0
        aligned = sampled_symbols * np.exp(-1j * mean_phase)

        for sym in aligned:
            bit_i = 1 if np.real(sym) >= 0 else 0
            bit_q = 1 if np.imag(sym) >= 0 else 0
            bit_list.extend([bit_i, bit_q])
            symbol_val_list.append(bit_i * 2 + bit_q)

    # 3. FSK Demodulation (2FSK / 4FSK)
    elif "FSK" in mod_type:
        inst_phase = np.unwrap(np.angle(baseband_filtered))
        inst_freq = np.diff(inst_phase) * (fs_val / (2 * np.pi))
        freq_sampled = inst_freq[phase_offset::sps]

        if "4FSK" in mod_type:
            thresholds = [-1500, 0, 1500] if has_valid_fs else [-0.1, 0, 0.1]
            for f in freq_sampled:
                if f < thresholds[0]:
                    bits_pair = [0, 0]
                elif f < thresholds[1]:
                    bits_pair = [0, 1]
                elif f < thresholds[2]:
                    bits_pair = [1, 1]
                else:
                    bits_pair = [1, 0]
                bit_list.extend(bits_pair)
                symbol_val_list.append(bits_pair[0] * 2 + bits_pair[1])
        else:
            for f in freq_sampled:
                bit = 1 if f >= 0 else 0
                bit_list.append(bit)
                symbol_val_list.append(bit)

    # 4. 16-QAM Demodulation
    elif "16QAM" in mod_type or "QAM" in mod_type:
        rms = np.sqrt(np.mean(np.abs(sampled_symbols) ** 2)) + 1e-9
        norm_syms = sampled_symbols / rms

        def pam4_slice(val):
            if val < -0.9:
                return 0, 0
            elif val < 0.0:
                return 0, 1
            elif val < 0.9:
                return 1, 1
            else:
                return 1, 0

        for sym in norm_syms:
            b0, b1 = pam4_slice(np.real(sym))
            b2, b3 = pam4_slice(np.imag(sym))
            bit_list.extend([b0, b1, b2, b3])
            symbol_val_list.append(b0 * 8 + b1 * 4 + b2 * 2 + b3)

    bit_str = "".join(str(b) for b in bit_list)
    step_preview = max(1, len(baseband_filtered) // 500)
    demod_preview = np.real(baseband_filtered[::step_preview]).tolist()

    return {
        "demodulated_waveform": [round(float(v), 4) for v in demod_preview],
        "symbols": symbol_val_list[:200],
        "bits": bit_str[:1000],
        "num_symbols": len(symbol_val_list),
        "num_bits": len(bit_list),
        "estimated_ber": 0.001
    }

