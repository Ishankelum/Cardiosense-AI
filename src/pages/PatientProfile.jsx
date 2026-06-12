import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, HeartPulse, FileText, Calendar,
  CheckCircle, AlertTriangle, Clock, Eye, ClipboardList,
  Activity, TrendingUp, ShieldAlert, UploadCloud,
} from 'lucide-react';
import { useReports } from '../context/ReportsContext';
import ECGUploadModal from '../components/ECGUploadModal';
import './PatientProfile.css';

/* ── helpers ── */
const riskColor = (score) => {
  if (score >= 86) return '#EF4444';
  if (score >= 61) return '#F59E0B';
  if (score >= 31) return '#3B82F6';
  return '#10B981';
};
const riskBg = (score) => {
  if (score >= 86) return '#FEE2E2';
  if (score >= 61) return '#FEF3C7';
  if (score >= 31) return '#EBF3FF';
  return '#D1FAE5';
};
const statusColor = (s) => ({
  Approved: '#10B981', Rejected: '#EF4444', Pending: '#F59E0B', Draft: '#8B5CF6',
}[s] || '#6B7280');
const statusBg = (s) => ({
  Approved: '#D1FAE5', Rejected: '#FEE2E2', Pending: '#FEF3C7', Draft: '#EDE9FE',
}[s] || '#F3F4F6');
const StatusIcon = ({ s }) => ({
  Approved: <CheckCircle size={13} />,
  Rejected: <AlertTriangle size={13} />,
  Pending:  <Clock size={13} />,
}[s] || <FileText size={13} />);

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const initials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

/* ══════════════════════════════════════════════════════════════ */
const PatientProfile = () => {
  const { email } = useParams();
  const navigate  = useNavigate();
  const { reports, fetchReports } = useReports();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const decodedEmail = decodeURIComponent(email);

  /* All reports for this patient */
  const patientReports = useMemo(() =>
    [...(reports || [])]
      .filter(r => r.patientEmail?.toLowerCase() === decodedEmail.toLowerCase())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [reports, decodedEmail]
  );

  const patient = patientReports[0] || null;

  /* Stats */
  const stats = useMemo(() => {
    if (!patientReports.length) return null;
    const scores  = patientReports.map(r => r.analysis?.riskScore).filter(s => s != null);
    const avgRisk = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const maxRisk = scores.length ? Math.max(...scores) : null;
    return {
      total:    patientReports.length,
      approved: patientReports.filter(r => r.status === 'Approved').length,
      pending:  patientReports.filter(r => r.status === 'Pending' || r.status === 'Draft').length,
      avgRisk,
      maxRisk,
      latestRisk: patientReports[0]?.analysis?.riskScore ?? null,
    };
  }, [patientReports]);

  if (!patient) {
    return (
      <div className="patient-profile-page">
        <button className="btn btn-outline pp-back" onClick={() => navigate('/patients')}>
          <ArrowLeft size={16} /> Back to Patients
        </button>
        <div className="card" style={{ padding: 48, textAlign: 'center', marginTop: 24 }}>
          <User size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
          <h2>Patient Not Found</h2>
          <p style={{ color: '#6B7280' }}>No reports found for this patient.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-profile-page">

      {/* Back */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button className="btn btn-outline pp-back" type="button" onClick={() => navigate('/patients')}>
          <ArrowLeft size={16} /> Back to Patients
        </button>
        <button 
          className="btn btn-primary" 
          type="button" 
          onClick={() => setUploadModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <UploadCloud size={16} /> Upload ECG Report
        </button>
      </div>

      {/* ── Patient Header Card ── */}
      <div className="card pp-header-card">
        <div className="pp-avatar">{initials(patient.patientName)}</div>
        <div className="pp-header-info">
          <div className="pp-name-row">
            <h1>{patient.patientName}</h1>
            {patient.patientId && (
              <span className="pp-id-badge">{patient.patientId}</span>
            )}
          </div>
          <div className="pp-meta">
            <span>✉️ {patient.patientEmail}</span>
            {patient.patientAge  && <span>🎂 {patient.patientAge} years</span>}
            {patient.patientGender && <span>👤 {patient.patientGender}</span>}
            <span>👨‍⚕️ Dr. {patient.cardiologistName}</span>
          </div>
        </div>
        {stats?.latestRisk != null && (
          <div className="pp-risk-circle" style={{ background: riskBg(stats.latestRisk), borderColor: riskColor(stats.latestRisk) }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: riskColor(stats.latestRisk) }}>{stats.latestRisk}</span>
            <span style={{ fontSize: 11, color: '#6B7280' }}>Latest Risk</span>
          </div>
        )}
      </div>

      {/* ── Stats Row ── */}
      {stats && (
        <div className="pp-stats-row">
          {[
            { icon: <FileText size={20} color="#0A66C2" />, bg: '#EBF3FF', label: 'Total Reports', value: stats.total },
            { icon: <CheckCircle size={20} color="#10B981" />, bg: '#D1FAE5', label: 'Approved', value: stats.approved },
            { icon: <Clock size={20} color="#F59E0B" />, bg: '#FEF3C7', label: 'Pending Review', value: stats.pending },
            { icon: <TrendingUp size={20} color="#8B5CF6" />, bg: '#EDE9FE', label: 'Avg Risk Score', value: stats.avgRisk != null ? `${stats.avgRisk}/100` : '—' },
            { icon: <ShieldAlert size={20} color="#EF4444" />, bg: '#FEE2E2', label: 'Highest Risk', value: stats.maxRisk != null ? `${stats.maxRisk}/100` : '—' },
          ].map((s, i) => (
            <div className="card pp-stat" key={i}>
              <div className="stat-icon" style={{ backgroundColor: s.bg }}>{s.icon}</div>
              <div><h3>{s.value}</h3><p className="text-muted">{s.label}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* ── Report History ── */}
      <div className="card pp-history-card">
        <div className="pp-history-header">
          <ClipboardList size={20} color="#0A66C2" />
          <h2>Report History</h2>
          <span className="pp-report-count">{patientReports.length} report{patientReports.length !== 1 ? 's' : ''}</span>
        </div>

        {patientReports.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Activity size={40} color="#D1D5DB" />
            <p style={{ color: '#6B7280', marginTop: 12 }}>No reports yet</p>
          </div>
        ) : (
          <div className="pp-timeline">
            {patientReports.map((r, i) => {
              const score = r.analysis?.riskScore;
              const isLatest = i === 0;
              const conditions = (r.analysis?.conditions || []).map(c => c.name || c).slice(0, 3);

              return (
                <div key={r._id} className={`pp-report-card ${isLatest ? 'pp-report-latest' : ''}`}>

                  {/* Timeline dot */}
                  <div className="pp-timeline-dot" style={{ background: score != null ? riskColor(score) : '#D1D5DB' }} />

                  <div className="pp-report-body">
                    {/* Report top row */}
                    <div className="pp-report-top">
                      <div className="pp-report-id-row">
                        <span className="pp-report-id">#{r.reportId?.slice(-8).toUpperCase() || r._id?.slice(-6).toUpperCase()}</span>
                        {isLatest && <span className="pp-latest-chip">Latest</span>}
                        <span className="pp-status-chip" style={{ background: statusBg(r.status), color: statusColor(r.status) }}>
                          <StatusIcon s={r.status} /> {r.status}
                        </span>
                      </div>
                      <span className="pp-report-date">
                        <Calendar size={12} /> {fmt(r.createdAt)}
                      </span>
                    </div>

                    {/* Vitals row */}
                    <div className="pp-vitals-row">
                      {r.analysis?.heartRate && (
                        <div className="pp-vital">
                          <span className="pp-vital-label">Heart Rate</span>
                          <span className="pp-vital-val">❤️ {r.analysis.heartRate} bpm</span>
                        </div>
                      )}
                      {r.analysis?.rhythmType && (
                        <div className="pp-vital">
                          <span className="pp-vital-label">Rhythm</span>
                          <span className="pp-vital-val">🫀 {r.analysis.rhythmType}</span>
                        </div>
                      )}
                      {r.analysis?.qtcInterval && (
                        <div className="pp-vital">
                          <span className="pp-vital-label">QTc</span>
                          <span className="pp-vital-val">⏱ {r.analysis.qtcInterval} ms</span>
                        </div>
                      )}
                      {r.analysis?.stDeviation != null && (
                        <div className="pp-vital">
                          <span className="pp-vital-label">ST Dev</span>
                          <span className="pp-vital-val">📈 {r.analysis.stDeviation} mm</span>
                        </div>
                      )}
                      {score != null && (
                        <div className="pp-vital">
                          <span className="pp-vital-label">Risk Score</span>
                          <span className="pp-vital-val" style={{ color: riskColor(score), fontWeight: 800 }}>
                            {score}/100
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Conditions */}
                    {conditions.length > 0 && (
                      <div className="pp-conditions-row">
                        {conditions.map((c, ci) => (
                          <span key={ci} className="pp-condition-chip">{c}</span>
                        ))}
                      </div>
                    )}

                    {/* Doctor notes */}
                    {r.doctorNotes && (
                      <div className="pp-doctor-note">
                        <span className="pp-note-label">👨‍⚕️ Doctor Notes:</span>
                        <span className="pp-note-text">{r.doctorNotes}</span>
                      </div>
                    )}

                    {/* Action */}
                    <div className="pp-report-actions">
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: 13, padding: '6px 14px' }}
                        onClick={() => navigate('/results', { state: { reportId: r._id } })}
                      >
                        <Eye size={14} /> View Full Report
                      </button>
                      {r.status === 'Pending' && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontSize: 13, padding: '6px 14px' }}
                          onClick={() => navigate('/review')}
                        >
                          Review Report
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ECG Upload Modal */}
      {patient && (
        <ECGUploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          patient={{
            name: patient.patientName,
            email: patient.patientEmail,
            age: patient.patientAge,
            gender: patient.patientGender,
          }}
          onSuccess={() => {
            fetchReports();
            setUploadModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default PatientProfile;
