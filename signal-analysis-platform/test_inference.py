import sys
import numpy as np

sys.path.append('c:\\2024039393\\wave\\wave_intel\\signal-analysis-platform')
from ml.predict import predict_modulation
import joblib

# Load test data to get real samples
try:
    test_data = joblib.load('c:\\2024039393\\wave\\wave_intel\\signal-analysis-platform\\ml\\results\\test_set.joblib')
    X_test = test_data['X_test_raw']
    y_test = test_data['y_test']
    snr_test = test_data['snr_test']
    classes = test_data['classes']
    
    print("Running Inference Verification on Real RadioML Samples:")
    
    np.random.seed(42)
    indices = np.random.choice(len(X_test), 5, replace=False)
    
    for i in indices:
        signal = X_test[i]
        true_cls = classes[y_test[i]]
        true_snr = snr_test[i]
        
        res = predict_modulation(signal)
        
        print(f"True: {true_cls:<7} | SNR: {true_snr:>3} dB | Predicted: {res['modulation']:<7} | Confidence: {res['confidence']:.4f} | Method: {res['classification_method']}")

except Exception as e:
    print(f"Test inference failed: {e}")
