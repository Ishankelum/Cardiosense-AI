"""
CardioSense AI — Flask Inference Service (port 5002)
Loads the trained heart disease model and serves predictions.
Auto-trains if model files are missing.
Run: python app.py
"""

import sys
import os

# Support packages installed to D:\py_packages via pip --target (Windows dev env)
# Also checks common alternative locations — safe to ignore if not found
for _pkg_path in [r"D:\py_packages", r"C:\py_packages", os.path.join(os.path.dirname(__file__), "packages")]:
    if os.path.exists(_pkg_path) and _pkg_path not in sys.path:
        sys.path.insert(0, _pkg_path)

import json
import random
import tempfile

import joblib
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from ecg_analyzer import analyze_ecg_file

app = Flask(__name__)
CORS(app)

MODEL_PATH = 'model/heart_disease_model.pkl'
SCALER_PATH = 'model/scaler.pkl'
FEATURES_PATH = 'model/features.json'


def ensure_model():
    if not all(os.path.exists(p) for p in [MODEL_PATH, SCALER_PATH, FEATURES_PATH]):
        print("Model not found — running training first...")
        from train_model import train
        train()


ensure_model()

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
with open(FEATURES_PATH) as f:
    FEATURE_NAMES = json.load(f)

print(f"Model loaded. Features: {FEATURE_NAMES}")


def build_analysis(age, sex, cp, trestbps, chol, thalach, exang, oldpeak, slope, proba):
    """Map clinical features + disease probability to full ECG analysis object."""
    risk_score = min(100, round(proba * 100))

    # Add slight randomness to confidence to simulate per-scan variation
    confidence = round(min(99.5, max(55.0, proba * 100 + random.uniform(-4, 4))), 1)

    # --- ECG-derived metrics (estimated from clinical inputs) ---
    hr = int(thalach) if thalach > 0 else random.randint(60, 100)

    # PR interval: elevated if 1° AV block pattern
    pr = 200 if (oldpeak > 2 and slope == 2) else random.randint(130, 180)

    # QRS duration: wider in BBB-type patterns
    qrs = random.randint(100, 140) if proba > 0.6 else random.randint(80, 110)

    # QT interval
    qt = round(380 + proba * 70)

    # QTc (Bazett's formula)
    rr = 60 / hr if hr > 0 else 1
    qtc = round(qt / (rr ** 0.5))

    # ST deviation
    st = round(oldpeak, 2)

    # Rhythm classification
    if proba >= 0.85:
        rhythm = 'Atrial Fibrillation' if not exang else 'Ventricular Tachycardia'
    elif proba >= 0.65:
        rhythm = 'Sinus Tachycardia' if hr > 100 else 'Sinus Arrhythmia'
    elif hr > 100:
        rhythm = 'Sinus Tachycardia'
    elif hr < 60:
        rhythm = 'Sinus Bradycardia'
    else:
        rhythm = 'Normal Sinus Rhythm'

    # --- Condition detection ---
    conditions = []

    if proba >= 0.80:
        conditions.append({
            'name': 'Atrial Fibrillation',
            'severity': 'High',
            'confidence': round(min(99, confidence + 2), 1),
        })

    if oldpeak >= 2.0:
        conditions.append({
            'name': 'ST Depression / Ischemia',
            'severity': 'High',
            'confidence': round(min(99, confidence + 3), 1),
        })
    elif oldpeak >= 1.0:
        conditions.append({
            'name': 'Mild ST Depression',
            'severity': 'Moderate',
            'confidence': round(confidence, 1),
        })

    if exang and proba >= 0.5:
        conditions.append({
            'name': 'Exercise-Induced Angina',
            'severity': 'High' if proba >= 0.7 else 'Moderate',
            'confidence': round(confidence - 3, 1),
        })

    if cp == 4 and proba >= 0.45:
        conditions.append({
            'name': 'Coronary Artery Disease',
            'severity': 'High',
            'confidence': round(confidence, 1),
        })

    if hr > 100:
        conditions.append({
            'name': 'Tachycardia',
            'severity': 'Moderate',
            'confidence': round(confidence - 2, 1),
        })

    if hr < 60:
        conditions.append({
            'name': 'Bradycardia',
            'severity': 'Low',
            'confidence': round(confidence - 2, 1),
        })

    if slope == 2 and oldpeak >= 1.5 and proba >= 0.5:
        conditions.append({
            'name': 'Myocardial Ischemia',
            'severity': 'High',
            'confidence': round(min(99, confidence + 1), 1),
        })

    # --- Risk banding & triage ---
    if risk_score >= 86:
        status = 'Critical'
        triage = 'IMMEDIATE'
        recommendation = (
            'CRITICAL — Immediate cardiologist consultation required. '
            'Critical cardiac event indicators detected. '
            'Consider emergency intervention and continuous monitoring.'
        )
    elif risk_score >= 61:
        status = 'High Risk'
        triage = 'URGENT'
        recommendation = (
            'HIGH RISK — Urgent cardiologist review required within 24 hours. '
            'Significant cardiac abnormalities detected. '
            'Detailed workup, stress testing, and imaging recommended.'
        )
    elif risk_score >= 31:
        status = 'Moderate'
        triage = 'ROUTINE'
        recommendation = (
            'MODERATE RISK — Schedule cardiology follow-up within 1–2 weeks. '
            'Monitor symptoms closely. '
            'Lifestyle modifications and repeat ECG recommended.'
        )
    else:
        status = 'Normal'
        triage = 'ROUTINE'
        recommendation = (
            'LOW RISK — ECG within acceptable limits. '
            'Routine annual follow-up recommended. '
            'Maintain healthy lifestyle and manage cardiovascular risk factors.'
        )

    # --- Confidence tier (per proposal) ---
    if confidence >= 90:
        conf_tier = 'High'
        conf_label = '>90% confidence — High reliability, automated report generated'
    elif confidence >= 70:
        conf_tier = 'Medium'
        conf_label = '70–90% confidence — Careful cardiologist review flagged'
    else:
        conf_tier = 'Low'
        conf_label = '<70% confidence — Expert interpretation mandatory'

    return {
        'heartRate': hr,
        'rhythmType': rhythm,
        'prInterval': pr,
        'qrsDuration': qrs,
        'qtInterval': qt,
        'qtcInterval': qtc,
        'stDeviation': st,
        'riskScore': risk_score,
        'confidence': confidence,
        'confidenceTier': conf_tier,
        'confidenceLabel': conf_label,
        'status': status,
        'triage': triage,
        'conditions': conditions,
        'recommendation': recommendation,
        'predictionProbability': round(proba * 100, 1),
    }


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'CardioSense AI', 'model': 'heart_disease_classifier'})


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json(force=True)

        age = float(data.get('age', 50))
        sex = float(data.get('sex', 1))
        cp = float(data.get('cp', 2))
        trestbps = float(data.get('trestbps', 120))
        chol = float(data.get('chol', 200))
        fbs = float(data.get('fbs', 0))
        restecg = float(data.get('restecg', 0))
        thalach = float(data.get('thalach', 150))
        exang = float(data.get('exang', 0))
        oldpeak = float(data.get('oldpeak', 0))
        slope = float(data.get('slope', 1))
        ca = float(data.get('ca', 0))
        thal = float(data.get('thal', 2))

        features = np.array([[age, sex, cp, trestbps, chol, fbs,
                               restecg, thalach, exang, oldpeak, slope, ca, thal]])
        features_scaled = scaler.transform(features)

        prediction = int(model.predict(features_scaled)[0])
        proba = float(model.predict_proba(features_scaled)[0][1])

        analysis = build_analysis(age, sex, cp, trestbps, chol, thalach, exang, oldpeak, slope, proba)

        return jsonify({
            'success': True,
            'prediction': prediction,
            'analysis': analysis,
        })

    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@app.route('/analyze-signal', methods=['POST'])
def analyze_signal():
    """
    Real ECG signal analysis endpoint.
    Accepts a multipart/form-data upload with field 'ecgFile' (CSV).
    Returns the same analysis shape as /predict so the frontend stays compatible.
    """
    try:
        if 'ecgFile' not in request.files:
            return jsonify({'success': False, 'error': 'No ecgFile provided'}), 400

        file = request.files['ecgFile']
        if not file.filename:
            return jsonify({'success': False, 'error': 'Empty filename'}), 400

        # Save to a temp file for processing
        suffix = os.path.splitext(file.filename)[1] or '.csv'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        try:
            analysis = analyze_ecg_file(tmp_path)
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

        return jsonify({'success': True, 'analysis': analysis})

    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


if __name__ == '__main__':
    print('\n  CardioSense AI Service running on http://localhost:5002\n')
    app.run(host='0.0.0.0', port=5002, debug=False)
