import os
import numpy as np
import scipy.io.wavfile as wavfile
import struct

def add_awgn(signal, snr_db):
    """Adds Additive White Gaussian Noise to complex or real signal based on target SNR (dB)."""
    power_signal = np.mean(np.abs(signal) ** 2)
    snr_linear = 10.0 ** (snr_db / 10.0)
    power_noise = power_signal / snr_linear if snr_linear > 0 else 1e-6
    
    if np.iscomplexobj(signal):
        noise = (np.random.normal(0, np.sqrt(power_noise / 2.0), len(signal)) + 
                 1j * np.random.normal(0, np.sqrt(power_noise / 2.0), len(signal)))
    else:
        noise = np.random.normal(0, np.sqrt(power_noise), len(signal))
    
    return signal + noise

def generate_bpsk(fs=48000, fc=6000, rs=1000, num_symbols=1000, snr_db=20):
    """Generates BPSK modulated complex IQ signal and modulated carrier signal."""
    sps = int(fs // rs)
    bits = np.random.randint(0, 2, num_symbols)
    # Mapping 0 -> -1, 1 -> +1
    symbols = 2 * bits - 1
    
    # Square pulse shaping
    baseband_iq = np.repeat(symbols, sps).astype(np.complex128)
    
    # Carrier modulation
    t = np.arange(len(baseband_iq)) / fs
    carrier = np.exp(1j * 2 * np.pi * fc * t)
    rf_iq = baseband_iq * carrier
    
    # Add noise
    rf_iq_noisy = add_awgn(rf_iq, snr_db)
    real_waveform = np.real(rf_iq_noisy)
    
    return rf_iq_noisy, real_waveform, bits, fs

def generate_qpsk(fs=48000, fc=8000, rs=1000, num_symbols=1000, snr_db=20):
    """Generates QPSK modulated complex IQ signal and modulated carrier signal."""
    sps = int(fs // rs)
    num_bits = num_symbols * 2
    bits = np.random.randint(0, 2, num_bits)
    
    # Group pairs of bits into I and Q
    bits_i = bits[0::2]
    bits_q = bits[1::2]
    
    sym_i = 2 * bits_i - 1
    sym_q = 2 * bits_q - 1
    
    # Normalize QPSK constellation
    qpsk_symbols = (sym_i + 1j * sym_q) / np.sqrt(2)
    
    baseband_iq = np.repeat(qpsk_symbols, sps)
    t = np.arange(len(baseband_iq)) / fs
    carrier = np.exp(1j * 2 * np.pi * fc * t)
    rf_iq = baseband_iq * carrier
    
    rf_iq_noisy = add_awgn(rf_iq, snr_db)
    real_waveform = np.real(rf_iq_noisy)
    
    return rf_iq_noisy, real_waveform, bits, fs

def generate_fsk(fs=48000, fc=5000, f_dev=2000, rs=1000, num_symbols=1000, snr_db=20, num_levels=2):
    """Generates 2-FSK or 4-FSK modulated complex IQ signal and modulated carrier signal."""
    sps = int(fs // rs)
    bits_per_sym = int(np.log2(num_levels))
    num_bits = num_symbols * bits_per_sym
    bits = np.random.randint(0, 2, num_bits)
    
    if num_levels == 2:
        # 2-FSK: mapping 0 -> -f_dev, 1 -> +f_dev
        freq_offsets = (2 * bits - 1) * f_dev
    else:
        # 4-FSK
        sym_indices = bits[0::2] * 2 + bits[1::2]
        # map 0,1,2,3 -> -3, -1, +1, +3
        mapping = np.array([-3, -1, 1, 3])
        freq_offsets = mapping[sym_indices] * (f_dev / 3.0)
    
    freq_sampled = np.repeat(freq_offsets, sps)
    t = np.arange(len(freq_sampled)) / fs
    
    # Continuous phase integration
    phase = 2 * np.pi * (fc + freq_sampled) * t
    rf_iq = np.exp(1j * phase)
    
    rf_iq_noisy = add_awgn(rf_iq, snr_db)
    real_waveform = np.real(rf_iq_noisy)
    
    return rf_iq_noisy, real_waveform, bits, fs

def generate_qam16(fs=48000, fc=10000, rs=1000, num_symbols=1000, snr_db=22):
    """Generates 16-QAM modulated complex IQ signal and modulated carrier signal."""
    sps = int(fs // rs)
    bits = np.random.randint(0, 2, num_symbols * 4)
    
    # 4 bits per symbol -> 16-QAM
    b0 = bits[0::4]
    b1 = bits[1::4]
    b2 = bits[2::4]
    b3 = bits[3::4]
    
    # Map 2 bits to 4 PAM levels (-3, -1, +1, +3)
    map_pam = lambda bit_a, bit_b: (2 * bit_a - 1) * (2 - (1 if bit_b == 1 else -1)) # Standard 16QAM mapping
    
    # Simple mapping:
    # 00 -> -3, 01 -> -1, 11 -> +1, 10 -> +3
    def bits_to_level(b_hi, b_lo):
        val = b_hi * 2 + b_lo
        mapping = np.array([-3.0, -1.0, 3.0, 1.0])
        return mapping[val]
    
    i_levels = bits_to_level(b0, b1)
    q_levels = bits_to_level(b2, b3)
    
    # Normalize 16-QAM power (mean power of -3,-1,1,3 is (9+1+1+9)/4 = 5 per dim => avg power = 10)
    symbols = (i_levels + 1j * q_levels) / np.sqrt(10.0)
    
    baseband_iq = np.repeat(symbols, sps)
    t = np.arange(len(baseband_iq)) / fs
    carrier = np.exp(1j * 2 * np.pi * fc * t)
    rf_iq = baseband_iq * carrier
    
    rf_iq_noisy = add_awgn(rf_iq, snr_db)
    real_waveform = np.real(rf_iq_noisy)
    
    return rf_iq_noisy, real_waveform, bits, fs

def generate_cw(norm_freq=0.0625, num_samples=57600):
    """Generates unmodulated continuous wave (CW / Single Tone) signal with normalized frequency +0.0625."""
    t = np.arange(num_samples)
    phase = 2.0 * np.pi * norm_freq * t
    complex_signal = 32766.0 * np.exp(1j * phase)
    return complex_signal

def save_wav(filename, real_signal, fs):
    """Saves real signal waveform to 16-bit PCM WAV file."""
    norm_sig = real_signal / (np.max(np.abs(real_signal)) + 1e-9)
    pcm_sig = (norm_sig * 32767).astype(np.int16)
    wavfile.write(filename, fs, pcm_sig)

def save_iq(filename, complex_signal):
    """Saves complex signal to raw float32 IQ file (interleaved I, Q float32 pairs)."""
    iq_interleaved = np.empty(len(complex_signal) * 2, dtype=np.float32)
    iq_interleaved[0::2] = np.real(complex_signal).astype(np.float32)
    iq_interleaved[1::2] = np.imag(complex_signal).astype(np.float32)
    with open(filename, 'wb') as f:
        f.write(iq_interleaved.tobytes())

def save_int16_iq(filename, complex_signal):
    """Saves complex signal to raw int16 IQ file (interleaved I, Q int16 pairs)."""
    iq_interleaved = np.empty(len(complex_signal) * 2, dtype=np.int16)
    iq_interleaved[0::2] = np.real(complex_signal).astype(np.int16)
    iq_interleaved[1::2] = np.imag(complex_signal).astype(np.int16)
    with open(filename, 'wb') as f:
        f.write(iq_interleaved.tobytes())

def generate_all_samples(output_dir):
    """Generates all standard demonstration files required by AntiGravity Prompt."""
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Generating synthetic demonstration signals in: {output_dir}")
    
    # 1. BPSK
    bpsk_iq, bpsk_real, _, fs = generate_bpsk(fs=48000, fc=6000, rs=1000, num_symbols=1200, snr_db=20)
    save_wav(os.path.join(output_dir, "sample_bpsk.wav"), bpsk_real, fs)
    print(" -> Created sample_bpsk.wav")
    
    # 2. QPSK
    qpsk_iq, qpsk_real, _, fs = generate_qpsk(fs=48000, fc=8000, rs=1000, num_symbols=1200, snr_db=22)
    save_wav(os.path.join(output_dir, "sample_qpsk.wav"), qpsk_real, fs)
    print(" -> Created sample_qpsk.wav")
    
    # 3. FSK
    fsk_iq, fsk_real, _, fs = generate_fsk(fs=48000, fc=5000, f_dev=2500, rs=1000, num_symbols=1200, snr_db=20, num_levels=2)
    save_wav(os.path.join(output_dir, "sample_fsk.wav"), fsk_real, fs)
    print(" -> Created sample_fsk.wav")
    
    # 4. 16-QAM
    qam16_iq, qam16_real, _, fs = generate_qam16(fs=48000, fc=10000, rs=1000, num_symbols=1200, snr_db=24)
    save_wav(os.path.join(output_dir, "sample_qam16.wav"), qam16_real, fs)
    print(" -> Created sample_qam16.wav")
    
    # 5. Raw IQ (sample_iq.iq - QPSK signal)
    save_iq(os.path.join(output_dir, "sample_iq.iq"), qpsk_iq)
    print(" -> Created sample_iq.iq")
    
    # 6. CW / Single Tone (sample_cw.iq)
    cw_complex = generate_cw(norm_freq=0.0625, num_samples=57600)
    save_int16_iq(os.path.join(output_dir, "sample_cw.iq"), cw_complex)
    print(" -> Created sample_cw.iq")

    print("Sample signal generation complete!")

if __name__ == "__main__":
    # Target directory: uploads directory of signal-analysis-platform
    target_uploads = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
    generate_all_samples(target_uploads)
