import { useState, useMemo } from 'react';
import {
  Users, Search, AlertTriangle, CheckCircle,
  ShieldAlert, Eye, RefreshCw, Activity, ClipboardList, UploadCloud,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth }    from '../context/AuthContext';
import { useReports } from '../context/ReportsContext';
import ECGUploadModal from '../components/ECGUploadModal';
import './Patients.css';

/* ── helpers ── */
const riskColor = (s) => ({ Critical:'#EF4444','High Risk':'#EF4444',Moderate:'#F59E0B',Normal:'#10B981' }[s] ?? '#6B7280');
const riskBg    = (s) => ({ Critical:'#FEE2E2','High Risk':'#FEE2E2',Moderate:'#FEF3C7',Normal:'#D1FAE5' }[s] ?? '#F3F4F6');

const RiskBadge = ({ status }) => (
  <span className="pat-badge" style={{ background: riskBg(status), color: riskColor(status) }}>
    {status || 'Pending'}
  </span>
);

const RiskBar = ({ score }) => {
  const color = score >= 61 ? '#EF4444' : score >= 31 ? '#F59E0B' : '#10B981';
  return (
    <div className="pat-riskbar">
      <div className="pat-riskbar-track">
        <div style={{ height:'100%', width:`${score ?? 0}%`, background: color, borderRadius:'4px' }} />
      </div>
      <span style={{ fontSize:'12px', fontWeight:'700', color, minWidth:'28px' }}>{score ?? '—'}</span>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════ */
const Patients = () => {
  const { user }    = useAuth();
  const { reports, fetchReports, loading, lastUpdated } = useReports();
  const navigate    = useNavigate();
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy]         = useState('latest');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  /* Build patient list from reports assigned to this cardiologist */
  const patients = useMemo(() => {
    const myReports = reports.filter(r =>
      r.cardiologistEmail === user?.email?.toLowerCase()
    );

    // Group by patient email
    const map = {};
    for (const r of myReports) {
      const key = r.patientEmail;
      if (!map[key]) {
        map[key] = {
          email:       r.patientEmail,
          name:        r.patientName,
          age:         r.patientAge,
          gender:      r.patientGender,
          patientId:   r.patientId || null,
          reports:     [],
          latestReport: null,
          riskScore:   null,
          status:      'Pending',
        };
      }
      map[key].reports.push(r);
    }

    // For each patient, find latest report
    return Object.values(map).map(p => {
      const sorted = [...p.reports].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      const latest = sorted[0];
      return {
        ...p,
        latestReport: latest,
        riskScore: latest?.analysis?.riskScore ?? null,
        status:    latest?.status ?? 'Pending',
        reportCount: p.reports.length,
        lastSeen:  latest?.createdAt,
        approvedCount: p.reports.filter(r => r.status === 'Approved').length,
        pendingCount:  p.reports.filter(r => !['Approved','Rejected'].includes(r.status)).length,
      };
    });
  }, [reports, user]);

  /* Filter + search + sort */
  const displayed = useMemo(() => {
    let list = patients;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.patientId && p.patientId.toLowerCase().includes(q))
      );
    }
    if (filterStatus !== 'All') {
      list = list.filter(p => {
        if (filterStatus === 'Critical')    return p.status === 'Critical';
        if (filterStatus === 'High Risk')   return p.status === 'High Risk';
        if (filterStatus === 'Moderate')    return p.status === 'Moderate';
        if (filterStatus === 'Normal')      return p.status === 'Normal';
        if (filterStatus === 'Pending')     return p.pendingCount > 0;
        return true;
      });
    }
    list = [...list].sort((a,b) => {
      if (sortBy === 'name')   return a.name.localeCompare(b.name);
      if (sortBy === 'risk')   return (b.riskScore ?? -1) - (a.riskScore ?? -1);
      return new Date(b.lastSeen) - new Date(a.lastSeen);
    });
    return list;
  }, [patients, search, filterStatus, sortBy]);

  /* Summary stats */
  const stats = useMemo(() => ({
    total:    patients.length,
    critical: patients.filter(p => p.status === 'Critical').length,
    highRisk: patients.filter(p => p.status === 'High Risk').length,
    normal:   patients.filter(p => p.status === 'Normal').length,
    pending:  patients.filter(p => p.pendingCount > 0).length,
  }), [patients]);

  const initials = (name='') => name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?';

  const openUploadModal = (patient) => {
    setSelectedPatient(patient);
    setUploadModalOpen(true);
  };

  return (
    <div className="patients-page">
      {/* Header */}
      <div className="page-title">
        <div>
          <h1>Patients Directory</h1>
          <p className="text-muted" style={{ fontSize:'14px', marginTop:'4px' }}>
            {patients.length} patient{patients.length!==1?'s':''} assigned to you
            {lastUpdated && (
              <span style={{ marginLeft:'12px', fontSize:'12px', color:'#10B981' }}>
                ● Live · updated {lastUpdated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}
              </span>
            )}
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={fetchReports} disabled={loading} style={{padding:'8px 14px'}}>
          <RefreshCw size={16} className={loading ? 'spinner' : ''} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="pat-stats">
        {[
          { label:'Total Patients',  value: stats.total,    icon:<Users size={20} color="#0A66C2"/>,       bg:'#EBF3FF' },
          { label:'Pending Review',  value: stats.pending,  icon:<Activity size={20} color="#F59E0B"/>,    bg:'#FEF3C7' },
          { label:'Critical / High', value: stats.critical+stats.highRisk, icon:<ShieldAlert size={20} color="#EF4444"/>, bg:'#FEE2E2' },
          { label:'Normal',          value: stats.normal,   icon:<CheckCircle size={20} color="#10B981"/>, bg:'#D1FAE5' },
        ].map((s,i) => (
          <div className="card pat-stat-card" key={i}>
            <div className="stat-icon" style={{ backgroundColor: s.bg }}>{s.icon}</div>
            <div className="stat-info"><h3>{s.value}</h3><p className="text-muted">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card pat-toolbar">
        <div className="pat-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by name, email or Patient ID (CS-P-00001)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="pat-filters">
          {['All','Pending','Critical','High Risk','Moderate','Normal'].map(f => (
            <button
              key={f}
              type="button"
              className={`pat-filter-btn ${filterStatus===f?'active':''}`}
              onClick={() => setFilterStatus(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <select className="pat-sort" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
          <option value="latest">Sort: Latest</option>
          <option value="risk">Sort: Risk Score</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* Patient Table */}
      {displayed.length === 0 ? (
        <div className="card" style={{ padding:'48px', textAlign:'center' }}>
          <Users size={48} color="#D1D5DB" style={{ marginBottom:'16px' }} />
          <h2 style={{ marginBottom:'8px' }}>
            {patients.length === 0 ? 'No Patients Yet' : 'No Matches Found'}
          </h2>
          <p style={{ color:'#6B7280' }}>
            {patients.length === 0
              ? 'Upload an ECG report to add patients to your directory.'
              : 'Try a different search term or filter.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow:'hidden' }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Patient</th>
                  <th>Age / Gender</th>
                  <th>Reports</th>
                  <th>Latest Risk</th>
                  <th>Status</th>
                  <th>Last ECG</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(p => (
                  <tr key={p.email}>
                    <td>
                      <span style={{
                        background: '#EBF3FF', color: '#0A66C2',
                        fontWeight: '700', fontSize: '12px',
                        padding: '4px 10px', borderRadius: '6px',
                        fontFamily: 'monospace', letterSpacing: '0.5px',
                        whiteSpace: 'nowrap',
                      }}>
                        {p.patientId || '—'}
                      </span>
                    </td>
                    <td>
                      <div className="pat-name-cell">
                        <div className="pat-avatar">{initials(p.name)}</div>
                        <div>
                          <p style={{ fontWeight:'600', fontSize:'14px', marginBottom:'1px' }}>{p.name}</p>
                          <p style={{ fontSize:'12px', color:'#9CA3AF' }}>{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">
                      {p.age ? `${p.age}y` : '—'} / {p.gender || '—'}
                    </td>
                    <td>
                      <span style={{ fontWeight:'700', color:'#0A66C2' }}>{p.reportCount}</span>
                      <span style={{ fontSize:'12px', color:'#9CA3AF', marginLeft:'4px' }}>total</span>
                    </td>
                    <td>
                      {p.riskScore != null
                        ? <RiskBar score={p.riskScore} />
                        : <span className="text-muted">—</span>
                      }
                    </td>
                    <td><RiskBadge status={p.status} /></td>
                    <td className="text-muted" style={{ fontSize:'13px' }}>
                      {p.lastSeen ? new Date(p.lastSeen).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      {p.pendingCount > 0 ? (
                        <span className="pat-pending-chip">
                          <AlertTriangle size={12}/> {p.pendingCount} pending
                        </span>
                      ) : (
                        <span style={{ fontSize:'12px', color:'#10B981' }}>✓ All reviewed</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding:'4px 10px', fontSize:'12px' }}
                          onClick={() => openUploadModal(p)}
                          title="Upload ECG for this patient"
                        >
                          <UploadCloud size={13}/> Upload
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding:'4px 10px', fontSize:'12px' }}
                          onClick={() => navigate(`/patients/${encodeURIComponent(p.email)}`)}
                        >
                          <ClipboardList size={13}/> History
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding:'4px 10px', fontSize:'12px' }}
                          onClick={() => navigate('/results', { state:{ reportId: p.latestReport?._id } })}
                        >
                          <Eye size={13}/> Results
                        </button>
                        {p.pendingCount > 0 && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding:'4px 10px', fontSize:'12px' }}
                            onClick={() => navigate('/review')}
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Patient detail cards (mobile-friendly cards) */}
      <div className="pat-cards-grid">
        {displayed.map(p => (
          <div key={p.email} className="card pat-card">
            <div className="pat-card-header">
              <div className="pat-avatar" style={{ width:'48px', height:'48px', fontSize:'16px' }}>{initials(p.name)}</div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:'700', fontSize:'15px', marginBottom:'2px' }}>{p.name}</p>
                <p style={{ fontSize:'12px', color:'#9CA3AF' }}>{p.email}</p>
              </div>
              <RiskBadge status={p.status} />
            </div>

            <div className="pat-card-metrics">
              <div><p className="pat-metric-label">Age</p><p className="pat-metric-val">{p.age ? `${p.age}y` : '—'}</p></div>
              <div><p className="pat-metric-label">Gender</p><p className="pat-metric-val">{p.gender || '—'}</p></div>
              <div><p className="pat-metric-label">Reports</p><p className="pat-metric-val" style={{ color:'#0A66C2' }}>{p.reportCount}</p></div>
              <div><p className="pat-metric-label">Risk</p><p className="pat-metric-val" style={{ color: riskColor(p.status) }}>{p.riskScore ?? '—'}/100</p></div>
            </div>

            {p.pendingCount > 0 && (
              <div className="pat-pending-chip" style={{ marginBottom:'12px', justifyContent:'center' }}>
                <AlertTriangle size={12}/> {p.pendingCount} report{p.pendingCount>1?'s':''} pending review
              </div>
            )}

            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex:1, fontSize:'13px', padding:'8px' }}
                onClick={() => openUploadModal(p)}
              >
                <UploadCloud size={14}/> Upload
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex:1, fontSize:'13px', padding:'8px' }}
                onClick={() => navigate(`/patients/${encodeURIComponent(p.email)}`)}
              >
                <ClipboardList size={14}/> History
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex:1, fontSize:'13px', padding:'8px' }}
                onClick={() => navigate('/results', { state:{ reportId: p.latestReport?._id } })}
              >
                <Eye size={14}/> Results
              </button>
              {p.pendingCount > 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex:1, fontSize:'13px', padding:'8px' }}
                  onClick={() => navigate('/review')}
                >
                  Review
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Patient history is now handled by dedicated PatientProfile page at /patients/:email */}

      {/* ECG Upload Modal */}
      {selectedPatient && (
        <ECGUploadModal
          isOpen={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            setSelectedPatient(null);
          }}
          patient={selectedPatient}
          onSuccess={() => {
            fetchReports();
          }}
        />
      )}
    </div>
  );
};

export default Patients;
