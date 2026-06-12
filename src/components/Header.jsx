import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, Search, CheckCheck, Trash2, X, HeartPulse, ClipboardList, AlertTriangle, FileCheck, FilePen, User, Users, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { useReports } from '../context/ReportsContext';
import './Header.css';

/* ── Notification icon by type ── */
const NotifIcon = ({ type }) => {
  const map = {
    critical_alert:  <AlertTriangle size={16} color="#EF4444" />,
    new_ecg:         <HeartPulse    size={16} color="#0A66C2" />,
    report_approved: <FileCheck     size={16} color="#10B981" />,
    report_rejected: <AlertTriangle size={16} color="#F59E0B" />,
    draft_saved:     <FilePen       size={16} color="#8B5CF6" />,
  };
  return map[type] || <ClipboardList size={16} color="#6B7280" />;
};

const notifBg = (type) => ({
  critical_alert:  '#FEE2E2',
  new_ecg:         '#EBF3FF',
  report_approved: '#D1FAE5',
  report_rejected: '#FEF3C7',
  draft_saved:     '#EDE9FE',
}[type] || '#F3F4F6');

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

/* ── Risk badge color ── */
const riskColor = (score) => {
  if (score >= 86) return '#EF4444';
  if (score >= 61) return '#F59E0B';
  if (score >= 31) return '#3B82F6';
  return '#10B981';
};

/* ══════════════════════════════════════════════════════════════ */
const Header = () => {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const { notifications, unread, markRead, markAllRead, deleteNotification, clearAll, loading } = useNotifications();
  const { reports } = useReports();

  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [searchQuery,  setSearchQuery]    = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen,   setSearchOpen]     = useState(false);
  const [searchFocus,  setSearchFocus]    = useState(false);
  const [patientsList, setPatientsList]   = useState([]);

  // Load patients list once for cardiologist search
  useEffect(() => {
    if (user?.role !== 'Cardiologist') return;
    const token = localStorage.getItem('cardiosense_token');
    fetch('http://localhost:5001/api/patients', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { if (d.success) setPatientsList(d.patients || []); })
      .catch(() => {});
  }, [user]);

  const dropdownRef = useRef(null);
  const searchRef   = useRef(null);

  /* Close notification dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
        setSearchFocus(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Search logic ── */
  const runSearch = useCallback((q) => {
    const query = q.toLowerCase().trim();
    if (!query || query.length < 1) { setSearchResults([]); setSearchOpen(false); return; }

    const results = [];

    // ── 1. Search patients directly by name/email/ID ──
    if (user?.role === 'Cardiologist' && patientsList.length > 0) {
      patientsList.forEach(p => {
        const str = [p.name || '', p.email || '', p.patientId || ''].join(' ').toLowerCase();
        if (str.includes(query)) {
          const already = results.find(x => x.type === 'patient' && x.email === p.email);
          if (!already) {
            results.push({
              type:     'patient',
              label:    p.name,
              sublabel: p.patientId ? `${p.patientId} · ${p.email}` : p.email,
              email:    p.email,
              icon:     'patient',
              action:   () => navigate(`/patients/${encodeURIComponent(p.email)}`),
            });
          }
        }
      });
    }

    // ── 2. Search reports ──
    if (reports && reports.length > 0) {
      const visibleReports = user?.role === 'Patient'
        ? reports.filter(r => r.patientEmail === user?.email?.toLowerCase())
        : reports;

      visibleReports.forEach(r => {
        const score     = r.analysis?.riskScore;
        const status    = r.status || '';
        const patName   = r.patientName || '';
        const patEmail  = r.patientEmail || '';
        const cardName  = r.cardiologistName || '';
        const cardEmail = r.cardiologistEmail || '';
        const repId     = r.reportId || r._id || '';
        const patId     = r.patientId || '';
        const conditions = (r.analysis?.conditions || []).map(c => c.name || c).join(' ');
        const date      = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB') : '';
        const searchStr = [patName, patEmail, cardName, cardEmail, repId, patId, status, conditions, date].join(' ').toLowerCase();

        if (searchStr.includes(query)) {
          // Add patient if not already in results
          const existingPatient = results.find(x => x.type === 'patient' && x.email === patEmail);
          if (!existingPatient && user?.role === 'Cardiologist') {
            results.push({
              type:     'patient',
              label:    patName,
              sublabel: patId ? `${patId} · ${patEmail}` : patEmail,
              email:    patEmail,
              icon:     'patient',
              action:   () => navigate(`/patients/${encodeURIComponent(patEmail)}`),
            });
          }

          // Report result
          const alreadyReport = results.find(x => x.type === 'report' && x.id === repId);
          if (!alreadyReport) {
            results.push({
              type:     'report',
              label:    `${patName} — ${status}`,
              sublabel: `Report #${repId.slice(-6).toUpperCase()} · ${date}`,
              score,
              id:       repId,
              icon:     'report',
              action:   () => navigate('/results', { state: { reportId: repId } }),
            });
          }

          // Doctor result for patient role
          if (user?.role === 'Patient') {
            const existingDoc = results.find(x => x.type === 'doctor' && x.email === cardEmail);
            if (!existingDoc && (cardName.toLowerCase().includes(query) || cardEmail.toLowerCase().includes(query))) {
              results.push({
                type:     'doctor',
                label:    `Dr. ${cardName}`,
                sublabel: cardEmail,
                email:    cardEmail,
                icon:     'doctor',
                action:   () => navigate('/results'),
              });
            }
          }
        }
      });
    }

    setSearchResults(results.slice(0, 8));
    setSearchOpen(results.length > 0);
  }, [reports, patientsList, user, navigate]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    runSearch(val);
  };

  const handleResultClick = (result) => {
    result.action();
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
  };

  const handleNotifClick = (n) => {
    if (!n.read) markRead(n._id);
    if (n.reportId) {
      setDropdownOpen(false);
      navigate('/results', { state: { reportId: n.reportId } });
    }
  };

  const displayName = user
    ? `${user.role === 'Cardiologist' ? 'Dr. ' : ''}${user.name}`
    : 'Guest';
  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  /* ── Result icon ── */
  const ResultIcon = ({ type }) => {
    if (type === 'patient') return <div className="sr-icon sr-icon-patient"><User size={14} /></div>;
    if (type === 'doctor')  return <div className="sr-icon sr-icon-doctor"><Users size={14} /></div>;
    return <div className="sr-icon sr-icon-report"><FileText size={14} /></div>;
  };

  const groupLabel = { patient: 'Patient', doctor: 'Cardiologist', report: 'Report' };

  return (
    <header className="header">
      {/* ── Search ── */}
      <div className="header-search" ref={searchRef}>
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search by name, Patient ID (CS-P-00001), report..."
          className="search-input"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => { setSearchFocus(true); if (searchResults.length) setSearchOpen(true); }}
          autoComplete="off"
        />
        {searchQuery && (
          <button type="button" className="search-clear-btn" onClick={clearSearch}>
            <X size={14} />
          </button>
        )}

        {/* Search Results Dropdown */}
        {searchOpen && searchResults.length > 0 && (
          <div className="search-dropdown">
            {['patient', 'doctor', 'report'].map(type => {
              const group = searchResults.filter(r => r.type === type);
              if (!group.length) return null;
              return (
                <div key={type}>
                  <div className="search-group-label">{groupLabel[type]}s</div>
                  {group.map((result, i) => (
                    <div key={i} className="search-result-item" onClick={() => handleResultClick(result)}>
                      <ResultIcon type={result.type} />
                      <div className="sr-text">
                        <span className="sr-label">{result.label}</span>
                        <span className="sr-sublabel">{result.sublabel}</span>
                      </div>
                      {result.type === 'report' && result.score != null && (
                        <span className="sr-badge" style={{ background: riskColor(result.score) + '20', color: riskColor(result.score) }}>
                          {result.score}/100
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
            <div className="search-footer">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
            </div>
          </div>
        )}

        {/* No results */}
        {searchFocus && searchQuery.length > 0 && searchResults.length === 0 && (
          <div className="search-dropdown">
            <div className="search-no-result">
              <Search size={20} color="#D1D5DB" />
              <p>No results for "<strong>{searchQuery}</strong>"</p>
              <span>Try patient name, report ID, or status</span>
            </div>
          </div>
        )}
      </div>

      <div className="header-actions">
        {/* ── Notification bell ── */}
        <div className="notif-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className={`icon-btn notification-btn ${unread > 0 ? 'has-unread' : ''}`}
            onClick={() => setDropdownOpen(o => !o)}
            aria-label={`${unread} unread notifications`}
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="notification-badge">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="notif-dropdown">
              {/* Header row */}
              <div className="notif-dropdown-header">
                <h3>Notifications {unread > 0 && <span className="notif-count-chip">{unread} new</span>}</h3>
                <div className="notif-header-actions">
                  {unread > 0 && (
                    <button type="button" className="notif-action-btn" onClick={markAllRead} disabled={loading} title="Mark all as read">
                      <CheckCheck size={15} /> All read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button type="button" className="notif-action-btn notif-clear-btn" onClick={clearAll} disabled={loading} title="Clear all">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Notification list */}
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <Bell size={32} color="#D1D5DB" />
                    <p>No notifications yet</p>
                    <span>You'll see alerts here when ECG reports are uploaded or reviewed.</span>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n._id}
                      className={`notif-item ${!n.read ? 'unread' : ''}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <div className="notif-icon-wrap" style={{ background: notifBg(n.type) }}>
                        <NotifIcon type={n.type} />
                      </div>
                      <div className="notif-body">
                        <p className="notif-title">{n.title}</p>
                        <p className="notif-message">{n.message}</p>
                        <p className="notif-time">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && <span className="notif-dot" />}
                      <button
                        type="button"
                        className="notif-delete-btn"
                        onClick={e => { e.stopPropagation(); deleteNotification(n._id); }}
                        title="Remove"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── User profile ── */}
        <div className="user-profile" onClick={() => navigate('/settings')}>
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <span className="user-name">{displayName}</span>
            <span className="user-role">{user?.role || 'Guest'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
