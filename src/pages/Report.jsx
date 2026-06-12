import { Printer, Download, ArrowLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useReports } from '../context/ReportsContext';
import './Report.css';

const Report = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { reports } = useReports();

  // Get report from navigation state, or fall back to most recent
  const report = location.state?.report || reports[0] || null;
  const analysis = report?.analysis || {};
  const conditions = analysis.conditions || [];

  const statusClass = () => {
    const s = (analysis.status || '').toLowerCase();
    if (s === 'critical' || s.includes('high')) return 'critical';
    if (s === 'moderate') return 'moderate';
    if (s === 'normal') return 'normal';
    return 'abnormal';
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';

  if (!report) {
    return (
      <div className="report-page">
        <div className="page-title no-print">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/results')}>
            <ArrowLeft size={18} /> Back to Results
          </button>
        </div>
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <p>No report selected. Please go to Results and choose a report to view.</p>
          <Link to="/results" className="btn btn-primary" style={{ marginTop: '16px' }}>Go to Results</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <div className="page-title no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1>Final Medical Report</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" className="btn btn-outline" onClick={() => window.print()}>
            <Printer size={18} /> Print
          </button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <Download size={18} /> Save as PDF
          </button>
        </div>
      </div>

      <div className="report-document printable-area">
        {/* Header */}
        <div className="report-header">
          <div className="hospital-info">
            <h2 style={{ color: '#0A66C2', marginBottom: '4px' }}>CardioSense AI Diagnostic Platform</h2>
            <p className="text-muted" style={{ fontSize: '12px' }}>AI-Powered ECG Analysis &amp; Cardiac Risk Assessment</p>
            <p className="text-muted" style={{ fontSize: '12px' }}>Supervisor: Ms. Nilusha Weerasekara</p>
          </div>
          <div className="report-meta">
            <p><strong>Report ID:</strong> {report.reportId}</p>
            <p><strong>Date:</strong> {formatDate(report.createdAt)}</p>
            <p><strong>Time:</strong> {formatTime(report.createdAt)}</p>
            <p><strong>File:</strong> {report.fileName || '—'}</p>
          </div>
        </div>

        <div className="divider"></div>

        {/* Patient info */}
        <div className="patient-section">
          <h3 className="section-title">PATIENT INFORMATION</h3>
          <div className="info-grid">
            <div className="info-item"><span className="label">Name:</span><span className="value">{report.patientName}</span></div>
            <div className="info-item"><span className="label">Report ID:</span><span className="value">{report.reportId}</span></div>
            <div className="info-item"><span className="label">Age:</span><span className="value">{report.patientAge ? `${report.patientAge} years` : '—'}</span></div>
            <div className="info-item"><span className="label">Gender:</span><span className="value">{report.patientGender ? report.patientGender.charAt(0).toUpperCase() + report.patientGender.slice(1) : '—'}</span></div>
            <div className="info-item"><span className="label">Email:</span><span className="value">{report.patientEmail}</span></div>
            <div className="info-item"><span className="label">Cardiologist:</span><span className="value">{report.cardiologistName}</span></div>
            <div className="info-item" style={{ gridColumn: 'span 2' }}>
              <span className="label">Presenting Symptoms:</span>
              <span className="value">{report.symptoms || 'Not specified'}</span>
            </div>
            {report.notes && (
              <div className="info-item" style={{ gridColumn: 'span 2' }}>
                <span className="label">Clinical Notes:</span>
                <span className="value">{report.notes}</span>
              </div>
            )}
          </div>
        </div>

        <div className="divider"></div>

        {/* ECG tracing */}
        <div className="ecg-section">
          <h3 className="section-title">ECG TRACING (Lead II — Representative)</h3>
          <div className="report-waveform">
            <svg viewBox="0 0 800 120" className="ecg-line">
              <path
                d="M0,60 L45,60 L50,60 L55,40 L60,60 L75,60 L85,72 L100,10 L110,110 L120,60 L135,60 L150,60 L155,40 L160,60 L175,60 L185,72 L200,10 L210,110 L220,60 L235,60 L250,60 L255,40 L260,60 L275,60 L285,72 L300,10 L310,110 L320,60 L335,60 L350,60 L355,40 L360,60 L375,60 L385,72 L400,10 L410,110 L420,60 L435,60 L450,60 L455,40 L460,60 L475,60 L485,72 L500,10 L510,110 L520,60 L535,60 L550,60 L555,40 L560,60 L575,60 L585,72 L600,10 L610,110 L620,60 L650,60 L800,60"
                fill="none"
                stroke="#1F2937"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <div className="grid-overlay"></div>
          </div>
          <div className="metrics-simple">
            <span>HR: {analysis.heartRate ? `${analysis.heartRate} bpm` : '—'}</span>
            <span>PR: {analysis.prInterval ? `${analysis.prInterval} ms` : '—'}</span>
            <span>QRS: {analysis.qrsDuration ? `${analysis.qrsDuration} ms` : '—'}</span>
            <span>QTc: {analysis.qtcInterval ? `${analysis.qtcInterval} ms` : '—'}</span>
            <span>ST: {analysis.stDeviation != null ? `${analysis.stDeviation} mV` : '—'}</span>
            <span>Rhythm: {analysis.rhythmType || '—'}</span>
          </div>
        </div>

        <div className="divider"></div>

        {/* AI findings */}
        <div className="findings-section">
          <h3 className="section-title">AI ANALYSIS FINDINGS</h3>
          <div className={`findings-box ${statusClass()}`}>
            <h4>
              PRIMARY IMPRESSION:{' '}
              {analysis.status ? analysis.status.toUpperCase() : report.status?.toUpperCase() || 'PENDING REVIEW'}
            </h4>
            <p><strong>AI Risk Score:</strong> {analysis.riskScore != null ? `${analysis.riskScore}/100` : '—'}</p>
            <p><strong>Confidence Level:</strong> {analysis.confidence ? `${analysis.confidence}%` : report.confidence || '—'} &nbsp;·&nbsp; {analysis.confidenceTier || ''}</p>
            <p><strong>Triage Priority:</strong> {analysis.triage || '—'}</p>

            {conditions.length > 0 && (
              <>
                <p style={{ marginTop: '12px' }}><strong>Detected Conditions:</strong></p>
                <ul style={{ marginLeft: '16px', marginTop: '6px' }}>
                  {conditions.map((c, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>
                      {c.name} — <em>{c.severity} severity</em>
                      {c.confidence ? ` (${c.confidence}% confidence)` : ''}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {analysis.recommendation && (
              <p style={{ marginTop: '12px' }}><strong>AI Recommendation:</strong> {analysis.recommendation}</p>
            )}
          </div>
        </div>

        <div className="divider"></div>

        {/* Clinician assessment */}
        <div className="doctor-section">
          <h3 className="section-title">CLINICIAN ASSESSMENT &amp; PLAN</h3>
          {report.doctorAssessment || report.doctorNotes ? (
            <p className="doctor-notes">
              {report.doctorAssessment || report.doctorNotes}
            </p>
          ) : (
            <p className="doctor-notes" style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
              Awaiting cardiologist review and finalization.
            </p>
          )}

          <div className="signature-area">
            <div className="signature-line">
              {report.cardiologistName && (
                <span className="cursive-font" style={{ fontSize: '22px', fontFamily: 'Georgia, serif', color: '#0A66C2' }}>
                  {report.cardiologistName}
                </span>
              )}
              <div className="sig-border"></div>
              <p>{report.cardiologistName}</p>
              <p className="text-muted">Attending Cardiologist</p>
            </div>
            <div className="date-line">
              <span style={{ fontSize: '14px' }}>
                {report.finalizedAt ? formatDate(report.finalizedAt) + ' ' + formatTime(report.finalizedAt) : 'Pending'}
              </span>
              <div className="sig-border"></div>
              <p>Date &amp; Time Finalized</p>
            </div>
          </div>
        </div>

        <div className="divider"></div>
        <p style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center', lineHeight: '1.6' }}>
          <strong>DISCLAIMER:</strong> CardioSense AI is intended as a health monitoring and informational tool only.
          It is NOT a substitute for professional medical advice, diagnosis, or treatment.
          Always consult a qualified healthcare provider for any cardiac-related concerns.
        </p>
      </div>
    </div>
  );
};

export default Report;
