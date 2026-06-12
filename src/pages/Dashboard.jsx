import { useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle, ArrowRight,
  Upload, ClipboardList, Users, HeartPulse,
  TrendingUp, Clock, ShieldAlert, RefreshCw, Wifi,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth }    from '../context/AuthContext';
import { useReports } from '../context/ReportsContext';
import PatientECGUploadModal from '../components/PatientECGUploadModal';
import './Dashboard.css';

/* ─── shared helpers ─── */
const riskColor = (s) => ({ Critical:'#EF4444','High Risk':'#EF4444',Moderate:'#F59E0B',Normal:'#10B981' }[s] ?? '#6B7280');
const riskBg    = (s) => ({ Critical:'#FEE2E2','High Risk':'#FEE2E2',Moderate:'#FEF3C7',Normal:'#D1FAE5' }[s] ?? '#F3F4F6');

const StatusBadge = ({ status }) => (
  <span className="badge" style={{ background: riskBg(status), color: riskColor(status), fontSize:'12px' }}>
    {status || 'Pending'}
  </span>
);

const RiskBar = ({ score }) => {
  const color = score >= 61 ? '#EF4444' : score >= 31 ? '#F59E0B' : '#10B981';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
      <div style={{ width:'60px', height:'6px', borderRadius:'4px', background:'#E5E7EB', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${score}%`, background: color, borderRadius:'4px' }} />
      </div>
      <span style={{ fontSize:'12px', fontWeight:'700', color }}>{score}</span>
    </div>
  );
};

const LiveBadge = ({ lastUpdated }) => (
  lastUpdated ? (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', fontSize:'12px', color:'#10B981', marginLeft:'12px' }}>
      <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#10B981', display:'inline-block', animation:'pulse 2s infinite' }}/>
      Live · {lastUpdated.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
    </span>
  ) : null
);

/* ─── SVG Donut Chart ─── */
const DonutChart = ({ data }) => {
  const total = data.reduce((s,d) => s+d.value, 0) || 1;
  let offset = 0;
  const R = 54; const C = 2*Math.PI*R;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'20px', flexWrap:'wrap' }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={R} fill="none" stroke="#E5E7EB" strokeWidth="18"/>
        {data.map((d,i) => {
          const dash  = (d.value/total)*C;
          const gap   = C - dash;
          const start = offset;
          offset += dash;
          return (
            <circle key={i} cx="65" cy="65" r={R} fill="none"
              stroke={d.color} strokeWidth="18"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={C/4 - start}
              style={{ transition:'stroke-dasharray 0.8s ease' }}
            />
          );
        })}
        <text x="65" y="62" textAnchor="middle" fontSize="22" fontWeight="800" fill="#1F2937">{total}</text>
        <text x="65" y="78" textAnchor="middle" fontSize="11" fill="#9CA3AF">Total</text>
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
        {data.map((d,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'13px' }}>
            <span style={{ width:'10px', height:'10px', borderRadius:'2px', background:d.color, flexShrink:0 }}/>
            <span style={{ color:'#6B7280' }}>{d.label}</span>
            <span style={{ fontWeight:'700', color:'#1F2937', marginLeft:'auto' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── SVG Bar Chart (monthly trend) ─── */
const BarChart = ({ data }) => {
  const max = Math.max(...data.map(d=>d.value), 1);
  const H = 90; const W = 280;
  const barW = 28; const gap = (W - data.length*barW) / (data.length+1);
  return (
    <svg viewBox={`0 0 ${W} ${H+28}`} style={{ width:'100%', maxWidth:'320px' }}>
      {data.map((d,i) => {
        const bh  = (d.value/max)*H;
        const x   = gap + i*(barW+gap);
        const y   = H - bh;
        const color = d.value===max ? '#0A66C2' : '#BAD4F5';
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx="4" fill={color}
              style={{ transition:'height 0.8s ease, y 0.8s ease' }}/>
            <text x={x+barW/2} y={H+14} textAnchor="middle" fontSize="10" fill="#9CA3AF">{d.label}</text>
            {d.value>0 && (
              <text x={x+barW/2} y={y-4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#374151">{d.value}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

/* ─── build monthly data (last 6 months) ─── */
const buildMonthly = (reports) => {
  const months = [];
  for (let i=5; i>=0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth()-i);
    months.push({ label: d.toLocaleString('default',{month:'short'}), year: d.getFullYear(), month: d.getMonth(), value:0 });
  }
  for (const r of reports) {
    const d = new Date(r.createdAt);
    const m = months.find(x => x.year===d.getFullYear() && x.month===d.getMonth());
    if (m) m.value++;
  }
  return months;
};

/* ══════════════════════════ CARDIOLOGIST DASHBOARD ══════════════════════════ */
const CardiologistDashboard = ({ user, reports, fetchReports, loading, navigate, lastUpdated }) => {
  const pending  = reports.filter(r => !['Approved','Rejected'].includes(r.status));
  const critical = reports.filter(r => (r.analysis?.riskScore??0) >= 86);
  const highRisk = reports.filter(r => { const s=r.analysis?.riskScore??0; return s>=61&&s<86; });
  const moderate = reports.filter(r => { const s=r.analysis?.riskScore??0; return s>=31&&s<61; });
  const normal   = reports.filter(r => (r.analysis?.riskScore??0) < 31 || r.status==='Normal');
  const recent   = [...reports].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,6);
  const monthly  = buildMonthly(reports);

  // Unique patients
  const uniquePatients = new Set(reports.map(r=>r.patientEmail)).size;

  const stats = [
    { label:'Total ECGs',      value: reports.length,  icon:<Activity size={22} color="#0A66C2"/>,    bg:'#EBF3FF' },
    { label:'Patients',        value: uniquePatients,  icon:<Users size={22} color="#8B5CF6"/>,       bg:'#EDE9FE' },
    { label:'Pending Review',  value: pending.length,  icon:<Clock size={22} color="#F59E0B"/>,       bg:'#FEF3C7' },
    { label:'Critical / High', value: critical.length+highRisk.length, icon:<ShieldAlert size={22} color="#EF4444"/>, bg:'#FEE2E2' },
  ];

  const donutData = [
    { label:'Critical',  value: critical.length,  color:'#EF4444' },
    { label:'High Risk', value: highRisk.length,  color:'#F97316' },
    { label:'Moderate',  value: moderate.length,  color:'#F59E0B' },
    { label:'Normal',    value: normal.length,    color:'#10B981' },
  ].filter(d=>d.value>0);

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="page-title">
        <div>
          <h1>Cardiologist Dashboard</h1>
          <p className="text-muted" style={{ marginTop:'4px', fontSize:'14px' }}>
            Welcome back, Dr. {user.name}.
            {' '}<strong style={{ color: pending.length ? '#F59E0B':'#10B981' }}>
              {pending.length} report{pending.length!==1?'s':''} pending review
            </strong>
            <LiveBadge lastUpdated={lastUpdated}/>
          </p>
        </div>
        <div style={{ display:'flex', gap:'12px' }}>
          <button type="button" className="btn btn-outline" onClick={fetchReports} disabled={loading} style={{ padding:'8px 14px' }}>
            <RefreshCw size={16} className={loading?'spinner':''}/> Refresh
          </button>
          <Link to="/upload" className="btn btn-primary">
            <Upload size={18}/> Upload New ECG
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((s,i) => (
          <div className="card stat-card" key={i}>
            <div className="stat-icon" style={{ backgroundColor:s.bg }}>{s.icon}</div>
            <div className="stat-info"><h3>{s.value}</h3><p className="text-muted">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Analytics Row */}
      <div className="dash-two-col">
        {/* Risk Distribution Donut */}
        <div className="card">
          <div className="card-header">
            <h2>Risk Distribution</h2>
            <span style={{ fontSize:'12px', color:'#9CA3AF' }}>{reports.length} total ECGs</span>
          </div>
          {reports.length === 0 ? (
            <div className="empty-state"><Activity size={36} color="#D1D5DB"/><p>No data yet</p></div>
          ) : (
            <DonutChart data={donutData}/>
          )}
        </div>

        {/* Monthly Uploads Bar */}
        <div className="card">
          <div className="card-header">
            <h2>Monthly ECG Uploads</h2>
            <span style={{ fontSize:'12px', color:'#9CA3AF' }}>Last 6 months</span>
          </div>
          {reports.length === 0 ? (
            <div className="empty-state"><TrendingUp size={36} color="#D1D5DB"/><p>No uploads yet</p></div>
          ) : (
            <BarChart data={monthly}/>
          )}
        </div>
      </div>

      {/* Pending + Quick Actions */}
      <div className="dash-two-col" style={{ marginTop:'24px' }}>
        {/* Pending Reviews */}
        <div className="card">
          <div className="card-header">
            <h2><ClipboardList size={18} style={{ marginRight:'8px', verticalAlign:'middle' }}/>Pending Reviews</h2>
            <Link to="/review" className="btn btn-outline" style={{ padding:'5px 12px', fontSize:'12px' }}>
              Open Review <ArrowRight size={13}/>
            </Link>
          </div>
          {pending.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={36} color="#10B981"/>
              <p>All caught up! No pending reviews.</p>
            </div>
          ) : (
            pending.slice(0,5).map(r => {
              const score = r.analysis?.riskScore ?? null;
              return (
                <div key={r._id} className="pending-row" onClick={()=>navigate('/review')}>
                  <div className="pending-avatar" style={{ background:riskBg(r.status) }}>
                    <HeartPulse size={16} color={riskColor(r.status)}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:'600', fontSize:'14px', marginBottom:'2px' }}>{r.patientName}</p>
                    <p style={{ fontSize:'12px', color:'#9CA3AF' }}>
                      {r.reportId} · {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {score!=null ? <RiskBar score={score}/> : <StatusBadge status={r.status}/>}
                </div>
              );
            })
          )}
          {pending.length>5 && (
            <p style={{ textAlign:'center', fontSize:'12px', color:'#9CA3AF', marginTop:'8px' }}>
              +{pending.length-5} more
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header"><h2>Quick Actions</h2></div>
          <div className="quick-actions-grid">
            {[
              { icon:<Upload size={24} color="#0A66C2"/>,        bg:'#EBF3FF', label:'Upload ECG',      sub:'Analyze new patient ECG',       path:'/upload' },
              { icon:<ClipboardList size={24} color="#F59E0B"/>, bg:'#FEF3C7', label:'Review Pending', sub:`${pending.length} awaiting you`, path:'/review' },
              { icon:<Activity size={24} color="#10B981"/>,      bg:'#D1FAE5', label:'All Results',     sub:'Browse analyzed reports',        path:'/results' },
              { icon:<Users size={24} color="#8B5CF6"/>,         bg:'#EDE9FE', label:'Patients',        sub:`${uniquePatients} patients`,      path:'/patients' },
            ].map((a,i) => (
              <Link key={i} to={a.path} className="quick-action-card">
                <div style={{ width:'48px', height:'48px', borderRadius:'12px', background:a.bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'12px' }}>
                  {a.icon}
                </div>
                <p style={{ fontWeight:'600', fontSize:'14px', marginBottom:'2px' }}>{a.label}</p>
                <p style={{ fontSize:'12px', color:'#9CA3AF' }}>{a.sub}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Uploads Table */}
      <div className="card mt-8">
        <div className="card-header">
          <h2>Recent ECG Uploads</h2>
          <Link to="/results" className="btn btn-outline" style={{ padding:'5px 12px', fontSize:'12px' }}>
            View All <ArrowRight size={13}/>
          </Link>
        </div>
        {recent.length===0 ? (
          <div className="empty-state">
            <Activity size={36} color="#D1D5DB"/>
            <p>No ECG uploads yet. <Link to="/upload" style={{ color:'#0A66C2' }}>Upload the first one →</Link></p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Report ID</th><th>Patient</th><th>Age/Gender</th>
                  <th>Date</th><th>Risk Score</th><th>Status</th><th>Confidence</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r._id}>
                    <td style={{ fontWeight:'600', color:'#0A66C2' }}>{r.reportId}</td>
                    <td style={{ fontWeight:'500' }}>{r.patientName}</td>
                    <td className="text-muted">{r.patientAge?`${r.patientAge}y`:'—'} / {r.patientGender||'—'}</td>
                    <td className="text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>{r.analysis?.riskScore!=null ? <RiskBar score={r.analysis.riskScore}/> : '—'}</td>
                    <td><StatusBadge status={r.status}/></td>
                    <td style={{ fontSize:'13px' }}>{r.analysis?.confidence ? `${r.analysis.confidence}%` : '—'}</td>
                    <td>
                      <button type="button" className="btn btn-outline"
                        style={{ padding:'4px 12px', fontSize:'12px' }}
                        onClick={()=>navigate('/results',{state:{reportId:r._id}})}>
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════ PATIENT DASHBOARD ══════════════════════════ */
const PatientDashboard = ({ user, reports, fetchReports, loading, navigate, lastUpdated }) => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const myReports  = [...reports].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const latest     = myReports[0] || null;
  const la         = latest?.analysis || {};

  const riskScore  = la.riskScore ?? null;
  const riskStatus = la.status ?? latest?.status ?? null;
  const arcColor   = riskColor(riskStatus);

  const stats = [
    { label:'Total Reports',  value: myReports.length,                                                icon:<Activity size={22} color="#0A66C2"/>,    bg:'#EBF3FF' },
    { label:'Normal',         value: myReports.filter(r=>r.status==='Normal').length,                icon:<CheckCircle size={22} color="#10B981"/>, bg:'#D1FAE5' },
    { label:'Need Attention', value: myReports.filter(r=>['Moderate','High Risk'].includes(r.status)).length, icon:<AlertTriangle size={22} color="#F59E0B"/>, bg:'#FEF3C7' },
    { label:'Critical',       value: myReports.filter(r=>r.status==='Critical').length,              icon:<ShieldAlert size={22} color="#EF4444"/>,  bg:'#FEE2E2' },
  ];

  /* Build risk trend from last 6 reports */
  const trend = myReports.slice(0,6).reverse();
  const trendMax = Math.max(...trend.map(r=>r.analysis?.riskScore??0), 100);

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="page-title">
        <div>
          <h1>My Health Dashboard</h1>
          <p className="text-muted" style={{ marginTop:'4px', fontSize:'14px' }}>
            Welcome back, {user.name}.
            <LiveBadge lastUpdated={lastUpdated}/>
          </p>
        </div>
        <div style={{ display:'flex', gap:'12px' }}>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => setUploadModalOpen(true)}
            style={{ display:'flex', alignItems:'center', gap:'6px' }}
          >
            <Upload size={16}/> Upload ECG
          </button>
          <button type="button" className="btn btn-outline" onClick={fetchReports} disabled={loading} style={{ padding:'8px 14px' }}>
            <RefreshCw size={16} className={loading?'spinner':''}/> Refresh
          </button>
          <Link to="/chat" className="btn btn-primary">
            <HeartPulse size={18}/> Ask AI Assistant
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((s,i) => (
          <div className="card stat-card" key={i}>
            <div className="stat-icon" style={{ backgroundColor:s.bg }}>{s.icon}</div>
            <div className="stat-info"><h3>{s.value}</h3><p className="text-muted">{s.label}</p></div>
          </div>
        ))}
      </div>

      <div className="dash-two-col">
        {/* Circular Risk Gauge */}
        <div className="card">
          <div className="card-header"><h2>Latest Cardiac Risk</h2></div>
          {!latest ? (
            <div className="empty-state">
              <Activity size={36} color="#D1D5DB"/>
              <p>No reports yet. Your cardiologist will add your ECG results here.</p>
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'8px 0' }}>
              <div style={{ position:'relative', width:'160px', height:'160px', margin:'0 auto 20px' }}>
                <svg viewBox="0 0 160 160" style={{ width:'100%', transform:'rotate(-90deg)' }}>
                  <circle cx="80" cy="80" r="64" fill="none" stroke="#E5E7EB" strokeWidth="16"/>
                  <circle cx="80" cy="80" r="64" fill="none" stroke={arcColor} strokeWidth="16"
                    strokeDasharray={`${(riskScore??0)*4.02} 402`}
                    strokeLinecap="round" style={{ transition:'stroke-dasharray 1s ease' }}/>
                </svg>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:'36px', fontWeight:'800', color:arcColor, lineHeight:1 }}>{riskScore??'—'}</span>
                  <span style={{ fontSize:'11px', color:'#9CA3AF', marginTop:'4px' }}>/ 100</span>
                </div>
              </div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'8px 20px', borderRadius:'100px', background:riskBg(riskStatus), marginBottom:'16px' }}>
                <span style={{ fontSize:'16px', fontWeight:'700', color:arcColor }}>{riskStatus||'Pending'}</span>
              </div>
              {la.triage && (
                <p style={{ fontSize:'13px', color:'#6B7280', marginBottom:'12px' }}>
                  Triage: <strong style={{ color:arcColor }}>{la.triage}</strong>
                </p>
              )}
              {la.recommendation && (
                <div style={{ textAlign:'left', padding:'12px 16px', background:'#F9FAFB', borderRadius:'8px', borderLeft:`3px solid ${arcColor}`, marginTop:'8px' }}>
                  <p style={{ fontSize:'13px', color:'#374151', lineHeight:'1.6' }}>{la.recommendation}</p>
                </div>
              )}
              <button type="button" className="btn btn-outline" style={{ marginTop:'16px', width:'100%' }}
                onClick={()=>navigate('/results',{state:{reportId:latest._id}})}>
                View Full Analysis <ArrowRight size={14}/>
              </button>
            </div>
          )}
        </div>

        {/* Latest ECG Findings */}
        <div className="card">
          <div className="card-header"><h2>Latest ECG Findings</h2></div>
          {!latest ? (
            <div className="empty-state"><HeartPulse size={36} color="#D1D5DB"/><p>No ECG analysis yet.</p></div>
          ) : (
            <>
              <div style={{ marginBottom:'16px', padding:'12px', background:'#F9FAFB', borderRadius:'8px' }}>
                <p style={{ fontSize:'11px', color:'#9CA3AF', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.05em' }}>ECG Metrics</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                  {[
                    ['Heart Rate', la.heartRate ? `${la.heartRate} bpm` : '—'],
                    ['Rhythm',     la.rhythmType || '—'],
                    ['PR Interval',la.prInterval ? `${la.prInterval} ms` : '—'],
                    ['QTc',        la.qtcInterval ? `${la.qtcInterval} ms` : '—'],
                    ['ST Deviation',la.stDeviation != null ? `${la.stDeviation} mm` : '—'],
                    ['QRS Duration',la.qrsDuration ? `${la.qrsDuration} ms` : '—'],
                  ].map(([k,v]) => (
                    <div key={k}>
                      <p style={{ fontSize:'11px', color:'#9CA3AF' }}>{k}</p>
                      <p style={{ fontSize:'13px', fontWeight:'600', color:'#1F2937' }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <p style={{ fontSize:'12px', color:'#9CA3AF', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Conditions</p>
              {(la.conditions||[]).length===0 ? (
                <div style={{ display:'flex', alignItems:'center', gap:'8px', color:'#10B981' }}>
                  <CheckCircle size={18}/><span style={{ fontSize:'14px', fontWeight:'500' }}>No significant conditions detected</span>
                </div>
              ) : (
                (la.conditions||[]).map((c,i) => (
                  <div key={i} className="condition-item" style={{ padding:'10px 12px', marginBottom:'6px' }}>
                    <HeartPulse size={15} color={riskColor(c.severity==='High'?'Critical':c.severity==='Moderate'?'Moderate':'Normal')}/>
                    <span style={{ flex:1, fontSize:'13px', fontWeight:'500' }}>{c.name}</span>
                    <span className={`badge badge-${c.severity==='High'?'danger':c.severity==='Moderate'?'warning':'success'}`} style={{ fontSize:'11px' }}>{c.severity}</span>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Risk Trend Chart */}
      {trend.length >= 2 && (
        <div className="card mt-8">
          <div className="card-header">
            <h2><TrendingUp size={18} style={{ marginRight:'8px', verticalAlign:'middle' }}/>Risk Score Trend</h2>
            <span style={{ fontSize:'12px', color:'#9CA3AF' }}>Last {trend.length} reports</span>
          </div>
          <div style={{ padding:'8px 0' }}>
            <svg viewBox={`0 0 ${Math.max(400, trend.length*70)} 120`} style={{ width:'100%', height:'120px' }}>
              {/* Grid lines */}
              {[0,30,60,100].map(v => (
                <line key={v}
                  x1="0" y1={100-(v/100)*90}
                  x2={Math.max(400, trend.length*70)} y2={100-(v/100)*90}
                  stroke="#F3F4F6" strokeWidth="1"
                />
              ))}
              {/* Area fill */}
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0A66C2" stopOpacity="0.2"/>
                  <stop offset="100%" stopColor="#0A66C2" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {trend.length>1 && (() => {
                const step = Math.max(400, trend.length*70) / (trend.length-1);
                const pts  = trend.map((r,i) => `${i*step},${100-((r.analysis?.riskScore??0)/100)*90}`).join(' ');
                const last = trend[trend.length-1];
                const lx   = (trend.length-1)*step;
                return (
                  <>
                    <polygon
                      points={`0,100 ${pts} ${lx},100`}
                      fill="url(#trendGrad)"
                    />
                    <polyline points={pts} fill="none" stroke="#0A66C2" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                    {trend.map((r,i) => {
                      const x = i*step;
                      const y = 100-((r.analysis?.riskScore??0)/100)*90;
                      const color = (r.analysis?.riskScore??0)>=61?'#EF4444':(r.analysis?.riskScore??0)>=31?'#F59E0B':'#10B981';
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r="5" fill="#fff" stroke={color} strokeWidth="2"/>
                          <text x={x} y={y-10} textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
                            {r.analysis?.riskScore??'?'}
                          </text>
                          <text x={x} y="115" textAnchor="middle" fontSize="9" fill="#9CA3AF">
                            {new Date(r.createdAt).toLocaleDateString([],{month:'short',day:'numeric'})}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* Report History Table */}
      <div className="card mt-8">
        <div className="card-header">
          <h2>My Report History</h2>
          <Link to="/results" className="btn btn-outline" style={{ padding:'5px 12px', fontSize:'12px' }}>
            View All <ArrowRight size={13}/>
          </Link>
        </div>
        {myReports.length===0 ? (
          <div className="empty-state">
            <Activity size={36} color="#D1D5DB"/>
            <p>No reports yet. Your cardiologist will upload your ECG reports here.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Report ID</th><th>Date</th><th>Cardiologist</th><th>Risk Score</th><th>Status</th><th>Confidence</th><th>Action</th></tr>
              </thead>
              <tbody>
                {myReports.map(r => (
                  <tr key={r._id}>
                    <td style={{ fontWeight:'600', color:'#0A66C2' }}>{r.reportId}</td>
                    <td className="text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontWeight:'500' }}>{r.cardiologistName}</td>
                    <td>{r.analysis?.riskScore!=null ? <RiskBar score={r.analysis.riskScore}/> : '—'}</td>
                    <td><StatusBadge status={r.status}/></td>
                    <td style={{ fontSize:'13px' }}>{r.analysis?.confidence ? `${r.analysis.confidence}%` : '—'}</td>
                    <td>
                      <button type="button" className="btn btn-outline"
                        style={{ padding:'4px 12px', fontSize:'12px' }}
                        onClick={()=>navigate('/results',{state:{reportId:r._id}})}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient ECG Upload Modal */}
      <PatientECGUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          fetchReports();
          setUploadModalOpen(false);
        }}
      />
    </div>
  );
};

/* ══════════════════════════ ROOT EXPORT ══════════════════════════ */
const Dashboard = () => {
  const { user } = useAuth();
  const { reports, fetchReports, loading, lastUpdated, getReportsByCardiologist, getReportsByPatient } = useReports();
  const navigate = useNavigate();

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const userReports = user
    ? user.role === 'Cardiologist'
      ? getReportsByCardiologist(user.email)
      : getReportsByPatient(user.email)
    : [];

  if (!user) return null;

  const props = { user, reports: userReports, fetchReports, loading, navigate, lastUpdated };

  return user.role === 'Cardiologist'
    ? <CardiologistDashboard {...props}/>
    : <PatientDashboard {...props}/>;
};

export default Dashboard;
