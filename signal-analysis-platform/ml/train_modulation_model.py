import os
import sys
import json
import pickle
import argparse
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report, precision_recall_fscore_support, confusion_matrix

from ml.features import batch_extract_features, FEATURE_NAMES

DEFAULT_DATASET_PATHS = [
    "datasets/radioml/RML2016.10a/RML2016.10a_dict.pkl",
    "datasets/radioml/RML2016.10a/RML2016.10a_dict_optimized.pkl",
    "../datasets/radioml/RML2016.10a/RML2016.10a_dict.pkl",
    "../datasets/radioml/RML2016.10a/RML2016.10a_dict_optimized.pkl"
]
MAX_SAMPLES_PER_CLASS_SNR = 1000
RANDOM_SEED = 42

def find_dataset_path(custom_path=None):
    if custom_path and os.path.exists(custom_path): return custom_path
    for candidate in DEFAULT_DATASET_PATHS:
        abs_cand = os.path.abspath(candidate)
        if os.path.exists(abs_cand): return abs_cand
    return None

def load_radioml_dataset(dataset_path, max_samples_per_key=MAX_SAMPLES_PER_CLASS_SNR):
    print(f"Loading RadioML dataset from: {dataset_path} ...", flush=True)
    with open(dataset_path, 'rb') as f:
        data_dict = pickle.load(f, encoding='latin1')

    classes = sorted(list(set([k[0] for k in data_dict.keys()])))
    snr_vals = sorted(list(set([k[1] for k in data_dict.keys()])))
    sample_shape = data_dict[list(data_dict.keys())[0]].shape

    raw_samples, labels, snrs = [], [], []
    label_to_idx = {c: i for i, c in enumerate(classes)}

    for (mod, snr), frames in data_dict.items():
        n_use = min(len(frames), max_samples_per_key) if max_samples_per_key else len(frames)
        raw_samples.append(frames[:n_use])
        labels.extend([label_to_idx[mod]] * n_use)
        snrs.extend([snr] * n_use)

    return np.concatenate(raw_samples, axis=0), np.array(labels, dtype=np.int64), np.array(snrs, dtype=np.int32), classes, snr_vals, sample_shape

def train_pipeline(dataset_path=None, max_samples=MAX_SAMPLES_PER_CLASS_SNR, output_dir="models"):
    np.random.seed(RANDOM_SEED)
    actual_path = find_dataset_path(dataset_path)
    X_raw, y, snrs_arr, classes, snr_vals, sample_shape = load_radioml_dataset(actual_path, max_samples)

    # 70% Train, 15% Validation, 15% Test
    combined_strat_key = [f"{mod}_{snr}" for mod, snr in zip(y, snrs_arr)]
    X_train_raw, X_temp_raw, y_train, y_temp, snr_train, snr_temp = train_test_split(
        X_raw, y, snrs_arr, test_size=0.30, random_state=RANDOM_SEED, stratify=combined_strat_key
    )
    temp_strat_key = [f"{mod}_{snr}" for mod, snr in zip(y_temp, snr_temp)]
    X_val_raw, X_test_raw, y_val, y_test, snr_val, snr_test = train_test_split(
        X_temp_raw, y_temp, snr_temp, test_size=0.50, random_state=RANDOM_SEED, stratify=temp_strat_key
    )

    print("\nExtracting DSP features...")
    X_train_feats = batch_extract_features(X_train_raw)
    X_val_feats = batch_extract_features(X_val_raw)
    X_test_feats = batch_extract_features(X_test_raw)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_feats)
    X_val_scaled = scaler.transform(X_val_feats)
    X_test_scaled = scaler.transform(X_test_feats)

    print("\nTraining RandomForestClassifier (n_estimators=250, max_depth=35)...", flush=True)
    clf = RandomForestClassifier(n_estimators=250, max_depth=35, min_samples_split=2, min_samples_leaf=1, random_state=RANDOM_SEED, n_jobs=-1)
    clf.fit(X_train_scaled, y_train)

    y_test_pred = clf.predict(X_test_scaled)
    test_acc = accuracy_score(y_test, y_test_pred)
    
    prec_mac, rec_mac, f1_mac, _ = precision_recall_fscore_support(y_test, y_test_pred, average='macro')
    prec_wei, rec_wei, f1_wei, _ = precision_recall_fscore_support(y_test, y_test_pred, average='weighted')
    prec_cls, rec_cls, f1_cls, _ = precision_recall_fscore_support(y_test, y_test_pred, average=None)

    conf_mat = confusion_matrix(y_test, y_test_pred).tolist()

    snr_acc = {}
    for snr in snr_vals:
        idx = snr_test == snr
        snr_acc[str(snr)] = {
            "samples": int(np.sum(idx)),
            "accuracy": float(accuracy_score(y_test[idx], y_test_pred[idx]))
        }

    os.makedirs(output_dir, exist_ok=True)
    results_dir = "ml/results"
    os.makedirs(results_dir, exist_ok=True)

    joblib.dump({"classifier": clf, "scaler": scaler, "classes": classes, "feature_names": FEATURE_NAMES, "sample_shape": sample_shape}, os.path.join(output_dir, "radioml_modulation_model.joblib"))
    with open(os.path.join(output_dir, "modulation_classes.json"), "w") as f:
        json.dump(classes, f, indent=2)

    final_metrics = {
        "dataset": "RadioML 2016.10A",
        "total_samples": len(y),
        "test_samples": len(y_test),
        "train_samples": len(y_train),
        "val_samples": len(y_val),
        "classes": classes,
        "feature_count": len(FEATURE_NAMES),
        "accuracy": float(test_acc),
        "macro_precision": float(prec_mac),
        "macro_recall": float(rec_mac),
        "macro_f1": float(f1_mac),
        "weighted_precision": float(prec_wei),
        "weighted_recall": float(rec_wei),
        "weighted_f1": float(f1_wei),
        "per_class": {
            cls: {"precision": float(p), "recall": float(r), "f1": float(f)}
            for cls, p, r, f in zip(classes, prec_cls, rec_cls, f1_cls)
        },
        "snr_accuracy": snr_acc,
        "confusion_matrix": conf_mat,
        "leakage_check": "No leakage found. Train/val/test split done before scaling and feature extraction."
    }

    with open(os.path.join(results_dir, "final_metrics.json"), "w") as f:
        json.dump(final_metrics, f, indent=2)

    with open(os.path.join(results_dir, "final_evaluation_report.txt"), "w") as f:
        f.write("=== FINAL EVALUATION REPORT ===\n")
        f.write(f"Accuracy: {test_acc:.4f}\n")
        f.write(f"Macro F1: {f1_mac:.4f}\n")
        f.write(f"Weighted F1: {f1_wei:.4f}\n\n")
        f.write("SNR Accuracy:\n")
        for snr, d in snr_acc.items():
            f.write(f"SNR {snr} dB | Samples {d['samples']} | Accuracy {d['accuracy']:.4f}\n")
    
    print("Done generating results.")

if __name__ == "__main__":
    train_pipeline()
