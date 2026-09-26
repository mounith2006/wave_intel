import os
import sys
import json
import joblib
import numpy as np

from ml.features import extract_iq_features

# Global model cache to avoid reloading from disk on every HTTP request
_CACHED_MODEL_ARTIFACT = None
_CACHED_MODEL_PATH = None

def get_model_artifact(model_dir="models"):
    global _CACHED_MODEL_ARTIFACT, _CACHED_MODEL_PATH

    model_path = os.path.join(model_dir, "radioml_modulation_model.joblib")
    if not os.path.exists(model_path):
        # Fallback check relative to signal_engine or workspace root
        alt_paths = [
            "models/radioml_modulation_model.joblib",
            "../models/radioml_modulation_model.joblib",
            os.path.join(os.path.dirname(__file__), "..", "models", "radioml_modulation_model.joblib")
        ]
        found = None
        for p in alt_paths:
            abs_p = os.path.abspath(p)
            if os.path.exists(abs_p):
                found = abs_p
                break
        if not found:
            return None
        model_path = found

    abs_model_path = os.path.abspath(model_path)
    if _CACHED_MODEL_ARTIFACT is not None and _CACHED_MODEL_PATH == abs_model_path:
        return _CACHED_MODEL_ARTIFACT

    try:
        artifact = joblib.load(abs_model_path)
        _CACHED_MODEL_ARTIFACT = artifact
        _CACHED_MODEL_PATH = abs_model_path
        print(f"[ML Predict] Loaded trained ML model from: {abs_model_path}", flush=True)
        return artifact
    except Exception as e:
        print(f"[ML Predict Error] Failed to load ML model from {abs_model_path}: {e}", file=sys.stderr, flush=True)
        return None

def predict_modulation(iq_samples, sample_rate=None, model_dir="models"):
    """
    Main reusable prediction entry point.
    Attempts to predict modulation using trained ML model if present;
    otherwise gracefully falls back to statistical heuristic rules.

    Returns dict containing:
    - modulation: str
    - confidence: float (0.00 to 1.00)
    - classification_method: "ML" or "HEURISTIC"
    - model_name: str
    - probabilities: dict (if ML)
    - features: dict
    """
    artifact = get_model_artifact(model_dir=model_dir)

    if artifact is not None:
        try:
            clf = artifact["classifier"]
            scaler = artifact["scaler"]
            classes = artifact["classes"]

            # Extract exact 46 features that the model was trained on
            feats_vec = extract_iq_features(iq_samples, fs=sample_rate)
            feats_scaled = scaler.transform([feats_vec])

            # Predict probabilities
            probs = clf.predict_proba(feats_scaled)[0]
            top_idx = int(np.argmax(probs))
            pred_class = str(classes[top_idx])
            top_prob = float(probs[top_idx])

            prob_dict = {str(classes[i]): round(float(probs[i]), 4) for i in range(len(classes))}

            feat_names = artifact.get("feature_names", [])
            feats_dict = {name: round(float(val), 4) for name, val in zip(feat_names, feats_vec)} if len(feat_names) == len(feats_vec) else {}

            return {
                "modulation": pred_class,
                "confidence": round(top_prob, 4),
                "classification_method": "ML",
                "model_name": "RadioML RandomForest Classifier",
                "probabilities": prob_dict,
                "features": feats_dict
            }
        except Exception as e:
            print(f"[ML Predict Error] Inference failed: {e}. Safely falling back to heuristic classifier.", file=sys.stderr, flush=True)

    # HEURISTIC FALLBACK
    try:
        from signal_engine.classifier import classify_modulation_heuristic
        fallback_res = classify_modulation_heuristic(iq_samples, sample_rate)
        fallback_res["classification_method"] = "HEURISTIC"
        fallback_res["model_name"] = "Statistical Heuristic Rules"
        return fallback_res
    except Exception as e:
        print(f"[ML Predict Error] Heuristic fallback error: {e}", file=sys.stderr, flush=True)
        return {
            "modulation": "Unknown / Error",
            "confidence": 0.0,
            "classification_method": "HEURISTIC",
            "model_name": "Fallback Error",
            "probabilities": {},
            "features": {}
        }
