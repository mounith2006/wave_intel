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
from sklearn.metrics import accuracy_score

from ml.features import batch_extract_features, FEATURE_NAMES

# Configurable settings
DEFAULT_DATASET_PATHS = [
    "datasets/radioml/RML2016.10a/RML2016.10a_dict.pkl",
    "datasets/radioml/RML2016.10a/RML2016.10a_dict_optimized.pkl",
    "../datasets/radioml/RML2016.10a/RML2016.10a_dict.pkl",
    "../datasets/radioml/RML2016.10a/RML2016.10a_dict_optimized.pkl"
]

# Configurable sample limit per (class, SNR) pair
# Set to an integer (e.g. 1000, 500) or None for full dataset
MAX_SAMPLES_PER_CLASS_SNR = 1000
RANDOM_SEED = 42

def find_dataset_path(custom_path=None):
    if custom_path and os.path.exists(custom_path):
        return custom_path

    for candidate in DEFAULT_DATASET_PATHS:
        abs_cand = os.path.abspath(candidate)
        if os.path.exists(abs_cand):
            return abs_cand

    return None

def load_radioml_dataset(dataset_path, max_samples_per_key=MAX_SAMPLES_PER_CLASS_SNR):
    """
    Loads and parses the RadioML dataset dictionary.
    Dataset format: dictionary keyed by (modulation_name, snr_dB) tuples,
    with values of shape (num_samples, 2, 128) float32.
    """
    if not dataset_path or not os.path.exists(dataset_path):
        err_msg = (
            f"ERROR: RadioML dataset file not found at '{dataset_path}'.\n"
            f"Expected dataset path: 'datasets/radioml/RML2016.10a/RML2016.10a_dict.pkl' "
            f"or 'datasets/radioml/RML2016.10a/RML2016.10a_dict_optimized.pkl'."
        )
        print(err_msg, file=sys.stderr)
        raise FileNotFoundError(err_msg)

    print(f"Loading RadioML dataset from: {dataset_path} ...", flush=True)
    with open(dataset_path, 'rb') as f:
        data_dict = pickle.load(f, encoding='latin1')

    if not isinstance(data_dict, dict):
        raise ValueError(f"Loaded dataset is not a dictionary. Got type: {type(data_dict)}")

    # Detect classes and SNR values present in dataset
    classes = sorted(list(set([k[0] for k in data_dict.keys()])))
    snr_vals = sorted(list(set([k[1] for k in data_dict.keys()])))

    sample_key = list(data_dict.keys())[0]
    sample_shape = data_dict[sample_key].shape

    raw_samples = []
    labels = []
    snrs = []
    str_labels = []

    label_to_idx = {c: i for i, c in enumerate(classes)}

    for (mod, snr), frames in data_dict.items():
        n_available = len(frames)
        if max_samples_per_key is not None:
            n_use = min(n_available, max_samples_per_key)
        else:
            n_use = n_available

        selected_frames = frames[:n_use]
        raw_samples.append(selected_frames)
        labels.extend([label_to_idx[mod]] * n_use)
        snrs.extend([snr] * n_use)
        str_labels.extend([mod] * n_use)

    X_raw = np.concatenate(raw_samples, axis=0)
    y = np.array(labels, dtype=np.int64)
    snrs_arr = np.array(snrs, dtype=np.int32)

    return X_raw, y, snrs_arr, classes, snr_vals, sample_shape

def train_pipeline(dataset_path=None, max_samples=MAX_SAMPLES_PER_CLASS_SNR, output_dir="models"):
    np.random.seed(RANDOM_SEED)

    actual_path = find_dataset_path(dataset_path)
    X_raw, y, snrs_arr, classes, snr_vals, sample_shape = load_radioml_dataset(actual_path, max_samples)

    total_samples = len(y)
    samples_per_class = {c: int(np.sum(y == i)) for i, c in enumerate(classes)}

    # Splitting strategy:
    # We use a stratified split based on combined (class, SNR) label tuples to ensure:
    # 1. Equal proportion of every modulation and SNR level across train, val, and test splits.
    # 2. Complete statistical independence between samples in train, val, and test (preventing leakage).
    # Split ratio: 70% Train, 15% Validation, 15% Test.
    combined_strat_key = [f"{mod}_{snr}" for mod, snr in zip(y, snrs_arr)]

    # Step 1: Train (70%) vs Temp (30%)
    X_train_raw, X_temp_raw, y_train, y_temp, snr_train, snr_temp = train_test_split(
        X_raw, y, snrs_arr,
        test_size=0.30,
        random_state=RANDOM_SEED,
        stratify=combined_strat_key
    )

    # Step 2: Split Temp into Validation (15%) and Test (15%)
    temp_strat_key = [f"{mod}_{snr}" for mod, snr in zip(y_temp, snr_temp)]
    X_val_raw, X_test_raw, y_val, y_test, snr_val, snr_test = train_test_split(
        X_temp_raw, y_temp, snr_temp,
        test_size=0.50,
        random_state=RANDOM_SEED,
        stratify=temp_strat_key
    )

    # PRINT ROBUSTNESS & DATASET SUMMARY AS REQUIRED
    print("==================================================", flush=True)
    print("RADIOML 2016.10A DATASET & SPLIT SUMMARY", flush=True)
    print("==================================================", flush=True)
    print(f"Total samples       : {total_samples}", flush=True)
    print(f"Number of classes   : {len(classes)}", flush=True)
    print(f"Modulation classes  : {classes}", flush=True)
    print(f"SNR values (dB)     : {snr_vals}", flush=True)
    print(f"Samples per class   : {samples_per_class}", flush=True)
    print(f"IQ sample shape     : {sample_shape}", flush=True)
    print(f"Train split size    : {len(y_train)} (70%)", flush=True)
    print(f"Validation size     : {len(y_val)} (15%)", flush=True)
    print(f"Test split size     : {len(y_test)} (15%)", flush=True)
    print("==================================================", flush=True)

    # FEATURE EXTRACTION
    print("\nExtracting DSP features from IQ samples...", flush=True)
    print(" -> Processing Train set...", flush=True)
    X_train_feats = batch_extract_features(X_train_raw)
    print(" -> Processing Validation set...", flush=True)
    X_val_feats = batch_extract_features(X_val_raw)
    print(" -> Processing Test set...", flush=True)
    X_test_feats = batch_extract_features(X_test_raw)

    # FEATURE SCALING
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_feats)
    X_val_scaled = scaler.transform(X_val_feats)
    X_test_scaled = scaler.transform(X_test_feats)

    # MODEL TRAINING (RandomForestClassifier)
    print("\nTraining RandomForestClassifier...", flush=True)
    clf = RandomForestClassifier(
        n_estimators=120,
        max_depth=25,
        random_state=RANDOM_SEED,
        n_jobs=-1
    )
    clf.fit(X_train_scaled, y_train)

    train_acc = accuracy_score(y_train, clf.predict(X_train_scaled)) * 100.0
    val_acc = accuracy_score(y_val, clf.predict(X_val_scaled)) * 100.0
    test_acc = accuracy_score(y_test, clf.predict(X_test_scaled)) * 100.0

    print(f"\nModel Training Complete!", flush=True)
    print(f" -> Train Accuracy      : {train_acc:.2f}%", flush=True)
    print(f" -> Validation Accuracy : {val_acc:.2f}%", flush=True)
    print(f" -> Test Accuracy       : {test_acc:.2f}%", flush=True)

    # SAVING ARTIFACTS
    os.makedirs(output_dir, exist_ok=True)
    results_dir = os.path.join(os.path.dirname(output_dir) if output_dir != "." else ".", "ml", "results")
    if not os.path.exists(results_dir):
        results_dir = "ml/results"
    os.makedirs(results_dir, exist_ok=True)

    model_path = os.path.join(output_dir, "radioml_modulation_model.joblib")
    classes_path = os.path.join(output_dir, "modulation_classes.json")
    test_data_path = os.path.join(results_dir, "test_set.joblib")

    model_artifact = {
        "classifier": clf,
        "scaler": scaler,
        "classes": classes,
        "feature_names": FEATURE_NAMES,
        "sample_shape": sample_shape
    }
    joblib.dump(model_artifact, model_path)
    print(f"Saved trained model artifact to: {model_path}", flush=True)

    with open(classes_path, "w", encoding="utf-8") as f:
        json.dump(classes, f, indent=2)
    print(f"Saved class names to: {classes_path}", flush=True)

    test_data_artifact = {
        "X_test_raw": X_test_raw,
        "X_test_feats": X_test_feats,
        "X_test_scaled": X_test_scaled,
        "y_test": y_test,
        "snr_test": snr_test,
        "classes": classes
    }
    joblib.dump(test_data_artifact, test_data_path)
    print(f"Saved held-out test dataset to: {test_data_path}", flush=True)

    return {
        "train_acc": train_acc,
        "val_acc": val_acc,
        "test_acc": test_acc,
        "num_test_samples": len(y_test),
        "classes": classes
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Modulation Classifier on RadioML Dataset")
    parser.add_argument("--dataset", type=str, default=None, help="Path to RadioML dataset pkl file")
    parser.add_argument("--max_samples", type=int, default=MAX_SAMPLES_PER_CLASS_SNR, help="Max samples per (class, SNR)")
    parser.add_argument("--out_dir", type=str, default="models", help="Output directory for saved model")

    args = parser.parse_args()
    train_pipeline(dataset_path=args.dataset, max_samples=args.max_samples, output_dir=args.out_dir)
