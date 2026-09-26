import sys
import numpy as np

# Add the project root to path
sys.path.append('c:\\2024039393\\wave\\wave_intel\\signal-analysis-platform')

from ml.predict import predict_modulation

# Generate a random dummy signal to test the pipeline
# RadioML shape is typically (2, 128)
dummy_signal = np.random.randn(2, 128).astype(np.float32)

print("Testing prediction pipeline...")
res = predict_modulation(dummy_signal, sample_rate=1e6)

print(f"Modulation: {res.get('modulation')}")
print(f"Confidence: {res.get('confidence')}")
print(f"Classification Method: {res.get('classification_method')}")
print(f"Features Extracted: {len(res.get('features', {}))}")

if res.get('classification_method') != 'ML':
    print("ERROR: Fallback heuristic was triggered. ML pipeline is broken.")
    sys.exit(1)

print("SUCCESS: ML pipeline is fully operational!")
