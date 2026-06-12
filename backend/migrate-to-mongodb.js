/**
 * CardioSense AI — Data Migration Script
 * Migrates existing data from db.json → MongoDB
 *
 * Run ONCE after setting up MongoDB:
 *   node migrate-to-mongodb.js
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase, User, Report, Message, Notification } from './models.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE   = path.join(__dirname, 'data', 'db.json');

const migrate = async () => {
  console.log('\n  CardioSense AI — MongoDB Migration');
  console.log('  ====================================\n');

  // Connect to MongoDB
  await connectDatabase();

  // Load existing JSON data
  if (!fs.existsSync(DB_FILE)) {
    console.log('  No db.json found — nothing to migrate. Starting fresh.\n');
    process.exit(0);
  }

  let db;
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    console.error('  Failed to read db.json');
    process.exit(1);
  }

  const users         = db.users         || [];
  const reports       = db.reports       || [];
  const messages      = db.messages      || [];
  const notifications = db.notifications || [];

  console.log(`  Found in db.json:`);
  console.log(`    Users         : ${users.length}`);
  console.log(`    Reports       : ${reports.length}`);
  console.log(`    Messages      : ${messages.length}`);
  console.log(`    Notifications : ${notifications.length}`);
  console.log();

  // Check if MongoDB already has data
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) {
    console.log(`  ⚠️  MongoDB already has ${existingUsers} users.`);
    console.log('  Skipping migration to avoid duplicates.\n');
    process.exit(0);
  }

  // Migrate users
  let migratedUsers = 0;
  for (const u of users) {
    try {
      await User.create({
        name:           u.name,
        email:          u.email?.toLowerCase(),
        passwordHash:   u.passwordHash,
        role:           u.role,
        specialization: u.specialization || null,
        licenseNumber:  u.licenseNumber  || null,
        phone:          u.phone          || null,
        isActive:       u.isActive !== false,
        createdAt:      u.createdAt ? new Date(u.createdAt) : new Date(),
      });
      migratedUsers++;
    } catch (e) {
      console.log(`  Skipped user ${u.email}: ${e.message}`);
    }
  }

  // Migrate reports
  let migratedReports = 0;
  for (const r of reports) {
    try {
      await Report.create({
        reportId:          r.reportId,
        patientName:       r.patientName,
        patientEmail:      r.patientEmail?.toLowerCase(),
        patientAge:        r.patientAge   || null,
        patientGender:     r.patientGender|| null,
        symptoms:          r.symptoms     || '',
        notes:             r.notes        || '',
        cardiologistName:  r.cardiologistName,
        cardiologistEmail: r.cardiologistEmail?.toLowerCase(),
        status:            r.status       || 'Pending',
        confidence:        r.confidence   || '',
        conditions:        r.conditions   || [],
        fileUrl:           r.fileUrl      || '',
        fileName:          r.fileName     || '',
        fileSize:          r.fileSize     || 0,
        doctorNotes:       r.doctorNotes  || '',
        doctorAssessment:  r.doctorAssessment || '',
        analysis:          r.analysis     || {},
        finalizedAt:       r.finalizedAt  ? new Date(r.finalizedAt) : null,
        createdAt:         r.createdAt    ? new Date(r.createdAt) : new Date(),
      });
      migratedReports++;
    } catch (e) {
      console.log(`  Skipped report ${r.reportId}: ${e.message}`);
    }
  }

  // Migrate notifications
  let migratedNotifs = 0;
  for (const n of notifications) {
    try {
      await Notification.create({
        recipientEmail: n.recipientEmail?.toLowerCase(),
        type:           n.type    || 'new_ecg',
        title:          n.title,
        message:        n.message,
        reportId:       n.reportId || null,
        riskScore:      n.riskScore|| null,
        read:           n.read     || false,
        createdAt:      n.createdAt ? new Date(n.createdAt) : new Date(),
      });
      migratedNotifs++;
    } catch (e) {
      console.log(`  Skipped notification: ${e.message}`);
    }
  }

  // Migrate messages
  let migratedMsgs = 0;
  for (const m of messages) {
    try {
      await Message.create({
        conversationId: m.conversationId,
        text:           m.text,
        senderRole:     m.senderRole  || 'patient',
        senderName:     m.senderName  || 'User',
        senderEmail:    m.senderEmail?.toLowerCase(),
        isRead:         m.isRead      || false,
        createdAt:      m.createdAt   ? new Date(m.createdAt) : new Date(),
      });
      migratedMsgs++;
    } catch (e) {
      console.log(`  Skipped message: ${e.message}`);
    }
  }

  console.log('  Migration complete:');
  console.log(`    ✅ Users         : ${migratedUsers} / ${users.length}`);
  console.log(`    ✅ Reports       : ${migratedReports} / ${reports.length}`);
  console.log(`    ✅ Notifications : ${migratedNotifs} / ${notifications.length}`);
  console.log(`    ✅ Messages      : ${migratedMsgs} / ${messages.length}`);
  console.log();
  console.log('  All existing data is now in MongoDB!');
  console.log('  You can safely delete backend/data/db.json if you wish.\n');

  process.exit(0);
};

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
