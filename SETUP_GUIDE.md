# CardioSense AI — Setup & Run Guide

## Prerequisites
- Node.js >= 18  
- MongoDB running locally on port 27017  
- Python 3.10+ (already installed)

---

## One-Click Start (Windows PowerShell)

```powershell
cd "D:\Cardiosense-AI-Website-main\Cardiosense-AI-Website-main"
.\START_ALL.ps1
```

This opens three windows:
| Service | URL |
|---|---|
| React Dashboard | http://localhost:5173 |
| Node.js API | http://localhost:5001 |
| Python AI | http://localhost:5002 |

---

## Manual Start (3 terminals)

### Terminal 1 — Python AI Service
```bash
cd ai_service
python app.py
```

### Terminal 2 — Node.js Backend
```bash
cd backend
npm start
```

### Terminal 3 — React Frontend
```bash
npm run dev
```

---

## AI Model

The model is **already trained** (97% accuracy, ROC-AUC 0.98).  
To re-train from the CSV datasets:
```bash
cd ai_service
python train_model.py
```

Training datasets:
- `ai_service/data/heart_disease_uci.csv` — UCI Heart Disease (308 samples)
- `ai_service/data/heart_statlog_cleveland_hungary_final.csv` — Heart Statlog (1190 samples)
- **Combined: 1498 samples, 51.6% disease prevalence**

---

## How It Works

```
Patient ECG PDF + Clinical Measurements
         ↓
   Node.js Backend (port 5001)
         ↓
   Python AI Service (port 5002)
    ├── Gradient Boosting Classifier
    ├── Trained on 1498 patient records
    └── Returns: Risk Score, Conditions, Triage
         ↓
   MongoDB (stores report + analysis)
         ↓
   React Dashboard (port 5173)
    ├── Upload ECG page (with clinical fields)
    ├── Results page (risk bands, ECG viewer)
    ├── Doctor Review (approve / reject / save draft)
    └── Printable Report (PDF via browser print)
```

---

## Confidence & Triage Thresholds

| Confidence | Action |
|---|---|
| ≥ 90% | High reliability — automated report generated |
| 70–90% | Careful cardiologist review flagged |
| < 70% | Expert interpretation mandatory |

| Risk Score | Status | Triage |
|---|---|---|
| 0–30 | Normal | Routine |
| 31–60 | Moderate | Routine |
| 61–85 | High Risk | Urgent (24 hrs) |
| 86–100 | Critical | Immediate |

---

## Troubleshooting

**"No token / 401 errors"** — Log out and log back in; the new auth flow stores JWT correctly.

**"AI service unavailable"** — Backend falls back to deterministic simulation; start `python ai_service/app.py` for full AI.

**MongoDB not running** — Start MongoDB: `net start MongoDB` or `mongod --dbpath C:\data\db`

**C: drive full** — Python packages are installed in `D:\py_packages`. The AI scripts add this path automatically.
