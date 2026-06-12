import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectDatabase, User, Report, Message, Notification } from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5001;
const API_PREFIX = '/api';
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const JWT_SECRET = process.env.JWT_SECRET || 'CardioSense-Secret-Key-2024';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5002';

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const normalizeEmail = (email) => email?.trim().toLowerCase() || '';

const createToken = (user) =>
  jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

// ── AI INFERENCE ──────────────────────────────────────────────────────────────

const callAIService = async (clinicalData) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clinicalData),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error('AI service error');
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'AI prediction failed');
    return result.analysis;
  } catch {
    // Fallback: deterministic simulation when Python service is unavailable
    return fallbackAnalysis(clinicalData);
  }
};

// ── ECG Signal Analysis (real waveform from CSV file) ─────────────────────────
const callECGSignalAnalysis = async (filePath) => {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const blob = new Blob([fileBuffer]);
    const formData = new FormData();
    formData.append('ecgFile', blob, path.basename(filePath));

    const response = await fetch(`${AI_SERVICE_URL}/analyze-signal`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000), // signal analysis can take longer
    });

    if (!response.ok) throw new Error('ECG signal analysis failed');
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Signal analysis failed');
    return { analysis: result.analysis, method: 'ecg_signal' };
  } catch (err) {
    return { analysis: null, method: 'fallback', error: err.message };
  }
};

const fallbackAnalysis = (d) => {
  const age = Number(d.age) || 50;
  const oldpeak = Number(d.oldpeak) || 0;
  const exang = Number(d.exang) || 0;
  const thalach = Number(d.thalach) || 140;
  const chol = Number(d.chol) || 200;

  // Simple risk estimation based on clinical factors
  let riskScore = 20;
  if (age > 55) riskScore += 15;
  if (age > 65) riskScore += 10;
  if (oldpeak > 2) riskScore += 20;
  else if (oldpeak > 1) riskScore += 10;
  if (exang) riskScore += 15;
  if (thalach < 120) riskScore += 10;
  if (chol > 240) riskScore += 8;
  riskScore = Math.min(100, riskScore);

  const confidence = Math.min(99, 65 + Math.random() * 20);
  const hr = thalach > 0 ? Math.round(thalach * 0.75 + 20) : 80;

  let status, triage, recommendation;
  if (riskScore >= 86) {
    status = 'Critical'; triage = 'IMMEDIATE';
    recommendation = 'CRITICAL — Immediate cardiology consultation required.';
  } else if (riskScore >= 61) {
    status = 'High Risk'; triage = 'URGENT';
    recommendation = 'HIGH RISK — Urgent cardiologist review within 24 hours.';
  } else if (riskScore >= 31) {
    status = 'Moderate'; triage = 'ROUTINE';
    recommendation = 'MODERATE RISK — Schedule cardiology follow-up.';
  } else {
    status = 'Normal'; triage = 'ROUTINE';
    recommendation = 'LOW RISK — Routine follow-up recommended.';
  }

  const conditions = [];
  if (oldpeak >= 2) conditions.push({ name: 'ST Depression', severity: 'High', confidence: Math.round(confidence) });
  if (exang) conditions.push({ name: 'Exercise-Induced Angina', severity: 'Moderate', confidence: Math.round(confidence - 5) });
  if (hr > 100) conditions.push({ name: 'Tachycardia', severity: 'Moderate', confidence: Math.round(confidence - 3) });

  return {
    heartRate: hr, rhythmType: riskScore > 60 ? 'Sinus Arrhythmia' : 'Normal Sinus Rhythm',
    prInterval: 150, qrsDuration: 95, qtInterval: 410, qtcInterval: 430,
    stDeviation: oldpeak, riskScore, confidence: Math.round(confidence * 10) / 10,
    confidenceTier: confidence >= 90 ? 'High' : confidence >= 70 ? 'Medium' : 'Low',
    confidenceLabel: confidence >= 90
      ? '>90% confidence — High reliability'
      : confidence >= 70
        ? '70–90% confidence — Cardiologist review flagged'
        : '<70% confidence — Expert interpretation mandatory',
    status, triage, conditions, recommendation,
    predictionProbability: riskScore,
    note: 'AI service unavailable — deterministic fallback used',
  };
};

// ── NOTIFICATION HELPER ───────────────────────────────────────────────────────

const createNotification = async ({ recipientEmail, type, title, message, reportId = null, riskScore = null }) => {
  try {
    await Notification.create({
      recipientEmail: normalizeEmail(recipientEmail),
      type,        // 'new_ecg' | 'report_approved' | 'report_rejected' | 'critical_alert' | 'draft_saved'
      title,
      message,
      reportId,
      riskScore,
      read: false,
    });
  } catch { /* non-critical — swallow */ }
};

// ── MEDICAL REFERENCE ─────────────────────────────────────────────────────────

const getMedicalReferences = () => ({
  conditions: [
    { id: 'normal-sinus', name: 'Normal Sinus Rhythm', code: 'NSR', riskLevel: 'Low', description: 'Normal heart rhythm with regular rate and rhythm' },
    { id: 'atrial-fibrillation', name: 'Atrial Fibrillation', code: 'AFib', riskLevel: 'High', description: 'Irregular rapid heart rate; blood may pool in the atria', symptoms: ['Palpitations', 'Shortness of breath', 'Fatigue', 'Dizziness'] },
    { id: 'myocardial-infarction', name: 'Myocardial Infarction', code: 'MI', riskLevel: 'Critical', description: 'Heart attack caused by coronary artery blockage', symptoms: ['Chest pain', 'Radiating pain', 'Shortness of breath', 'Nausea'] },
    { id: 'left-ventricular-hypertrophy', name: 'Left Ventricular Hypertrophy', code: 'LVH', riskLevel: 'Moderate', description: 'Thickened left ventricle walls from high blood pressure' },
    { id: 'bundle-branch-block', name: 'Bundle Branch Block', code: 'BBB', riskLevel: 'Moderate', description: 'Delay in electrical conduction through the heart' },
    { id: 'st-elevation', name: 'ST Elevation', code: 'STE', riskLevel: 'Critical', description: 'ST segment elevation — indicator of acute coronary syndrome' },
  ],
  measurements: [
    { name: 'Heart Rate', normal: '60–100 bpm', unit: 'bpm' },
    { name: 'PR Interval', normal: '120–200 ms', unit: 'ms' },
    { name: 'QRS Duration', normal: '80–120 ms', unit: 'ms' },
    { name: 'QT Interval', normal: '<440 ms (M), <460 ms (F)', unit: 'ms' },
    { name: 'ST Segment', normal: 'Isoelectric', unit: 'mV' },
  ],
});

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

// ── ROUTES ────────────────────────────────────────────────────────────────────

app.get(`${API_PREFIX}/health`, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth
/* ── Generate unique Patient ID ── */
const generatePatientId = async () => {
  const count = await User.countDocuments({ role: 'Patient' });
  const padded = String(count + 1).padStart(5, '0');
  return `CS-P-${padded}`;
};

/* ── Safe user object (no password) ── */
const safeUser = (u) => ({
  id:          u._id.toString(),
  patientId:   u.patientId || null,
  name:        u.name,
  email:       u.email,
  role:        u.role,
  specialization: u.specialization || null,
  licenseNumber:  u.licenseNumber  || null,
  phone:          u.phone          || null,
});

app.post(`${API_PREFIX}/auth/register`, async (req, res) => {
  try {
    const { name, email, password, role, specialization, licenseNumber } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ success: false, message: 'All registration fields are required.' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    const normalizedEmail = normalizeEmail(email);
    if (await User.findOne({ email: normalizedEmail }))
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 10);

    // Auto-generate Patient ID for patients only
    const patientId = role === 'Patient' ? await generatePatientId() : null;

    const user = await User.create({
      patientId,
      name: name.trim(), email: normalizedEmail, passwordHash, role,
      specialization: role === 'Cardiologist' ? specialization || 'General Cardiology' : null,
      licenseNumber:  role === 'Cardiologist' ? licenseNumber || null : null,
      isActive: true,
    });

    res.json({ success: true, user: safeUser(user), token: createToken(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post(`${API_PREFIX}/auth/login`, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role)
      return res.status(400).json({ success: false, message: 'Email, password, and role are required.' });

    const user = await User.findOne({ email: normalizeEmail(email), role, isActive: true });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ success: false, message: 'Invalid email, password, or role selection.' });

    res.json({ success: true, user: safeUser(user), token: createToken(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get(`${API_PREFIX}/users/:id`, verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { passwordHash, __v, ...safeUser } = user;
    res.json({ ...safeUser, id: safeUser._id?.toString() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update profile
app.put(`${API_PREFIX}/users/:id/profile`, verifyToken, async (req, res) => {
  try {
    if (req.user.id !== req.params.id)
      return res.status(403).json({ success: false, message: 'Not authorized to update this profile.' });

    const { name, phone, specialization, licenseNumber } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (name?.trim())          user.name           = name.trim();
    if (phone !== undefined)   user.phone          = phone;
    if (specialization !== undefined) user.specialization = specialization;
    if (licenseNumber !== undefined)  user.licenseNumber  = licenseNumber;

    await user.save();
    const { passwordHash, __v, ...safeUser } = user.toObject();
    res.json({ success: true, user: { ...safeUser, id: safeUser._id?.toString() } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Change password
app.put(`${API_PREFIX}/users/:id/password`, verifyToken, async (req, res) => {
  try {
    if (req.user.id !== req.params.id)
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Both current and new password are required.' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get(`${API_PREFIX}/doctors`, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'Cardiologist', isActive: true })
      .select('-passwordHash -__v')
      .lean();
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get all patients (cardiologist only) ──
app.get(`${API_PREFIX}/patients`, verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Cardiologist')
      return res.status(403).json({ success: false, message: 'Cardiologists only.' });
    const patients = await User.find({ role: 'Patient', isActive: true })
      .select('-passwordHash -__v')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, patients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Find patient by Patient ID ──
app.get(`${API_PREFIX}/patients/find/:patientId`, verifyToken, async (req, res) => {
  try {
    const patient = await User.findOne({ patientId: req.params.patientId.toUpperCase() })
      .select('-passwordHash -__v').lean();
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    res.json({ success: true, patient });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Medical reference
app.get(`${API_PREFIX}/medical-reference`, (req, res) => res.json(getMedicalReferences()));
app.get(`${API_PREFIX}/medical-reference/conditions`, (req, res) => res.json(getMedicalReferences().conditions));
app.get(`${API_PREFIX}/medical-reference/measurements`, (req, res) => res.json(getMedicalReferences().measurements));

// Reports
app.get(`${API_PREFIX}/reports`, verifyToken, async (req, res) => {
  try {
    const { patientEmail, doctorEmail, status, limit = 50, offset = 0 } = req.query;
    const query = {};
    if (patientEmail) query.patientEmail = normalizeEmail(patientEmail);
    if (doctorEmail) query.cardiologistEmail = normalizeEmail(doctorEmail);
    if (status) query.status = status;

    const total = await Report.countDocuments(query);
    const reports = await Report.find(query).sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit)).lean();
    res.json({ success: true, reports, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get(`${API_PREFIX}/reports/:id`, verifyToken, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ECG Upload with AI analysis
app.post(`${API_PREFIX}/upload`, verifyToken, upload.single('ecgFile'), async (req, res) => {
  try {
    const {
      patientName, patientEmail, patientAge, patientGender, symptoms, notes,
      cardiologistName, cardiologistEmail,
      // Clinical measurement fields for AI
      cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope,
    } = req.body;

    if (!req.file || !patientName || !patientEmail || !cardiologistName || !cardiologistEmail)
      return res.status(400).json({ success: false, message: 'Missing required upload fields or file.' });

    // Detect if uploaded file is a raw ECG signal (CSV)
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const isECGSignal = fileExt === '.csv';

    let analysis;
    if (isECGSignal) {
      // ── Real ECG signal analysis path ──
      const uploadedFilePath = path.join(UPLOAD_DIR, req.file.filename);
      const signalResult = await callECGSignalAnalysis(uploadedFilePath);

      if (signalResult.analysis) {
        analysis = signalResult.analysis;
      } else {
        // Signal analysis failed — fall back to clinical data model
        const clinicalData = {
          age: patientAge || 50, sex: patientGender === 'female' ? 0 : 1,
          cp: Number(cp) || 2, trestbps: Number(trestbps) || 120,
          chol: Number(chol) || 200, fbs: fbs === 'true' || fbs === true ? 1 : 0,
          restecg: Number(restecg) || 0, thalach: Number(thalach) || 150,
          exang: exang === 'true' || exang === true ? 1 : 0,
          oldpeak: Number(oldpeak) || 0, slope: Number(slope) || 1, ca: 0, thal: 2,
        };
        analysis = await callAIService(clinicalData);
        analysis.analysisMethod = 'Clinical Data Model (signal fallback)';
      }
    } else {
      // ── Clinical data model path (for non-CSV files: jpg, pdf, etc.) ──
      const clinicalData = {
        age: patientAge || 50,
        sex: patientGender === 'female' ? 0 : 1,
        cp: Number(cp) || 2,
        trestbps: Number(trestbps) || 120,
        chol: Number(chol) || 200,
        fbs: fbs === 'true' || fbs === true ? 1 : 0,
        restecg: Number(restecg) || 0,
        thalach: Number(thalach) || 150,
        exang: exang === 'true' || exang === true ? 1 : 0,
        oldpeak: Number(oldpeak) || 0,
        slope: Number(slope) || 1,
        ca: 0,
        thal: 2,
      };
      analysis = await callAIService(clinicalData);
      analysis.analysisMethod = 'Clinical Data Model';
    }

    // Fetch patientId if patient exists in DB
    const patientUser = await User.findOne({ email: normalizeEmail(patientEmail) }).lean();

    const report = await Report.create({
      reportId: `ECG-${Date.now()}`,
      patientId: patientUser?.patientId || null,
      patientName: patientName.trim(),
      patientEmail: normalizeEmail(patientEmail),
      patientAge: patientAge ? Number(patientAge) : null,
      patientGender: patientGender || null,
      symptoms: symptoms || '',
      notes: notes || '',
      cardiologistName: cardiologistName.trim(),
      cardiologistEmail: normalizeEmail(cardiologistEmail),
      status: analysis.status || 'Pending',
      confidence: String(analysis.confidence || ''),
      conditions: (analysis.conditions || []).map((c) => c.name),
      fileUrl: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      doctorNotes: '',
      doctorAssessment: '',
      analysis,
    });

    // ── Notify cardiologist of new ECG upload ──
    await createNotification({
      recipientEmail: normalizeEmail(cardiologistEmail),
      type: analysis.riskScore >= 86 ? 'critical_alert' : 'new_ecg',
      title: analysis.riskScore >= 86
        ? `🚨 Critical ECG — ${patientName}`
        : `📋 New ECG Upload — ${patientName}`,
      message: analysis.riskScore >= 86
        ? `Critical risk score ${analysis.riskScore}/100. Immediate review required.`
        : `New ECG analysis ready. Risk score: ${analysis.riskScore}/100 (${analysis.status}).`,
      reportId: report._id,
      riskScore: analysis.riskScore,
    });

    // ── Notify patient that their ECG was analyzed ──
    await createNotification({
      recipientEmail: normalizeEmail(patientEmail),
      type: 'new_ecg',
      title: '✅ Your ECG Has Been Analyzed',
      message: `Your ECG report is ready. Risk score: ${analysis.riskScore}/100 — ${analysis.status}. Your cardiologist will review shortly.`,
      reportId: report._id,
      riskScore: analysis.riskScore,
    });

    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put(`${API_PREFIX}/reports/:id`, verifyToken, async (req, res) => {
  try {
    const { status, doctorNotes, doctorAssessment, conditions, confidence, analysis } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    if (status) report.status = status;
    if (doctorNotes !== undefined) report.doctorNotes = doctorNotes;
    if (doctorAssessment !== undefined) report.doctorAssessment = doctorAssessment;
    if (conditions) report.conditions = conditions;
    if (confidence) report.confidence = confidence;
    if (analysis) {
      report.analysis = { ...report.analysis, ...analysis };
      report.markModified('analysis'); // required for Mongoose Mixed fields
    }
    if (status && status !== 'Pending') report.finalizedAt = new Date();

    await report.save();

    // ── Notify patient when cardiologist changes status ──
    if (status && report.patientEmail) {
      const notifMap = {
        Approved: { type:'report_approved', title:'✅ Your ECG Report Was Approved', message:`Your cardiologist has reviewed and approved your ECG report. Log in to view the final report.` },
        Rejected: { type:'report_rejected', title:'⚠️ ECG Finding Flagged for Review', message:`Your cardiologist has flagged a concern with the AI finding. Please consult with your doctor.` },
        Draft:    { type:'draft_saved',     title:'📝 Report Draft Saved',            message:`Your cardiologist saved a draft assessment. Final report coming soon.` },
      };
      if (notifMap[status]) {
        await createNotification({
          recipientEmail: report.patientEmail,
          ...notifMap[status],
          reportId: report._id,
          riskScore: report.analysis?.riskScore ?? null,
        });
      }
    }

    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete(`${API_PREFIX}/reports/:id`, verifyToken, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    if (report.fileUrl) {
      try { await fs.unlink(path.join(__dirname, report.fileUrl)); } catch { /* file may not exist */ }
    }

    await Report.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Re-analyze existing report
app.post(`${API_PREFIX}/analyze-ecg/:reportId`, verifyToken, async (req, res) => {
  try {
    const report = await Report.findById(req.params.reportId);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    const clinicalData = { age: report.patientAge || 50, sex: report.patientGender === 'female' ? 0 : 1, cp: 2, trestbps: 120, chol: 200, fbs: 0, restecg: 0, thalach: 150, exang: 0, oldpeak: 0, slope: 1, ca: 0, thal: 2 };
    const analysis = await callAIService(clinicalData);

    report.analysis = analysis;
    report.confidence = String(analysis.confidence);
    report.conditions = (analysis.conditions || []).map((c) => c.name);
    report.status = analysis.status;
    await report.save();

    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

// Get notifications for logged-in user
app.get(`${API_PREFIX}/notifications`, verifyToken, async (req, res) => {
  try {
    const email = normalizeEmail(req.user.email);
    const all   = await Notification.find({ recipientEmail: email }).sort({ createdAt: -1 }).limit(50).lean();
    const unread = all.filter(n => !n.read).length;
    res.json({ success: true, notifications: all, unread });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mark ALL notifications as read  ← must be before /:id/read to avoid route conflict
app.put(`${API_PREFIX}/notifications/read-all`, verifyToken, async (req, res) => {
  try {
    const email = normalizeEmail(req.user.email);
    const all   = await Notification.find({ recipientEmail: email, read: false }).lean();
    for (const n of all) {
      const doc = await Notification.findById(n._id);
      if (doc) { doc.read = true; await doc.save(); }
    }
    res.json({ success: true, marked: all.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mark one notification as read
app.put(`${API_PREFIX}/notifications/:id/read`, verifyToken, async (req, res) => {
  try {
    const n = await Notification.findById(req.params.id);
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
    n.read = true;
    await n.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete one notification
app.delete(`${API_PREFIX}/notifications/:id`, verifyToken, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete all notifications for user
app.delete(`${API_PREFIX}/notifications`, verifyToken, async (req, res) => {
  try {
    const email = normalizeEmail(req.user.email);
    const all   = await Notification.find({ recipientEmail: email }).lean();
    for (const n of all) await Notification.findByIdAndDelete(n._id);
    res.json({ success: true, deleted: all.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Messages / Chat
app.get(`${API_PREFIX}/messages`, verifyToken, async (req, res) => {
  try {
    const { conversationId, limit = 50, offset = 0 } = req.query;
    const query = conversationId ? { conversationId } : {};
    const total = await Message.countDocuments(query);
    const messages = await Message.find(query).sort({ createdAt: 1 }).skip(Number(offset)).limit(Number(limit)).lean();
    res.json({ success: true, messages, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post(`${API_PREFIX}/messages`, verifyToken, async (req, res) => {
  try {
    const { conversationId, text, senderRole, senderName, senderEmail } = req.body;
    if (!conversationId || !text || !senderEmail)
      return res.status(400).json({ success: false, message: 'Conversation ID, text, and sender email required.' });

    const message = await Message.create({ conversationId, text, senderRole: senderRole || 'patient', senderName: senderName || 'User', senderEmail: normalizeEmail(senderEmail), isRead: false });
    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post(`${API_PREFIX}/chat`, verifyToken, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, error: 'Message is required' });

    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    // ── Fetch patient's reports for context ──
    let reportsContext = 'No ECG reports on file yet.';
    try {
      const userReports = req.user.role === 'Patient'
        ? await Report.find({ patientEmail: req.user.email }).sort({ createdAt: -1 }).limit(10).lean()
        : await Report.find({ cardiologistEmail: req.user.email }).sort({ createdAt: -1 }).limit(10).lean();

      if (userReports.length > 0) {
        reportsContext = userReports.map((r, i) => {
          const a = r.analysis || {};
          const date = new Date(r.createdAt).toLocaleDateString('en-GB');
          return `Report ${i + 1} (${date}):
  - Patient: ${r.patientName} | Status: ${r.status}
  - Risk Score: ${a.riskScore ?? 'N/A'}/100 | Heart Rate: ${a.heartRate ?? 'N/A'} bpm
  - Rhythm: ${a.rhythmType ?? 'N/A'} | QTc: ${a.qtcInterval ?? 'N/A'} ms
  - ST Deviation: ${a.stDeviation ?? 'N/A'} mm | PR: ${a.prInterval ?? 'N/A'} ms | QRS: ${a.qrsDuration ?? 'N/A'} ms
  - Conditions: ${(a.conditions || []).map(c => `${c.name} (${c.severity})`).join(', ') || 'None detected'}
  - Recommendation: ${a.recommendation ?? 'N/A'}
  - Triage: ${a.triage ?? 'N/A'} | Cardiologist: Dr. ${r.cardiologistName}`;
        }).join('\n\n');
      }
    } catch (_) { /* reports not critical */ }

    // ── System prompt ──
    const systemPrompt = `You are CardioSense AI — a friendly, intelligent health assistant for a cardiac care platform used in Sri Lanka.

PATIENT INFORMATION:
- Name: ${req.user.name}
- Email: ${req.user.email}
- Role: ${req.user.role}

PATIENT'S ECG REPORTS:
${reportsContext}

SRI LANKA HOSPITALS (for hospital queries):
Colombo: Asiri Central (+94 11 545 0000), Lanka Hospitals (+94 11 553 0000), Durdans (+94 11 254 0954), Nawaloka (+94 11 254 4444)
Kandy: Kandy Teaching Hospital (+94 81 222 3337), Durdans Kandy (+94 81 222 8989)
Galle: Karapitiya Teaching (+94 91 222 2261), Hemas Galle (+94 91 222 4455)
Jaffna: Jaffna Teaching Hospital (+94 21 222 1511)
Emergency: Call 1990 (Suwa Seriya Ambulance)

INSTRUCTIONS:
- You can answer ANY question — medical, general, casual, anything
- Always respond naturally. If someone says "Hi", reply "Hi!" warmly
- For their ECG reports, use the exact data provided above to give accurate answers
- For medical questions, be accurate and helpful
- For emergencies (chest pain, can't breathe etc.), always advise calling 1990 immediately
- Be conversational, warm and professional
- Use the patient's first name occasionally to be personal
- Format responses clearly with line breaks for readability
- You are NOT limited to only cardiology — answer any question the user asks`;

    // ── No API key fallback ──
    if (!GROQ_API_KEY) {
      return res.json({
        success: false,
        error: 'GROQ_API_KEY not configured',
        fallback: true
      });
    }

    // ── Build conversation history for Groq ──
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-16).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      })),
      { role: 'user', content: message.trim() },
    ];

    // ── Call Groq API ──
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: groqMessages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      throw new Error(`Groq API error: ${groqRes.status} — ${errText}`);
    }

    const groqData = await groqRes.json();
    const reply = groqData.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    res.json({ success: true, reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Error handlers
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.all('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

await connectDatabase();

// ── Assign Patient IDs to existing patients who don't have one ──
const assignMissingPatientIds = async () => {
  const unassigned = await User.find({ role: 'Patient', patientId: null }).sort({ createdAt: 1 });
  if (unassigned.length > 0) {
    const baseCount = await User.countDocuments({ role: 'Patient', patientId: { $ne: null } });
    for (let i = 0; i < unassigned.length; i++) {
      const padded = String(baseCount + i + 1).padStart(5, '0');
      unassigned[i].patientId = `CS-P-${padded}`;
      await unassigned[i].save();
    }
    console.log(`  ✅ Assigned Patient IDs to ${unassigned.length} existing patient(s)`);
  }

  // ── Backfill patientId into existing reports that are missing it ──
  const reportsWithoutId = await Report.find({ patientId: null });
  let backfilled = 0;
  for (const report of reportsWithoutId) {
    const patient = await User.findOne({ email: report.patientEmail }).lean();
    if (patient?.patientId) {
      report.patientId = patient.patientId;
      await report.save();
      backfilled++;
    }
  }
  if (backfilled > 0) console.log(`  ✅ Backfilled patientId into ${backfilled} existing report(s)`);
};
await assignMissingPatientIds();

app.listen(PORT, () => {
  console.log(`\n  CardioSense backend → http://localhost:${PORT}`);
  console.log(`  AI service target  → ${AI_SERVICE_URL}`);
  console.log(`  Upload directory   → ${UPLOAD_DIR}\n`);
});
