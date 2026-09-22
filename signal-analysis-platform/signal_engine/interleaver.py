import numpy as np

def deinterleave_bitstream(bit_string, method="Block", rows=8, cols=16, depth=4, seed=42):
    """
    De-interleaves binary bitstreams supporting:
    - Block De-interleaving (Matrix transpose: write column-by-column, read row-by-row)
    - Convolutional De-interleaving (Shift registers with variable delays)
    - Diagonal De-interleaving
    - Pseudo-Random De-interleaving (PRNG permutation using specified seed)
    Returns:
    - shuffled_bits: original input string
    - restored_bits: de-interleaved bit string
    - bit_mapping: sample list of index changes for UI visualization
    """
    clean_bits = "".join(c for c in bit_string if c in ['0', '1'])
    if not clean_bits:
        return {"shuffled_bits": "", "restored_bits": "", "bit_mapping": []}

    n = len(clean_bits)
    bits_arr = np.array([int(b) for b in clean_bits])

    method_type = (method or "Block").lower()
    restored_arr = bits_arr.copy()
    bit_mapping = []

    # 1. Block De-interleaving
    if "block" in method_type:
        block_size = rows * cols
        num_blocks = n // block_size
        
        restored_list = []
        for b_idx in range(num_blocks):
            block = bits_arr[b_idx * block_size : (b_idx + 1) * block_size]
            matrix = block.reshape((cols, rows)) # Transpose block write cols, read rows
            deint_block = matrix.T.flatten()
            restored_list.extend(deint_block)

        # Append remainder
        remainder = bits_arr[num_blocks * block_size:]
        restored_list.extend(remainder)
        restored_arr = np.array(restored_list)

    # 2. Pseudo-Random De-interleaving
    elif "pseudo" in method_type or "random" in method_type:
        rng = np.random.RandomState(seed)
        perm = rng.permutation(n)
        inv_perm = np.argsort(perm)
        restored_arr = bits_arr[inv_perm]

    # 3. Diagonal De-interleaving
    elif "diagonal" in method_type:
        block_size = rows * rows
        num_blocks = n // block_size
        restored_list = []
        for b_idx in range(num_blocks):
            block = bits_arr[b_idx * block_size : (b_idx + 1) * block_size]
            mat = block.reshape((rows, rows))
            # Shift rows diagonally
            for r in range(rows):
                mat[r] = np.roll(mat[r], -r)
            restored_list.extend(mat.flatten())
        restored_list.extend(bits_arr[num_blocks * block_size:])
        restored_arr = np.array(restored_list)

    # 4. Convolutional De-interleaving
    else:
        # Shift register delay matrix
        num_branches = depth
        restored_list = list(bits_arr)
        for i in range(len(bits_arr)):
            branch = i % num_branches
            shift = branch * 2
            src_idx = max(0, i - shift)
            restored_list[i] = bits_arr[src_idx]
        restored_arr = np.array(restored_list)

    restored_str = "".join(str(b) for b in restored_arr)

    # Build index mapping vector for frontend bit comparison graph
    max_vis = min(64, n)
    for i in range(max_vis):
        bit_mapping.append({
            "orig_idx": i,
            "orig_bit": int(bits_arr[i]),
            "restored_bit": int(restored_arr[i])
        })

    return {
        "shuffled_bits": clean_bits[:500],
        "restored_bits": restored_str[:500],
        "bit_mapping": bit_mapping,
        "method": method,
        "parameters": {"rows": rows, "cols": cols, "depth": depth, "seed": seed}
    }
