import os
import sys
import json
import joblib
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix
)

def evaluate_modulation_model(model_path="models/radioml_modulation_model.joblib",
                              test_data_path="ml/results/test_set.joblib",
                              results_dir="ml/results"):
    """
    Evaluates saved model on held-out test set and saves evaluation report artifacts.
    """
    if not os.path.exists(model_path):
        err = f"ERROR: Model file not found at '{model_path}'. Please run training first."
        print(err, file=sys.stderr)
        raise FileNotFoundError(err)

    if not os.path.exists(test_data_path):
        err = f"ERROR: Held-out test dataset not found at '{test_data_path}'. Please run training first."
        print(err, file=sys.stderr)
        raise FileNotFoundError(err)

    os.makedirs(results_dir, exist_ok=True)

    print(f"Loading trained model from: {model_path} ...")
    model_artifact = joblib.load(model_path)
    clf = model_artifact["classifier"]
    scaler = model_artifact["scaler"]
    classes = model_artifact["classes"]

    print(f"Loading held-out test set from: {test_data_path} ...")
    test_artifact = joblib.load(test_data_path)
    X_test_scaled = test_artifact["X_test_scaled"]
    y_test = test_artifact["y_test"]
    snr_test = test_artifact["snr_test"]

    print(f"Running predictions on {len(y_test)} held-out test samples...")
    y_pred = clf.predict(X_test_scaled)

    # 1. Overall Metrics
    acc = accuracy_score(y_test, y_pred)
    prec_weighted, rec_weighted, f1_weighted, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')
    prec_macro, rec_macro, f1_macro, _ = precision_recall_fscore_support(y_test, y_pred, average='macro')

    class_report_str = classification_report(y_test, y_pred, target_names=classes, digits=4)
    cm = confusion_matrix(y_test, y_pred)

    # 2. Accuracy by SNR
    unique_snrs = sorted(list(set(snr_test)))
    acc_by_snr = {}
    for snr in unique_snrs:
        mask = (snr_test == snr)
        if np.sum(mask) > 0:
            snr_acc = accuracy_score(y_test[mask], y_pred[mask])
            acc_by_snr[int(snr)] = float(snr_acc * 100.0)

    # 3. Print Results to Console
    print("==================================================")
    print("RADIOML MODEL HELD-OUT TEST EVALUATION RESULTS")
    print("==================================================")
    print(f"Number of test samples : {len(y_test)}")
    print(f"Modulation classes ({len(classes)}) : {classes}")
    print(f"Test Accuracy           : {acc * 100.0:.2f}%")
    print(f"Precision (Weighted)    : {prec_weighted * 100.0:.2f}%")
    print(f"Recall (Weighted)       : {rec_weighted * 100.0:.2f}%")
    print(f"F1-Score (Weighted)     : {f1_weighted * 100.0:.2f}%")
    print(f"Precision (Macro)       : {prec_macro * 100.0:.2f}%")
    print(f"Recall (Macro)          : {rec_macro * 100.0:.2f}%")
    print(f"F1-Score (Macro)        : {f1_macro * 100.0:.2f}%")
    print("--------------------------------------------------")
    print("CLASSIFICATION REPORT:\n")
    print(class_report_str)
    print("==================================================")

    # 4. Save classification_report.txt
    report_file = os.path.join(results_dir, "classification_report.txt")
    with open(report_file, "w", encoding="utf-8") as f:
        f.write("RADIOML MODULATION CLASSIFICATION REPORT\n")
        f.write("========================================\n")
        f.write(f"Total Test Samples: {len(y_test)}\n")
        f.write(f"Test Accuracy     : {acc * 100.0:.2f}%\n")
        f.write(f"F1-Score (Weighted): {f1_weighted * 100.0:.2f}%\n\n")
        f.write(class_report_str)
    print(f"Saved text report to: {report_file}")

    # 5. Save metrics.json
    metrics_data = {
        "num_test_samples": int(len(y_test)),
        "num_classes": int(len(classes)),
        "classes": classes,
        "accuracy_percent": float(acc * 100.0),
        "precision_weighted": float(prec_weighted * 100.0),
        "recall_weighted": float(rec_weighted * 100.0),
        "f1_weighted": float(f1_weighted * 100.0),
        "precision_macro": float(prec_macro * 100.0),
        "recall_macro": float(rec_macro * 100.0),
        "f1_macro": float(f1_macro * 100.0),
        "accuracy_vs_snr_percent": acc_by_snr,
        "confusion_matrix": cm.tolist()
    }
    metrics_file = os.path.join(results_dir, "metrics.json")
    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)
    print(f"Saved JSON metrics to: {metrics_file}")

    # 6. Plot & Save Confusion Matrix PNG
    plt.figure(figsize=(10, 8))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title('Modulation Classification Confusion Matrix', fontsize=14, fontweight='bold')
    plt.colorbar()
    tick_marks = np.arange(len(classes))
    plt.xticks(tick_marks, classes, rotation=45, ha='right', fontsize=10)
    plt.yticks(tick_marks, classes, fontsize=10)

    # Text annotations inside confusion matrix cells
    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            val = cm[i, j]
            plt.text(j, i, f"{val}",
                     horizontalalignment="center",
                     color="white" if val > thresh else "black",
                     fontsize=9)

    plt.ylabel('True Modulation Label', fontsize=12)
    plt.xlabel('Predicted Modulation Label', fontsize=12)
    plt.tight_layout()
    cm_file = os.path.join(results_dir, "confusion_matrix.png")
    plt.savefig(cm_file, dpi=150)
    plt.close()
    print(f"Saved confusion matrix plot to: {cm_file}")

    # 7. Plot & Save Accuracy vs SNR PNG
    plt.figure(figsize=(9, 6))
    snr_list = sorted(acc_by_snr.keys())
    acc_list = [acc_by_snr[s] for s in snr_list]
    plt.plot(snr_list, acc_list, 'o-', color='#3B82F6', linewidth=2.5, markersize=7, label='Random Forest Classifier')
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.title('Modulation Classification Accuracy vs SNR', fontsize=14, fontweight='bold')
    plt.xlabel('Signal-to-Noise Ratio (SNR dB)', fontsize=12)
    plt.ylabel('Classification Accuracy (%)', fontsize=12)
    plt.ylim(0, 105)
    plt.legend(loc='lower right', fontsize=11)
    plt.tight_layout()
    snr_file = os.path.join(results_dir, "accuracy_vs_snr.png")
    plt.savefig(snr_file, dpi=150)
    plt.close()
    print(f"Saved accuracy vs SNR plot to: {snr_file}")

    return metrics_data

if __name__ == "__main__":
    evaluate_modulation_model()
