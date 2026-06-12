"""
CardioSense AI — ECG Signal Analyzer
Reads a raw ECG signal from a CSV file and extracts clinical metrics:
  Heart Rate, PR Interval, QRS Duration, QT/QTc, ST Deviation, Rhythm, Conditions

Supports:
  - neurokit2 (preferred — full waveform analysis)
  - scipy fallback (peak detection only)
  - manual fallback (estimation from signal statistics)
"""

import sys
import os

for _pkg_path in [r"D:\py_packages", r"C:\py_packages", os.path.join(os.path.dirname(__file__), "packages")]:
    if os.path.exists(_pkg_path) and _pkg_path not in sys.path:
        sys.path.insert(0, _pkg_path)

import numpy as np
import pandas as pd


# ── Try to import neurokit2 ────────────────────────────────────────────────────
try:
    import neurokit2 as nk
    HAS_NK = True
except ImportError:
    HAS_NK = False

# ── Try to import scipy ────────────────────────────────────────────────────────
try:
    from scipy.signal import find_peaks, butter, filtfilt
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False


# ── Constants ─────────────────────────────────────────────────────────────────
DEFAULT_FS = 360        # Hz  (MIT-BIH standard)
LEAD_ALIASES = [        # common column names for the ECG signal column
    'ecg', 'signal', 'lead', 'lead_i', 'lead ii', 'mlii', 'value',
    'mv', 'amplitude', 'data', 'ecg_signal', 'channel_0', 'i',
]


# ── File loading ──────────────────────────────────────────────────────────────

def load_ecg_csv(filepath):
    """
    Load ECG signal from CSV.
    Accepts:
      - single-column CSV (no header)
      - multi-column CSV — picks first recognised ECG column
    Returns (signal: np.ndarray, fs: int)
    """
    try:
        df = pd.read_csv(filepath)
    except Exception:
        # Try without header
        df = pd.read_csv(filepath, header=None)

    # Try to find the ECG signal column
    signal = None
    for col in df.columns:
        if str(col).strip().lower() in LEAD_ALIASES:
            signal = df[col].dropna().values.astype(float)
            break

    # Fallback: use first numeric column
    if signal is None:
        for col in df.columns:
            try:
                vals = pd.to_numeric(df[col], errors='coerce').dropna().values
                if len(vals) > 100:
                    signal = vals.astype(float)
                    break
            except Exception:
                continue

    if signal is None or len(signal) < 100:
        raise ValueError("No usable ECG signal column found in the CSV file.")

    # Detect sampling rate from a 'fs' or 'sampling_rate' column/metadata
    fs = DEFAULT_FS
    for col in df.columns:
        if str(col).strip().lower() in ('fs', 'sampling_rate', 'sample_rate', 'hz'):
            try:
                fs = int(float(df[col].dropna().iloc[0]))
                break
            except Exception:
                pass

    return signal, fs


# ── Rhythm labelling ──────────────────────────────────────────────────────────

def classify_rhythm(hr, rr_std, qrs_duration, pr_interval):
    """Simple rule-based rhythm classification."""
    if rr_std > 120:
        return 'Atrial Fibrillation'
    if hr > 150:
        return 'Ventricular Tachycardia' if qrs_duration > 120 else 'Supraventricular Tachycardia'
    if hr > 100:
        return 'Sinus Tachycardia'
    if hr < 50:
        return 'Sinus Bradycardia'
    if pr_interval > 200:
        return 'First-Degree AV Block'
    if qrs_duration > 120:
        return 'Bundle Branch Block'
    return 'Normal Sinus Rhythm'


# ── Condition detection ───────────────────────────────────────────────────────

def detect_conditions(hr, pr, qrs, qtc, st_dev, rhythm, confidence):
    conditions = []

    if 'Atrial Fibrillation' in rhythm:
        conditions.append({'name': 'Atrial Fibrillation', 'severity': 'High',
                           'confidence': round(min(99, confidence + 3), 1)})
    if 'Ventricular Tachycardia' in rhythm:
        conditions.append({'name': 'Ventricular Tachycardia', 'severity': 'High',
                           'confidence': round(min(99, confidence + 2), 1)})
    if 'AV Block' in rhythm:
        conditions.append({'name': 'First-Degree AV Block', 'severity': 'Moderate',
                           'confidence': round(confidence, 1)})
    if 'Bundle Branch Block' in rhythm:
        conditions.append({'name': 'Bundle Branch Block', 'severity': 'Moderate',
                           'confidence': round(confidence, 1)})
    if st_dev >= 2.0:
        conditions.append({'name': 'ST Depression / Ischemia', 'severity': 'High',
                           'confidence': round(min(99, confidence + 2), 1)})
    elif st_dev >= 1.0:
        conditions.append({'name': 'Mild ST Depression', 'severity': 'Moderate',
                           'confidence': round(confidence, 1)})
    elif st_dev <= -1.0:
        conditions.append({'name': 'ST Elevation (STEMI Pattern)', 'severity': 'High',
                           'confidence': round(min(99, confidence + 3), 1)})
    if qtc > 500:
        conditions.append({'name': 'Prolonged QTc — High Risk', 'severity': 'High',
                           'confidence': round(confidence, 1)})
    elif qtc > 450:
        conditions.append({'name': 'Borderline Prolonged QTc', 'severity': 'Moderate',
                           'confidence': round(confidence - 2, 1)})
    if pr > 200:
        conditions.append({'name': 'Prolonged PR Interval', 'severity': 'Moderate',
                           'confidence': round(confidence - 3, 1)})
    if hr > 100:
        conditions.append({'name': 'Tachycardia', 'severity': 'Moderate',
                           'confidence': round(confidence - 2, 1)})
    if hr < 50:
        conditions.append({'name': 'Bradycardia', 'severity': 'Moderate',
                           'confidence': round(confidence - 2, 1)})
    if qrs > 120:
        conditions.append({'name': 'Wide QRS Complex', 'severity': 'Moderate',
                           'confidence': round(confidence - 3, 1)})

    return conditions


# ── Risk scoring ──────────────────────────────────────────────────────────────

def compute_risk_score(conditions, hr, qtc, st_dev, rhythm):
    score = 15  # baseline

    severity_weights = {'High': 25, 'Moderate': 12, 'Low': 5}
    for c in conditions:
        score += severity_weights.get(c['severity'], 0)

    if 'Fibrillation' in rhythm or 'Tachycardia' in rhythm:
        score += 15
    if qtc > 500:
        score += 10
    if abs(st_dev) >= 2.0:
        score += 20
    elif abs(st_dev) >= 1.0:
        score += 8
    if hr > 150 or hr < 40:
        score += 15

    return min(100, score)


# ── Main analysis — neurokit2 path ────────────────────────────────────────────

def analyze_with_neurokit(signal, fs):
    """Full waveform analysis using neurokit2."""
    # Clean signal
    cleaned = nk.ecg_clean(signal, sampling_rate=fs)

    # Process ECG — finds R peaks, delineates P/Q/R/S/T
    signals_df, info = nk.ecg_process(cleaned, sampling_rate=fs)

    r_peaks = info['ECG_R_Peaks']
    if len(r_peaks) < 3:
        raise ValueError("Not enough R-peaks detected. Signal may be too short or too noisy.")

    # ── Heart Rate ────────────────────────────────────────────────────────────
    rr_intervals_ms = np.diff(r_peaks) / fs * 1000  # ms
    hr = round(60000 / np.mean(rr_intervals_ms))
    rr_std = float(np.std(rr_intervals_ms))

    # ── PR Interval ───────────────────────────────────────────────────────────
    try:
        p_onsets  = [i for i in signals_df.index if signals_df.at[i, 'ECG_P_Onsets'] == 1]
        r_onsets  = [i for i in signals_df.index if signals_df.at[i, 'ECG_R_Onsets'] == 1]
        pr_vals = []
        for r in r_onsets:
            candidates = [p for p in p_onsets if p < r]
            if candidates:
                pr_vals.append((r - max(candidates)) / fs * 1000)
        pr = round(np.median(pr_vals)) if pr_vals else 160
    except Exception:
        pr = 160

    # ── QRS Duration ─────────────────────────────────────────────────────────
    try:
        r_on  = signals_df['ECG_R_Onsets'].values
        r_off = signals_df['ECG_R_Offsets'].values
        on_idx  = np.where(r_on == 1)[0]
        off_idx = np.where(r_off == 1)[0]
        qrs_vals = []
        for on in on_idx:
            later = off_idx[off_idx > on]
            if len(later):
                qrs_vals.append((later[0] - on) / fs * 1000)
        qrs = round(np.median(qrs_vals)) if qrs_vals else 90
    except Exception:
        qrs = 90

    # ── QT Interval & QTc ────────────────────────────────────────────────────
    try:
        t_off_idx = np.where(signals_df['ECG_T_Offsets'].values == 1)[0]
        r_on_idx  = np.where(signals_df['ECG_R_Onsets'].values == 1)[0]
        qt_vals = []
        for r in r_on_idx:
            later = t_off_idx[t_off_idx > r]
            if len(later):
                qt_vals.append((later[0] - r) / fs * 1000)
        qt = round(np.median(qt_vals)) if qt_vals else round(380 + hr * 0.2)
    except Exception:
        qt = round(380 + hr * 0.2)

    rr_sec = 60 / hr if hr > 0 else 1.0
    qtc = round(qt / (rr_sec ** 0.5))   # Bazett's formula

    # ── ST Deviation ─────────────────────────────────────────────────────────
    try:
        # ST segment: 60–80 ms after R peak
        st_offset_samples = int(0.07 * fs)
        st_vals = []
        for r in r_peaks:
            st_idx = r + st_offset_samples
            if st_idx < len(cleaned):
                # Baseline: PR segment
                baseline_idx = max(0, r - int(0.05 * fs))
                baseline = np.mean(cleaned[max(0, baseline_idx - 5): baseline_idx + 5])
                st_val = cleaned[st_idx] - baseline
                st_vals.append(st_val)
        st_dev = round(float(np.median(st_vals)) * 10, 2) if st_vals else 0.0  # convert to mm
    except Exception:
        st_dev = 0.0

    confidence = round(min(99.0, max(60.0, 85.0 - rr_std * 0.05)), 1)

    return {
        'hr': hr, 'pr': pr, 'qrs': qrs,
        'qt': qt, 'qtc': qtc, 'st_dev': st_dev,
        'rr_std': rr_std, 'method': 'neurokit2',
        'confidence': confidence,
    }


# ── Fallback — scipy peak detection ──────────────────────────────────────────

def analyze_with_scipy(signal, fs):
    """Lightweight analysis using scipy peak detection."""
    # Bandpass filter 0.5–40 Hz
    nyq = fs / 2.0
    b, a = butter(3, [0.5 / nyq, 40.0 / nyq], btype='band')
    filtered = filtfilt(b, a, signal)

    # R-peak detection
    min_distance = int(0.5 * fs)          # min 0.5 s between peaks
    height_thresh = np.percentile(filtered, 75)
    r_peaks, _ = find_peaks(filtered, distance=min_distance, height=height_thresh)

    if len(r_peaks) < 3:
        raise ValueError("Not enough R-peaks found in the ECG signal.")

    rr_ms  = np.diff(r_peaks) / fs * 1000
    hr     = round(60000 / np.mean(rr_ms))
    rr_std = float(np.std(rr_ms))

    # Estimate intervals from signal morphology around R peaks
    pr_vals, qrs_vals, st_vals = [], [], []
    for r in r_peaks:
        # QRS: find Q and S around R
        q_start = max(0, r - int(0.06 * fs))
        s_end   = min(len(filtered) - 1, r + int(0.06 * fs))
        q_idx   = q_start + int(np.argmin(filtered[q_start:r])) if r > q_start else q_start
        s_idx   = r + int(np.argmin(filtered[r:s_end])) if s_end > r else s_end
        qrs_vals.append((s_idx - q_idx) / fs * 1000)

        # P wave: ~100–200 ms before R
        p_start = max(0, r - int(0.22 * fs))
        p_end   = max(0, r - int(0.05 * fs))
        if p_end > p_start:
            p_peak = p_start + int(np.argmax(filtered[p_start:p_end]))
            pr_vals.append((r - p_peak) / fs * 1000)

        # ST: 60 ms after R
        st_idx = min(len(filtered) - 1, r + int(0.06 * fs))
        baseline = np.mean(filtered[max(0, r - int(0.05 * fs)): r])
        st_vals.append((filtered[st_idx] - baseline) * 10)  # to mm

    pr     = round(np.median(pr_vals))  if pr_vals  else 160
    qrs    = round(np.median(qrs_vals)) if qrs_vals else 90
    st_dev = round(float(np.median(st_vals)), 2) if st_vals else 0.0

    qt     = round(380 + (rr_ms.mean() * 0.3))
    rr_sec = 60 / hr if hr > 0 else 1.0
    qtc    = round(qt / (rr_sec ** 0.5))

    confidence = round(min(92.0, max(60.0, 78.0 - rr_std * 0.04)), 1)

    return {
        'hr': hr, 'pr': pr, 'qrs': qrs,
        'qt': qt, 'qtc': qtc, 'st_dev': st_dev,
        'rr_std': rr_std, 'method': 'scipy',
        'confidence': confidence,
    }


# ── Manual fallback ───────────────────────────────────────────────────────────

def analyze_manual(signal, fs):
    """Minimal fallback using basic numpy peak detection."""
    # Simple threshold peak detection
    threshold = np.mean(signal) + 0.7 * np.std(signal)
    min_gap   = int(0.4 * fs)
    peaks = []
    last  = -min_gap
    for i in range(1, len(signal) - 1):
        if signal[i] > threshold and signal[i] >= signal[i-1] and signal[i] >= signal[i+1]:
            if i - last >= min_gap:
                peaks.append(i)
                last = i

    if len(peaks) < 3:
        raise ValueError("Signal too noisy or too short for analysis.")

    rr_ms  = np.diff(peaks) / fs * 1000
    hr     = round(60000 / np.mean(rr_ms))
    rr_std = float(np.std(rr_ms))

    rr_sec = 60 / hr if hr > 0 else 1.0
    qt     = round(380 + rr_sec * 50)
    qtc    = round(qt / (rr_sec ** 0.5))

    confidence = round(min(80.0, max(55.0, 68.0 - rr_std * 0.03)), 1)
    return {
        'hr': hr, 'pr': 160, 'qrs': 90,
        'qt': qt, 'qtc': qtc, 'st_dev': 0.0,
        'rr_std': rr_std, 'method': 'manual',
        'confidence': confidence,
    }


# ── Public entry point ────────────────────────────────────────────────────────

def analyze_ecg_file(filepath):
    """
    Full ECG analysis pipeline.
    Returns a dict matching the shape expected by the frontend/backend.
    """
    signal, fs = load_ecg_csv(filepath)

    # Clamp signal to at most 60 s to keep processing fast
    max_samples = fs * 60
    if len(signal) > max_samples:
        signal = signal[:max_samples]

    # Try analysis methods in order of accuracy
    metrics = None
    errors  = []

    if HAS_NK:
        try:
            metrics = analyze_with_neurokit(signal, fs)
        except Exception as e:
            errors.append(f'neurokit2: {e}')

    if metrics is None and HAS_SCIPY:
        try:
            metrics = analyze_with_scipy(signal, fs)
        except Exception as e:
            errors.append(f'scipy: {e}')

    if metrics is None:
        try:
            metrics = analyze_manual(signal, fs)
        except Exception as e:
            errors.append(f'manual: {e}')
            raise RuntimeError(f"All ECG analysis methods failed: {'; '.join(errors)}")

    # ── Build output ──────────────────────────────────────────────────────────
    hr      = int(metrics['hr'])
    pr      = int(metrics['pr'])
    qrs     = int(metrics['qrs'])
    qt      = int(metrics['qt'])
    qtc     = int(metrics['qtc'])
    st_dev  = float(metrics['st_dev'])
    confidence = float(metrics['confidence'])
    method  = metrics['method']

    rhythm = classify_rhythm(hr, metrics['rr_std'], qrs, pr)
    conditions = detect_conditions(hr, pr, qrs, qtc, st_dev, rhythm, confidence)
    risk_score = compute_risk_score(conditions, hr, qtc, st_dev, rhythm)

    # Status & triage
    if risk_score >= 86:
        status = 'Critical'; triage = 'IMMEDIATE'
        recommendation = (
            'CRITICAL — Immediate cardiologist consultation required. '
            'Critical cardiac event indicators detected in ECG signal. '
            'Consider emergency intervention and continuous monitoring.'
        )
    elif risk_score >= 61:
        status = 'High Risk'; triage = 'URGENT'
        recommendation = (
            'HIGH RISK — Urgent cardiologist review required within 24 hours. '
            'Significant ECG abnormalities detected. '
            'Detailed workup and imaging recommended.'
        )
    elif risk_score >= 31:
        status = 'Moderate'; triage = 'ROUTINE'
        recommendation = (
            'MODERATE RISK — Schedule cardiology follow-up within 1–2 weeks. '
            'Monitor symptoms closely. Repeat ECG recommended.'
        )
    else:
        status = 'Normal'; triage = 'ROUTINE'
        recommendation = (
            'LOW RISK — ECG within acceptable limits. '
            'Routine annual follow-up recommended.'
        )

    # Confidence tier
    if confidence >= 90:
        conf_tier  = 'High'
        conf_label = '>90% confidence — High reliability, automated report generated'
    elif confidence >= 70:
        conf_tier  = 'Medium'
        conf_label = '70–90% confidence — Careful cardiologist review flagged'
    else:
        conf_tier  = 'Low'
        conf_label = '<70% confidence — Expert interpretation mandatory'

    return {
        'heartRate':          hr,
        'rhythmType':         rhythm,
        'prInterval':         pr,
        'qrsDuration':        qrs,
        'qtInterval':         qt,
        'qtcInterval':        qtc,
        'stDeviation':        round(st_dev, 2),
        'riskScore':          risk_score,
        'confidence':         confidence,
        'confidenceTier':     conf_tier,
        'confidenceLabel':    conf_label,
        'status':             status,
        'triage':             triage,
        'conditions':         conditions,
        'recommendation':     recommendation,
        'predictionProbability': risk_score,
        'analysisMethod':     f'ECG Signal Analysis ({method})',
        'signalSamples':      len(signal),
        'samplingRate':       fs,
    }
