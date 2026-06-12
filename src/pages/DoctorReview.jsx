import { useState, useEffect } from 'react';
import { Search, Check, X, User, ShieldAlert, HeartPulse } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useReports } from '../context/ReportsContext';
import './DoctorReview.css';

const DoctorReview = () => {
  const { user } = useAuth();
  const { reports, updateReport } = useReports();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Filter: pending reports assigned to this cardiologist
  const pendingReports = reports.filter(
    (r) =>
      r.cardiologistEmail === user?.email?.toLowerCase() &&
      r.status !== 'Approved' &&
      r.status !== 'Rejected',
  ).filter((r) =>
    !search || r.patientName.toLowerCase().includes(search.toLowerCase()) || r.reportId.toLowerCase().includes(search.toLowerCase()),
  );

  const current = pendingReports[selectedIdx] || null;
  const analysis = current?.analysis || {};
  const conditions = analysis.conditions || [];

  useEffect(() => {
    setDoctorNotes(current?.doctorNotes || '');
    setFeedback({ type: '', message: '' });
  }, [selectedIdx, current?._id]);

  const handleAction = async (action) => {
    if (!current) return;
    setIsSaving(true);
    setFeedback({ type: '', message: '' });

    const statusMap = { approve: 'Approved', reject: 'Rejected', draft: 'Draft' };
    try {
      await updateReport(current._id, {
        status: statusMap[action],
        doctorNotes,
        doctorAssessment: action !== 'draft' ? doctorNotes : current.doctorAssessment,
      });
      setFeedback({
        type: 'success',
        message: action === 'draft' ? 'Draft saved.' : `Report ${statusMap[action].toLowerCase()} and finalized.`,
      });
      if (action !== 'draft') {
        setTimeout(() => setSelectedIdx(0), 1200);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Action failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  const riskColor = (score) => {
    if (score >= 86) return '#EF4444';
    if (score >= 61) return '#F59E0B';
    if (score >= 31) return '#F59E0B';
    return '#10B981';
  };

  if (!user || user.role !== 'Cardiologist') {
    return (
      <div className="review-page">
        <div className="page-title"><h1>Doctor Review Dashboard</h1></div>
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <p>This section is only accessible to Cardiologists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="review-page">
      <div className="page-title">
        <h1>Doctor Review Dashboard</h1>
        <span style={{ fontSize: '14px', color: '#6B7280' }}>
          {pendingReports.length} pending review{pendingReports.length !== 1 ? 's' : ''}
        </span>
      </div>

      {pendingReports.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <Check size={48} color="#10B981" style={{ marginBottom: '16px' }} />
          <h2>All caught up!</h2>
          <p style={{ color: '#6B7280', marginTop: '8px' }}>No pending ECG reports require your review.</p>
        </div>
      ) : (
        <div className="review-container">
          {/* Patient List */}
          <div className="card patient-list-card">
            <div className="search-box" style={{ marginBottom: '12px' }}>
              <Search size={16} />
              <input
                type="text"
                placeholder="Search patients..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedIdx(0); }}
              />
            </div>
            <div className="patients-list">
              {pendingReports.map((p, idx) => {
                const a = p.analysis || {};
                return (
                  <div
                    key={p._id}
                    className={`patient-list-item ${selectedIdx === idx ? 'selected' : ''}`}
                    onClick={() => setSelectedIdx(idx)}
                  >
                    <div className="patient-avatar"><User size={20} color="#0A66C2" /></div>
                    <div className="patient-info-list">
                      <h4>{p.patientName}</h4>
                      <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
                        {p.reportId} · {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {a.riskScore >= 61 && <span className="dot-indicator danger" title="High Risk" />}
                    {a.riskScore >= 31 && a.riskScore < 61 && <span className="dot-indicator warning" title="Moderate" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review Panel */}
          {current && (
            <div className="review-main-panel">
              <div className="card review-details-card">
                {/* Header */}
                <div className="detail-header">
                  <div className="patient-summary">
                    <h2>{current.patientName}</h2>
                    <p className="text-muted" style={{ fontSize: '13px' }}>
                      {current.patientAge ? `${current.patientAge} yrs` : ''}&nbsp;
                      {current.patientGender ? `· ${current.patientGender}` : ''}&nbsp;
                      · {current.reportId}
                    </p>
                    {current.symptoms && (
                      <p style={{ fontSize: '13px', color: '#374151', marginTop: '4px' }}>
                        <strong>Symptoms:</strong> {current.symptoms}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: analysis.riskScore >= 61 ? '#FEE2E2' : '#FEF3C7',
                        color: riskColor(analysis.riskScore || 0),
                        fontSize: '13px',
                        padding: '6px 12px',
                      }}
                    >
                      Risk Score: {analysis.riskScore ?? '—'}/100
                    </span>
                    <span className="badge badge-warning" style={{ fontSize: '12px' }}>
                      Confidence: {analysis.confidence ? `${analysis.confidence}%` : current.confidence}
                    </span>
                  </div>
                </div>

                {/* Mini waveform */}
                <div className="mini-waveform">
                  <svg viewBox="0 0 800 150" className="ecg-line">
                    <path
                      d="M0,75 L45,75 L50,75 L55,55 L60,75 L75,75 L85,88 L100,10 L110,140 L120,75 L135,75 L150,75 L155,55 L160,75 L175,75 L185,88 L200,10 L210,140 L220,75 L235,75 L250,75 L255,55 L260,75 L275,75 L285,88 L300,10 L310,140 L320,75 L350,75 L360,75"
                      fill="none"
                      stroke="#0A66C2"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="grid-overlay"></div>
                </div>

                {/* AI Analysis Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', margin: '16px 0' }}>
                  {[
                    ['Heart Rate', analysis.heartRate ? `${analysis.heartRate} bpm` : '—'],
                    ['Rhythm', analysis.rhythmType || '—'],
                    ['PR Interval', analysis.prInterval ? `${analysis.prInterval} ms` : '—'],
                    ['QRS Duration', analysis.qrsDuration ? `${analysis.qrsDuration} ms` : '—'],
                    ['QTc', analysis.qtcInterval ? `${analysis.qtcInterval} ms` : '—'],
                    ['ST Deviation', analysis.stDeviation != null ? `${analysis.stDeviation} mV` : '—'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background: '#F9FAFB', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#1F2937', marginTop: '2px' }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Detected conditions */}
                {conditions.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '13px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                      AI Detected Conditions
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {conditions.map((c, i) => (
                        <span
                          key={i}
                          className={`badge badge-${c.severity === 'High' ? 'danger' : c.severity === 'Moderate' ? 'warning' : 'success'}`}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <HeartPulse size={12} />
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI recommendation */}
                {analysis.recommendation && (
                  <div style={{ padding: '12px 16px', background: '#F9FAFB', borderRadius: '8px', borderLeft: `3px solid ${riskColor(analysis.riskScore)}`, marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <ShieldAlert size={16} color={riskColor(analysis.riskScore)} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>{analysis.recommendation}</p>
                    </div>
                  </div>
                )}

                {/* Doctor notes */}
                <div className="doctor-notes-section">
                  <h3>Clinician Assessment &amp; Plan</h3>
                  <textarea
                    className="input-field"
                    placeholder="Enter your clinical notes, final diagnosis, treatment plan, and recommendations..."
                    style={{ minHeight: '160px', marginTop: '12px' }}
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                  />
                </div>

                {feedback.message && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      marginTop: '12px',
                      background: feedback.type === 'success' ? '#D1FAE5' : '#FEE2E2',
                      color: feedback.type === 'success' ? '#065F46' : '#991B1B',
                      fontSize: '14px',
                    }}
                  >
                    {feedback.message}
                  </div>
                )}

                {/* Actions */}
                <div className="review-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ borderColor: '#EF4444', color: '#EF4444' }}
                    disabled={isSaving}
                    onClick={() => handleAction('reject')}
                  >
                    <X size={18} /> Reject AI Finding
                  </button>
                  <div style={{ flex: 1 }} />
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={isSaving}
                    onClick={() => handleAction('draft')}
                  >
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={isSaving}
                    onClick={() => handleAction('approve')}
                  >
                    <Check size={18} /> Approve &amp; Finalize
                  </button>
                </div>

                {/* View full report link */}
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '13px', padding: '6px 16px' }}
                    onClick={() => navigate('/report', { state: { report: current } })}
                  >
                    View Printable Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorReview;
