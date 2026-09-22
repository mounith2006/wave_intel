import zlib

def analyze_bitstream(bit_string, sync_pattern="1010101010110011"):
    """
    Performs complete bit-stream correlation, pattern search, preamble detection,
    header/payload extraction, and CRC-32 validation.
    """
    if not bit_string or not isinstance(bit_string, str):
        return {
            "raw_bits": "",
            "hex_data": "",
            "total_bits": 0,
            "sync_pattern": sync_pattern,
            "sync_found": False,
            "sync_index": -1,
            "correlation_score": 0.0,
            "header": "",
            "payload": "",
            "crc_valid": False,
            "crc_value": "0x00000000"
        }

    # Filter non-binary chars
    clean_bits = "".join(c for c in bit_string if c in ['0', '1'])
    total_bits = len(clean_bits)

    # 1. Convert to Hex
    byte_chunks = [clean_bits[i:i+8] for i in range(0, len(clean_bits) - (len(clean_bits) % 8), 8)]
    hex_bytes = []
    raw_byte_vals = []
    for chunk in byte_chunks:
        val = int(chunk, 2)
        raw_byte_vals.append(val)
        hex_bytes.append(f"{val:02X}")
    
    hex_data = " ".join(hex_bytes[:128]) # First 128 bytes in hex

    # 2. Pattern Correlation Search
    sync_len = len(sync_pattern)
    sync_found = False
    sync_index = -1
    max_corr = 0.0

    if total_bits >= sync_len:
        for idx in range(min(500, total_bits - sync_len)):
            window = clean_bits[idx : idx + sync_len]
            matches = sum(1 for a, b in zip(window, sync_pattern) if a == b)
            score = matches / sync_len
            if score > max_corr:
                max_corr = score
                if score >= 0.85 and not sync_found:
                    sync_found = True
                    sync_index = idx

    # 3. Header & Payload Separation & CRC Validation
    header_bits = ""
    payload_bits = ""
    crc_valid = False
    crc_hex = "Not analyzed"
    crc_status = "Not analyzed"

    if sync_found and sync_index >= 0:
        remaining_bits = clean_bits[sync_index + sync_len:]
        if len(remaining_bits) >= 48: # 16-bit header + 32-bit CRC payload
            header_bits = remaining_bits[:16]
            payload_bits = remaining_bits[16:-32]
            received_crc_bits = remaining_bits[-32:]
            try:
                payload_bytes = bytes([int(payload_bits[i:i+8], 2) for i in range(0, len(payload_bits)-7, 8)])
                crc_calc = zlib.crc32(payload_bytes) & 0xFFFFFFFF
                received_crc_val = int(received_crc_bits, 2)
                crc_hex = f"0x{crc_calc:08X}"
                if crc_calc == received_crc_val:
                    crc_valid = True
                    crc_status = "Valid"
                else:
                    crc_valid = False
                    crc_status = "Invalid"
            except Exception:
                crc_valid = False
                crc_status = "Not analyzed"

    return {
        "raw_bits": clean_bits[:500],
        "hex_data": hex_data if total_bits > 0 else "Not analyzed",
        "total_bits": total_bits,
        "sync_pattern": sync_pattern,
        "sync_found": sync_found,
        "sync_index": sync_index,
        "correlation_score": round(max_corr * 100.0, 1),
        "preamble_detected": sync_found,
        "header_detected": bool(sync_found and header_bits),
        "payload_detected": bool(sync_found and payload_bits),
        "preamble_status": "Detected" if sync_found else "Not analyzed",
        "header_status": "Detected" if (sync_found and header_bits) else "Not analyzed",
        "payload_status": "Detected" if (sync_found and payload_bits) else "Not analyzed",
        "header_bits": header_bits,
        "payload_bits": payload_bits[:200],
        "crc_valid": crc_valid,
        "crc_status": crc_status,
        "crc_value": crc_hex
    }
