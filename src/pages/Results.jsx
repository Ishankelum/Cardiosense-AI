import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Download, Send, HeartPulse, ArrowLeft, Activity, ShieldAlert } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useReports } from '../context/ReportsContext';
import './Results.css';

const riskBand = (score) => {
  if (score >= 86) return { label: 'Critical', color: '#EF4444', bg: '#FEE2E2', icon: 'critical' };
  if (score >= 61) return { label: 'High Risk', color: '#F59E0B', bg: '#FEF3C7', icon: 'high' };
  if (score >= 31) return { label: 'Moderate', color: '#F59E0B', bg: '#FEF3C7', icon: 'moderate' };
  return { label: 'Normal', color: '#10B981', bg: '#D1FAE5', icon: 'normal' };
};

const statusClass = (status) => {
  if (!status) return 'normal';
  const s = status.toLowerCase();
  if (s === 'critical') return 'critical';
  if (s.includes('high')) return 'abnormal';
  if (s === 'moderate') return 'moderate';
  return 'normal';
};

const Results = () => {
  const { user } = useAuth();
  const { getReportsByCardiologist, getReportsByPatient } = useReports();
  const navigate = useNavigate();
  const location = useLocation();

  const userReports = user
    ? user.role === 'Cardiologist'
      ? getReportsByCardiologist(user.email)
      : getReportsByPatient(user.email)
    : [];

  // Select report from navigation state or default to first
  const [selectedId, setSelectedId] = useState(location.state?.reportId || null);

  useEffect(() => {
    if (!selectedId && userReports.length > 0) {
      setSelectedId(userReports[0]._id);
    }
  }, [userReports.length]);

  useEffect(() => {
    if (location.state?.reportId) setSelectedId(location.state.reportId);
  }, [location.state?.reportId]);

  const report = userReports.find((r) => r._id === selectedId) || userReports[0] || null;
  const analysis = report?.analysis || {};
  const conditions = analysis.conditions || [];
  const risk = riskBand(analysis.riskScore || 0);

  if (userReports.length === 0) {
    return (
      <div className="results-page">
        <div className="page-title"><h1>AI Analysis Results</h1></div>
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <Activity size={48} color="#D1D5DB" style={{ marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '12px' }}>No Reports Yet</h2>
          <p style={{ color: '#6B7280', marginBottom: '24px' }}>
            {user?.role === 'Patient'
              ? 'Your ECG reports will appear here once they are created by your cardiologist.'
              : 'No reports yet. Upload an ECG to get started.'}
          </p>
          {user?.role !== 'Patient' && (
            <Link to="/upload" className="btn btn-primary">Upload New ECG</Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="page-title">
        <div>
          <h1>AI Analysis Results</h1>
          {report && (
            <p className="text-muted" style={{ marginTop: '4px', fontSize: '14px' }}>
              {report.reportId} &nbsp;·&nbsp; Patient: {report.patientName}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {report && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/report', { state: { report } })}
            >
              <Download size={18} /> Download Report
            </button>
          )}
          {user?.role !== 'Patient' && report && (
            <Link to="/review" className="btn btn-primary">
              <Send size={18} /> Doctor Review
            </Link>
          )}
        </div>
      </div>

      <div className="results-layout">
        {/* Report list sidebar */}
        <div className="reports-list-panel">
          <div className="card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {userReports.length} Report{userReports.length !== 1 ? 's' : ''}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '70vh', overflowY: 'auto' }}>
              {userReports.map((r) => {
                const a = r.analysis || {};
                const rb = riskBand(a.riskScore || 0);
                return (
                  <div
                    key={r._id}
                    className={`report-list-item ${selectedId === r._id ? 'selected' : ''}`}
                    onClick={() => setSelectedId(r._id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: '600', fontSize: '13px', color: '#0A66C2' }}>{r.reportId}</span>
                      <span className="badge" style={{ backgroundColor: rb.bg, color: rb.color, fontSize: '11px' }}>
                        {r.status || 'Pending'}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{r.patientName}</p>
                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                      {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main analysis panel */}
        {report && (
          <div className="results-main">
            {/* ECG Waveform */}
            <div className="card waveform-card">
              <div className="card-header">
                <h2>ECG Waveform</h2>
                <div className="controls">
                  <span className="badge" style={{ backgroundColor: '#E5E7EB', color: '#374151' }}>Lead II</span>
                  <span className="badge" style={{ backgroundColor: '#E5E7EB', color: '#374151' }}>25 mm/s</span>
                  <span className="badge" style={{ backgroundColor: '#E5E7EB', color: '#374151' }}>10 mm/mV</span>
                </div>
              </div>
              <div className="waveform-display">
                <svg viewBox="0 0 800 200" className="ecg-line" style={{ width: '100%' }}>
                  {/* Animated ECG trace */}
                  <defs>
                    <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0A66C2" stopOpacity="0.2" />
                      <stop offset="50%" stopColor="#0A66C2" stopOpacity="1" />
                      <stop offset="100%" stopColor="#0A66C2" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,100 L50,100 L55,100 L60,80 L65,100 L80,100 L90,110 L105,20 L115,180 L125,100 L140,100 L150,100 L155,80 L160,100 L175,100 L185,110 L200,20 L210,180 L220,100 L235,100 L250,100 L255,80 L260,100 L275,100 L285,110 L300,20 L310,180 L320,100 L335,100 L350,100 L355,80 L360,100 L375,100 L385,110 L400,20 L410,180 L420,100 L435,100 L450,100 L455,80 L460,100 L475,100 L485,110 L500,20 L510,180 L520,100 L535,100 L550,100 L555,80 L560,100 L575,100 L585,110 L600,20 L610,180 L620,100 L635,100 L650,100 L655,80 L660,100 L675,100 L685,110 L700,20 L710,180 L720,100 L750,100 L800,100"
                    fill="none"
                    stroke="url(#ecgGrad)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="grid-overlay"></div>
              </div>
              <div className="metrics-row">
                <div className="metric">
                  <span className="metric-label">Heart Rate</span>
                  <span className="metric-value">{analysis.heartRate ? `${analysis.heartRate} bpm` : '—'}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Rhythm</span>
                  <span className="metric-value" style={{ fontSize: '12px' }}>{analysis.rhythmType || '—'}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">PR Interval</span>
                  <span className="metric-value">{analysis.prInterval ? `${analysis.prInterval} ms` : '—'}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">QRS Duration</span>
                  <span className="metric-value">{analysis.qrsDuration ? `${analysis.qrsDuration} ms` : '—'}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">QTc Interval</span>
                  <span className="metric-value">{analysis.qtcInterval ? `${analysis.qtcInterval} ms` : '—'}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">ST Deviation</span>
                  <span className="metric-value">{analysis.stDeviation != null ? `${analysis.stDeviation} mV` : '—'}</span>
                </div>
              </div>
            </div>

            {/* AI Summary + Risk Score */}
            <div className="results-bottom">
              {/* Diagnosis card */}
              <div className="card summary-card">
                <h2 style={{ marginBottom: '16px' }}>AI Diagnosis Summary</h2>

                <div className={`status-banner ${statusClass(analysis.status)}`}>
                  {analysis.riskScore < 31 ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
                  <div className="status-text">
                    <h3>{analysis.status || report.status || 'Pending'}</h3>
                    <p>AI Confidence: {analysis.confidence ? `${analysis.confidence}%` : report.confidence}</p>
                    {analysis.confidenceLabel && (
                      <p style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>{analysis.confidenceLabel}</p>
                    )}
                  </div>
                </div>

                {/* Analysis method badge */}
                {analysis.analysisMethod && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    marginTop: '12px', padding: '5px 12px', borderRadius: '100px',
                    background: analysis.analysisMethod.includes('Signal') ? '#D1FAE5' : '#EBF3FF',
                    border: `1px solid ${analysis.analysisMethod.includes('Signal') ? '#10B981' : '#93C5FD'}`,
                    fontSize: '12px', fontWeight: '600',
                    color: analysis.analysisMethod.includes('Signal') ? '#065F46' : '#1e40af',
                  }}>
                    <Activity size={13} />
                    {analysis.analysisMethod}
                    {analysis.samplingRate && (
                      <span style={{ fontWeight: '400', opacity: 0.8 }}>
                        &nbsp;· {analysis.samplingRate} Hz · {analysis.signalSamples?.toLocaleString()} samples
                      </span>
                    )}
                  </div>
                )}

                {/* Risk score bar */}
                {analysis.riskScore != null && (
                  <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Cardiac Risk Score</span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: risk.color }}>{analysis.riskScore}/100</span>
                    </div>
                    <div style={{ height: '10px', borderRadius: '6px', background: '#E5E7EB', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${analysis.riskScore}%`, background: risk.color, borderRadius: '6px', transition: 'width 1s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#9CA3AF' }}>
                      <span>Low (0–30)</span><span>Moderate (31–60)</span><span>High (61–85)</span><span>Critical (86+)</span>
                    </div>
                  </div>
                )}

                {/* Triage */}
                {analysis.triage && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: risk.bg, marginBottom: '16px' }}>
                    <ShieldAlert size={18} color={risk.color} />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: risk.color }}>
                      Triage Priority: {analysis.triage}
                    </span>
                  </div>
                )}

                {/* Detected conditions */}
                <div className="conditions-list">
                  <h4 style={{ marginBottom: '12px', fontSize: '13px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Detected Conditions
                  </h4>
                  {conditions.length > 0 ? conditions.map((cond, idx) => (
                    <div className="condition-item" key={idx}>
                      <HeartPulse size={16} color={cond.severity === 'High' ? '#EF4444' : cond.severity === 'Moderate' ? '#F59E0B' : '#10B981'} />
                      <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>{cond.name}</span>
                      <span className={`badge badge-${cond.severity === 'High' ? 'danger' : cond.severity === 'Moderate' ? 'warning' : 'success'}`}>
                        {cond.severity}
                      </span>
                      {cond.confidence && (
                        <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: '8px' }}>{cond.confidence}%</span>
                      )}
                    </div>
                  )) : (
                    <p style={{ fontSize: '14px', color: '#6B7280' }}>No significant conditions detected</p>
                  )}
                </div>

                {analysis.recommendation && (
                  <div style={{ marginTop: '20px', padding: '14px', background: '#F9FAFB', borderRadius: '8px', borderLeft: `3px solid ${risk.color}` }}>
                    <h4 style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                      AI Recommendation
                    </h4>
                    <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#374151' }}>{analysis.recommendation}</p>
                  </div>
                )}
              </div>

              {/* Patient info card */}
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ marginBottom: '16px' }}>Patient Details</h3>
                <table style={{ width: '100%', fontSize: '14px' }}>
                  <tbody>
                    {[
                      ['Name', report.patientName],
                      ['Email', report.patientEmail],
                      ['Age', report.patientAge ? `${report.patientAge} yrs` : '—'],
                      ['Gender', report.patientGender || '—'],
                      ['Symptoms', report.symptoms || '—'],
                      ['Cardiologist', report.cardiologistName],
                      ['Report Date', new Date(report.createdAt).toLocaleString()],
                    ].map(([label, value]) => (
                      <tr key={label} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '8px 0', color: '#6B7280', width: '120px' }}>{label}</td>
                        <td style={{ padding: '8px 0', fontWeight: '500', color: '#1F2937' }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
