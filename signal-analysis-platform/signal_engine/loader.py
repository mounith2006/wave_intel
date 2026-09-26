import os
import numpy as np
import scipy.io.wavfile as wavfile
try:
    import soundfile as sf
except ImportError:
    sf = None

class SignalLoadError(Exception):
    def __init__(self, message, stage="iq_validation"):
        self.message = message
        self.stage = stage
        super().__init__(message)

def load_signal_file(file_path, default_fs=48000):
    """
    Loads a .WAV or .IQ file and returns:
    - complex_or_real_data: np.ndarray (complex128/64 for IQ, float64 for WAV)
    - fs: float or None (sampling frequency in Hz)
    - metadata: dict containing file properties
    """
    if not os.path.exists(file_path):
        raise SignalLoadError(f"Signal file not found: {file_path}", stage="iq_validation")
    
    file_name = os.path.basename(file_path)
    file_size_bytes = os.path.getsize(file_path)
    ext = os.path.splitext(file_name)[1].lower()
    
    detected_format = "unknown"
    
    if ext == ".wav":
        detected_format = "wav_audio"
        try:
            if sf is None:
                raise ImportError("soundfile not installed, using scipy fallback")
            data, fs = sf.read(file_path)
            # If stereo, treat channel 0 as I and channel 1 as Q, or merge
            if data.ndim == 2:
                if data.shape[1] >= 2:
                    complex_data = data[:, 0] + 1j * data[:, 1]
                    is_complex = True
                else:
                    complex_data = data[:, 0].astype(np.float64)
                    is_complex = False
            else:
                complex_data = data.astype(np.float64)
                is_complex = False
        except Exception:
            # Fallback to scipy wavfile
            try:
                fs, raw_data = wavfile.read(file_path)
                if raw_data.dtype == np.int16:
                    data = raw_data.astype(np.float64) / 32768.0
                elif raw_data.dtype == np.int32:
                    data = raw_data.astype(np.float64) / 2147483648.0
                else:
                    data = raw_data.astype(np.float64)
                
                if data.ndim == 2:
                    complex_data = data[:, 0] + 1j * data[:, 1]
                    is_complex = True
                else:
                    complex_data = data
                    is_complex = False
            except Exception as e:
                raise SignalLoadError(f"Failed to load WAV file '{file_name}': {str(e)}", stage="iq_validation")

    elif ext in [".iq", ".raw", ".bin", ".dat"]:
        fs = default_fs if (default_fs is not None and int(default_fs) > 0) else None
        # Try float32 interleaved IQ
        try:
            raw = np.fromfile(file_path, dtype=np.float32)
            if len(raw) < 2 or not np.isfinite(raw[:1000]).all():
                raise ValueError("Not valid float32 IQ data")
            if len(raw) % 2 != 0:
                raw = raw[:len(raw) - 1]
            i_samples = raw[0::2].astype(np.float64)
            q_samples = raw[1::2].astype(np.float64)
            c_test = i_samples[:min(10000, len(i_samples))] + 1j * q_samples[:min(10000, len(q_samples))]
            m_test = float(np.mean(np.abs(c_test)))
            if m_test < 1e-5 or m_test > 1e5:
                raise ValueError("Float32 interpretation produced non-normalized/denormalized values")
            complex_data = i_samples + 1j * q_samples
            is_complex = True
            detected_format = "float32_interleaved"
        except Exception:
            # Fallback try int16 interleaved IQ
            try:
                raw = np.fromfile(file_path, dtype=np.int16)
                if len(raw) < 2 or not np.isfinite(raw[:1000]).all():
                    raise ValueError("Not valid int16 IQ data")
                if len(raw) % 2 != 0:
                    raw = raw[:len(raw) - 1]
                i_samples = raw[0::2].astype(np.float64) / 32768.0
                q_samples = raw[1::2].astype(np.float64) / 32768.0
                complex_data = i_samples + 1j * q_samples
                is_complex = True
                detected_format = "int16_interleaved"
            except Exception as e:
                raise SignalLoadError(f"Failed to parse IQ file '{file_name}': raw binary format unknown or empty", stage="iq_validation")

    else:
        raise SignalLoadError(f"Unsupported signal format extension: '{ext}'. Must be .wav or .iq", stage="iq_validation")

    num_samples = len(complex_data)
    has_nan = bool(np.isnan(complex_data).any())
    has_inf = bool(np.isinf(complex_data).any())
    
    real_min = float(np.min(np.real(complex_data))) if num_samples > 0 else 0.0
    real_max = float(np.max(np.real(complex_data))) if num_samples > 0 else 0.0
    imag_min = float(np.min(np.imag(complex_data))) if num_samples > 0 else 0.0
    imag_max = float(np.max(np.imag(complex_data))) if num_samples > 0 else 0.0
    mag = np.abs(complex_data) if num_samples > 0 else np.array([0.0])
    mag_min = float(np.min(mag)) if num_samples > 0 else 0.0
    mag_max = float(np.max(mag)) if num_samples > 0 else 0.0
    mag_mean = float(np.mean(mag)) if num_samples > 0 else 0.0

    print(f"[IQ] detected_format={detected_format}")
    print(f"[IQ] file={file_name}")
    print(f"[IQ] size={file_size_bytes}")
    print(f"[IQ] dtype={complex_data.dtype}")
    print(f"[IQ] samples={num_samples}")
    print(f"[IQ] real_min={real_min}")
    print(f"[IQ] real_max={real_max}")
    print(f"[IQ] imag_min={imag_min}")
    print(f"[IQ] imag_max={imag_max}")
    print(f"[IQ] magnitude_min={mag_min}")
    print(f"[IQ] magnitude_max={mag_max}")
    print(f"[IQ] magnitude_mean={mag_mean}")
    print(f"[IQ] has_nan={has_nan}")
    print(f"[IQ] has_inf={has_inf}")
    print(f"[IQ] sample_rate={fs}")

    if num_samples == 0:
        raise SignalLoadError(f"Uploaded signal file '{file_name}' contains 0 samples", stage="iq_validation")

    if has_nan or has_inf:
        raise SignalLoadError(f"Uploaded signal file '{file_name}' contains NaN or Inf values", stage="iq_validation")

    if mag_max == 0.0:
        raise SignalLoadError("Uploaded IQ file contains no non-zero signal samples", stage="iq_validation")

    duration_sec = float(num_samples) / float(fs) if (fs is not None and fs > 0) else 0.0
    
    metadata = {
        "file_name": file_name,
        "file_path": file_path,
        "file_size": file_size_bytes,
        "duration": round(duration_sec, 4),
        "sample_rate": int(fs) if (fs is not None and fs > 0) else None,
        "num_samples": num_samples,
        "is_complex": is_complex,
        "format": "Complex IQ" if is_complex else "Real PCM WAV",
        "detected_format": detected_format
    }
    
    return complex_data, fs, metadata

