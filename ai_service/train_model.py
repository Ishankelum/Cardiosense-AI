"""
CardioSense AI — Heart Disease Classifier Training Script
Trains on UCI Heart Disease + Heart Statlog (Cleveland/Hungary) datasets.
Run: python train_model.py
"""

import sys
import os

# Support packages installed to D:\py_packages via pip --target
_pkg_path = r"D:\py_packages"
if os.path.exists(_pkg_path) and _pkg_path not in sys.path:
    sys.path.insert(0, _pkg_path)

import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
import joblib
import json
import os


def load_uci(filepath):
    df = pd.read_csv(filepath)

    df['sex'] = (df['sex'] == 'Male').astype(int)

    cp_map = {'typical angina': 1, 'atypical angina': 2, 'non-anginal': 3, 'asymptomatic': 4}
    df['cp'] = df['cp'].map(cp_map).fillna(2)

    df['fbs'] = df['fbs'].map({True: 1, False: 0, 'TRUE': 1, 'FALSE': 0}).fillna(0)

    restecg_map = {'normal': 0, 'st-t abnormality': 1, 'lv hypertrophy': 2}
    df['restecg'] = df['restecg'].map(restecg_map).fillna(0)

    df['exang'] = df['exang'].map({True: 1, False: 0, 'TRUE': 1, 'FALSE': 0}).fillna(0)

    slope_map = {'upsloping': 1, 'flat': 2, 'downsloping': 3}
    df['slope'] = df['slope'].map(slope_map).fillna(1)

    thal_map = {'normal': 1, 'fixed defect': 2, 'reversable defect': 3}
    df['thal'] = df['thal'].map(thal_map).fillna(2.0)

    df['target'] = (df['num'] > 0).astype(int)

    cols = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg',
            'thalch', 'exang', 'oldpeak', 'slope', 'ca', 'thal', 'target']
    result = df[cols].copy()
    result = result.rename(columns={'thalch': 'thalach'})
    return result.dropna()


def load_statlog(filepath):
    df = pd.read_csv(filepath)
    df.columns = df.columns.str.strip()

    rename = {
        'chest pain type': 'cp',
        'resting bp s': 'trestbps',
        'cholesterol': 'chol',
        'fasting blood sugar': 'fbs',
        'resting ecg': 'restecg',
        'max heart rate': 'thalach',
        'exercise angina': 'exang',
        'ST slope': 'slope',
    }
    df = df.rename(columns=rename)

    df['ca'] = 0.0
    df['thal'] = 2.0

    cols = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg',
            'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal', 'target']
    return df[cols].dropna()


FEATURES = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg',
            'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal']


def train():
    print("=" * 55)
    print("  CardioSense AI — Model Training")
    print("=" * 55)

    print("\nLoading datasets...")
    df1 = load_uci('data/heart_disease_uci.csv')
    df2 = load_statlog('data/heart_statlog_cleveland_hungary_final.csv')
    combined = pd.concat([df1, df2], ignore_index=True)

    print(f"  UCI dataset     : {len(df1):>5} samples")
    print(f"  Statlog dataset : {len(df2):>5} samples")
    print(f"  Combined total  : {len(combined):>5} samples")
    print(f"  Disease rate    : {combined['target'].mean():.1%}")

    X = combined[FEATURES].astype(float)
    y = combined['target']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    print("\nTraining Gradient Boosting Classifier...")
    model = GradientBoostingClassifier(
        n_estimators=300,
        learning_rate=0.08,
        max_depth=4,
        subsample=0.85,
        random_state=42,
    )
    model.fit(X_train_s, y_train)

    y_pred = model.predict(X_test_s)
    y_prob = model.predict_proba(X_test_s)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)

    print(f"\n  Test Accuracy : {acc*100:.2f}%")
    print(f"  ROC-AUC Score : {auc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['No Disease', 'Disease']))

    os.makedirs('model', exist_ok=True)
    joblib.dump(model, 'model/heart_disease_model.pkl')
    joblib.dump(scaler, 'model/scaler.pkl')
    with open('model/features.json', 'w') as f:
        json.dump(FEATURES, f)

    print("Model saved  -> model/heart_disease_model.pkl")
    print("Scaler saved -> model/scaler.pkl")
    print("\nTraining complete!")


if __name__ == '__main__':
    train()
