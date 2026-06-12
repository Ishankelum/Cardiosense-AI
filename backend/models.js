/**
 * CardioSense AI — MongoDB / Mongoose Models
 * Replaces the JSON file database with real MongoDB.
 * Connection string: set MONGODB_URI in backend/.env
 *   Local : mongodb://127.0.0.1:27017/cardiosense
 *   Atlas : mongodb+srv://<user>:<pass>@cluster.mongodb.net/cardiosense
 */

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// ── User ──────────────────────────────────────────────────────────────────────

const userSchema = new Schema(
  {
    patientId:      { type: String, unique: true, sparse: true, default: null }, // e.g. CS-P-00001
    name:           { type: String, required: true, trim: true },
    email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:   { type: String, required: true },
    role:           { type: String, required: true, enum: ['Cardiologist', 'Patient'] },
    specialization: { type: String, default: null },
    licenseNumber:  { type: String, default: null },
    phone:          { type: String, default: null },
    isActive:       { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ── Report ────────────────────────────────────────────────────────────────────

const reportSchema = new Schema(
  {
    reportId:          { type: String, required: true },
    patientId:         { type: String, default: null },
    patientName:       { type: String, required: true },
    patientEmail:      { type: String, required: true, lowercase: true },
    patientAge:        { type: Number, default: null },
    patientGender:     { type: String, default: null },
    symptoms:          { type: String, default: '' },
    notes:             { type: String, default: '' },
    cardiologistName:  { type: String, required: true },
    cardiologistEmail: { type: String, required: true, lowercase: true },
    status:            { type: String, default: 'Pending' },
    confidence:        { type: String, default: '' },
    conditions:        { type: [String], default: [] },
    fileUrl:           { type: String, default: '' },
    fileName:          { type: String, default: '' },
    fileSize:          { type: Number, default: 0 },
    doctorNotes:       { type: String, default: '' },
    doctorAssessment:  { type: String, default: '' },
    analysis:          { type: Schema.Types.Mixed, default: {} },
    finalizedAt:       { type: Date, default: null },
  },
  { timestamps: true },
);

// ── Message ───────────────────────────────────────────────────────────────────

const messageSchema = new Schema(
  {
    conversationId: { type: String, required: true },
    text:           { type: String, required: true },
    senderRole:     { type: String, default: 'patient' },
    senderName:     { type: String, default: 'User' },
    senderEmail:    { type: String, lowercase: true },
    isRead:         { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ── Notification ──────────────────────────────────────────────────────────────

const notificationSchema = new Schema(
  {
    recipientEmail: { type: String, required: true, lowercase: true },
    type:           { type: String, default: 'new_ecg' },
    title:          { type: String, required: true },
    message:        { type: String, required: true },
    reportId:       { type: String, default: null },
    riskScore:      { type: Number, default: null },
    read:           { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Note: email index on userSchema is already defined via unique:true in the schema field
reportSchema.index({ patientEmail: 1 });
reportSchema.index({ cardiologistEmail: 1 });
reportSchema.index({ createdAt: -1 });
notificationSchema.index({ recipientEmail: 1, createdAt: -1 });

// ── Model exports ─────────────────────────────────────────────────────────────

export const User         = model('User',         userSchema);
export const Report       = model('Report',       reportSchema);
export const Message      = model('Message',      messageSchema);
export const Notification = model('Notification', notificationSchema);

// ── Database connection ───────────────────────────────────────────────────────

export const connectDatabase = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cardiosense';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });

    const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'); // hide credentials
    console.log('MongoDB connected ->', safeUri);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    console.error('Make sure MongoDB is running or check your MONGODB_URI in backend/.env');
    process.exit(1);
  }
};
