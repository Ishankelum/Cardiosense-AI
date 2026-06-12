import { useState } from 'react';
import {
  User, Lock, Bell, Shield, Save, Eye, EyeOff,
  CheckCircle, AlertCircle, Stethoscope, HeartPulse,
  Mail, Phone, BadgeCheck, Calendar, Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useReports } from '../context/ReportsContext';
import './Settings.css';

/* ── small helpers ── */
const Alert = ({ type, msg }) => (
  <div className={`settings-alert settings-alert-${type}`}>
    {type === 'success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
    <span>{msg}</span>
  </div>
);

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: <User size={16}/> },
  { id: 'security',      label: 'Security',       icon: <Lock size={16}/> },
  { id: 'notifications', label: 'Notifications',  icon: <Bell size={16}/> },
  { id: 'account',       label: 'Account Info',   icon: <Shield size={16}/> },
];

/* ══════════════════════════════════════════════════════════════════════════════ */
const Settings = () => {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const { reports } = useReports();
  const [activeTab, setActiveTab] = useState('profile');

  /* ── Profile form ── */
  const [profileForm, setProfileForm] = useState({
    name:           user?.name           || '',
    phone:          user?.phone          || '',
    specialization: user?.specialization || '',
    licenseNumber:  user?.licenseNumber  || '',
  });
  const [profileStatus, setProfileStatus] = useState(null); // { type, msg }
  const [profileSaving, setProfileSaving] = useState(false);

  /* ── Password form ── */
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw]   = useState({ current: false, newPw: false, confirm: false });
  const [pwStatus, setPwStatus] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);

  /* ── Notifications — load from localStorage so prefs persist across sessions ── */
  const NOTIF_KEY = `cardiosense_notif_prefs_${user?.email || 'default'}`;
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(NOTIF_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {
      emailReports:         true,
      smsAlerts:            false,
      criticalAlerts:       true,
      weeklyDigest:         true,
      loginAlerts:          true,
      appointmentReminders: false,
    };
  });
  const [notifSaved, setNotifSaved] = useState(false);

  /* ── Stats ── */
  const myReports = reports?.filter(r =>
    user?.role === 'Cardiologist'
      ? r.cardiologistEmail === user.email
      : r.patientEmail === user.email
  ) || [];

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
    : 'N/A';

  /* ─── Handlers ─────────────────────────────────────────────── */
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      setProfileStatus({ type:'error', msg:'Name cannot be empty.' });
      return;
    }
    setProfileSaving(true);
    setProfileStatus(null);
    const result = await updateProfile(profileForm);
    setProfileSaving(false);
    setProfileStatus(result.success
      ? { type:'success', msg:'Profile updated successfully.' }
      : { type:'error',   msg: result.message });
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) {
      setPwStatus({ type:'error', msg:'All password fields are required.' }); return;
    }
    if (pwForm.newPw.length < 6) {
      setPwStatus({ type:'error', msg:'New password must be at least 6 characters.' }); return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwStatus({ type:'error', msg:'New passwords do not match.' }); return;
    }
    setPwSaving(true);
    setPwStatus(null);
    const result = await changePassword(pwForm.current, pwForm.newPw);
    setPwSaving(false);
    if (result.success) {
      setPwStatus({ type:'success', msg:'Password changed successfully.' });
      setPwForm({ current:'', newPw:'', confirm:'' });
    } else {
      setPwStatus({ type:'error', msg: result.message });
    }
  };

  const handleNotifSave = () => {
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
    } catch { /* ignore */ }
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2500);
  };

  /* ─── Render ─────────────────────────────────────────────────── */
  return (
    <div className="settings-page">
      {/* Page header */}
      <div className="page-title" style={{ marginBottom:'24px' }}>
        <div>
          <h1>Settings</h1>
          <p className="text-muted" style={{ fontSize:'14px', marginTop:'4px' }}>
            Manage your account, security, and preferences.
          </p>
        </div>
      </div>

      <div className="settings-layout">
        {/* ── Sidebar tabs ── */}
        <aside className="settings-sidebar">
          {/* Avatar card */}
          <div className="settings-profile-card">
            <div className="settings-big-avatar">
              {user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || 'U'}
            </div>
            <div className="settings-profile-name">{user?.name}</div>
            <div className="settings-profile-email">{user?.email}</div>
            <div className={`settings-role-badge ${user?.role === 'Cardiologist' ? 'doctor' : 'patient'}`}>
              {user?.role === 'Cardiologist' ? <Stethoscope size={12}/> : <HeartPulse size={12}/>}
              {user?.role}
            </div>
          </div>

          {/* Tab nav */}
          <nav className="settings-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                className={`settings-tab-btn ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main panel ── */}
        <main className="settings-main">

          {/* ══ PROFILE TAB ══ */}
          {activeTab === 'profile' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <User size={20} color="#0A66C2"/>
                <div>
                  <h2>Profile Information</h2>
                  <p>Update your personal details and professional information.</p>
                </div>
              </div>

              {profileStatus && <Alert type={profileStatus.type} msg={profileStatus.msg}/>}

              {/* Patient ID Banner */}
              {user?.role === 'Patient' && user?.patientId && (
                <div style={{
                  background: 'linear-gradient(135deg, #EBF3FF 0%, #DBEAFE 100%)',
                  border: '1px solid #BFDBFE', borderRadius: '12px',
                  padding: '16px 20px', marginBottom: '20px',
                  display: 'flex', alignItems: 'center', gap: '16px',
                }}>
                  <div style={{
                    background: '#0A66C2', borderRadius: '10px',
                    padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <BadgeCheck size={22} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>Your Patient ID</p>
                    <p style={{
                      fontSize: '22px', fontWeight: '800', color: '#0A66C2',
                      fontFamily: 'monospace', letterSpacing: '1px', margin: '2px 0',
                    }}>{user.patientId}</p>
                    <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>
                      Share this ID with your doctor to identify your records easily
                    </p>
                  </div>
                  <button type="button"
                    onClick={() => { navigator.clipboard.writeText(user.patientId); }}
                    style={{
                      background: '#0A66C2', color: 'white', border: 'none',
                      borderRadius: '8px', padding: '8px 14px', cursor: 'pointer',
                      fontSize: '12px', fontWeight: '600',
                    }}>
                    Copy ID
                  </button>
                </div>
              )}

              <form onSubmit={handleProfileSave} className="settings-form">
                <div className="settings-form-row">
                  <div className="settings-field">
                    <label><User size={14}/> Full Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="settings-field">
                    <label><Mail size={14}/> Email Address</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="settings-input-disabled"
                      title="Email cannot be changed"
                    />
                    <p className="settings-hint">Email address cannot be changed.</p>
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-field">
                    <label><Phone size={14}/> Phone Number</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+94 77 000 0000"
                    />
                  </div>
                  <div className="settings-field">
                    <label><BadgeCheck size={14}/> Role</label>
                    <input type="text" value={user?.role || ''} disabled className="settings-input-disabled"/>
                  </div>
                </div>

                {user?.role === 'Cardiologist' && (
                  <div className="settings-form-row">
                    <div className="settings-field">
                      <label><Stethoscope size={14}/> Specialization</label>
                      <input
                        type="text"
                        value={profileForm.specialization}
                        onChange={e => setProfileForm(f => ({ ...f, specialization: e.target.value }))}
                        placeholder="e.g. Interventional Cardiology"
                      />
                    </div>
                    <div className="settings-field">
                      <label><BadgeCheck size={14}/> License Number</label>
                      <input
                        type="text"
                        value={profileForm.licenseNumber}
                        onChange={e => setProfileForm(f => ({ ...f, licenseNumber: e.target.value }))}
                        placeholder="Medical license number"
                      />
                    </div>
                  </div>
                )}

                <div className="settings-form-actions">
                  <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                    <Save size={16}/> {profileSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ══ SECURITY TAB ══ */}
          {activeTab === 'security' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <Lock size={20} color="#0A66C2"/>
                <div>
                  <h2>Security Settings</h2>
                  <p>Change your password and manage account security.</p>
                </div>
              </div>

              {pwStatus && <Alert type={pwStatus.type} msg={pwStatus.msg}/>}

              <form onSubmit={handlePasswordSave} className="settings-form">
                <div className="settings-field">
                  <label><Lock size={14}/> Current Password</label>
                  <div className="settings-pw-wrap">
                    <input
                      type={showPw.current ? 'text' : 'password'}
                      value={pwForm.current}
                      onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                      placeholder="Enter your current password"
                    />
                    <button type="button" className="settings-pw-eye"
                      onClick={() => setShowPw(s => ({ ...s, current: !s.current }))}>
                      {showPw.current ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-field">
                    <label><Lock size={14}/> New Password</label>
                    <div className="settings-pw-wrap">
                      <input
                        type={showPw.newPw ? 'text' : 'password'}
                        value={pwForm.newPw}
                        onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
                        placeholder="At least 6 characters"
                      />
                      <button type="button" className="settings-pw-eye"
                        onClick={() => setShowPw(s => ({ ...s, newPw: !s.newPw }))}>
                        {showPw.newPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                  </div>
                  <div className="settings-field">
                    <label><Lock size={14}/> Confirm New Password</label>
                    <div className="settings-pw-wrap">
                      <input
                        type={showPw.confirm ? 'text' : 'password'}
                        value={pwForm.confirm}
                        onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                        placeholder="Repeat new password"
                      />
                      <button type="button" className="settings-pw-eye"
                        onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}>
                        {showPw.confirm ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password strength bar */}
                {pwForm.newPw && (
                  <div className="settings-pw-strength">
                    <div className="settings-pw-strength-bar">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`settings-pw-bar-seg ${
                          (pwForm.newPw.length >= 6 && i <= 1) ||
                          (pwForm.newPw.length >= 8 && i <= 2) ||
                          (/[A-Z]/.test(pwForm.newPw) && /[0-9]/.test(pwForm.newPw) && i <= 3) ||
                          (/[^A-Za-z0-9]/.test(pwForm.newPw) && i <= 4)
                            ? 'active' : ''
                        }`}/>
                      ))}
                    </div>
                    <span className="settings-pw-strength-label">
                      {pwForm.newPw.length < 6 ? 'Too short' :
                       pwForm.newPw.length < 8 ? 'Weak' :
                       /[A-Z]/.test(pwForm.newPw) && /[0-9]/.test(pwForm.newPw) ? 'Strong 💪' : 'Moderate'}
                    </span>
                  </div>
                )}

                <div className="settings-security-tips">
                  <h4>Password Tips</h4>
                  <ul>
                    <li>Use at least 8 characters</li>
                    <li>Include uppercase letters and numbers</li>
                    <li>Use a special character (!@#$%)</li>
                    <li>Don't reuse passwords from other sites</li>
                  </ul>
                </div>

                <div className="settings-form-actions">
                  <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                    <Lock size={16}/> {pwSaving ? 'Changing…' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ══ NOTIFICATIONS TAB ══ */}
          {activeTab === 'notifications' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <Bell size={20} color="#0A66C2"/>
                <div>
                  <h2>Notification Preferences</h2>
                  <p>Choose what alerts and updates you want to receive.</p>
                </div>
              </div>

              {notifSaved && <Alert type="success" msg="Notification preferences saved."/>}

              <div className="settings-notif-list">
                {[
                  { key:'emailReports',    label:'Email Report Notifications',    desc:'Get emailed when a new ECG report is ready',        icon:<Mail size={18}/> },
                  { key:'criticalAlerts',  label:'Critical Risk Alerts',          desc:'Immediate alerts for critical or high-risk results',  icon:<AlertCircle size={18} color="#EF4444"/> },
                  { key:'loginAlerts',     label:'Login Security Alerts',         desc:'Notify when a new device logs into your account',     icon:<Shield size={18}/> },
                  { key:'weeklyDigest',    label:'Weekly Health Digest',          desc:'Weekly summary of your cardiac health metrics',       icon:<Activity size={18}/> },
                  { key:'smsAlerts',       label:'SMS Alerts',                    desc:'Receive SMS for urgent notifications (requires phone)', icon:<Phone size={18}/> },
                  { key:'appointmentReminders', label:'Appointment Reminders',   desc:'Reminders for upcoming cardiology appointments',      icon:<Calendar size={18}/> },
                ].map(({ key, label, desc, icon }) => (
                  <div key={key} className="settings-notif-row">
                    <div className="settings-notif-icon">{icon}</div>
                    <div className="settings-notif-info">
                      <p className="settings-notif-label">{label}</p>
                      <p className="settings-notif-desc">{desc}</p>
                    </div>
                    <label className="settings-toggle">
                      <input
                        type="checkbox"
                        checked={notifications[key]}
                        onChange={() => setNotifications(n => ({ ...n, [key]: !n[key] }))}
                      />
                      <span className="settings-toggle-slider"/>
                    </label>
                  </div>
                ))}
              </div>

              <div className="settings-form-actions">
                <button type="button" className="btn btn-primary" onClick={handleNotifSave}>
                  <Save size={16}/> Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* ══ ACCOUNT INFO TAB ══ */}
          {activeTab === 'account' && (
            <div>
              {/* Account overview */}
              <div className="settings-card" style={{ marginBottom:'20px' }}>
                <div className="settings-card-header">
                  <Shield size={20} color="#0A66C2"/>
                  <div>
                    <h2>Account Information</h2>
                    <p>Your account details and usage statistics.</p>
                  </div>
                </div>

                <div className="settings-info-grid">
                  {[
                    { label:'Full Name',      value: user?.name,    icon:<User size={16}/> },
                    { label:'Email',          value: user?.email,   icon:<Mail size={16}/> },
                    { label:'Role',           value: user?.role,    icon:<BadgeCheck size={16}/> },
                    { label:'Phone',          value: user?.phone || 'Not provided', icon:<Phone size={16}/> },
                    { label:'Member Since',   value: memberSince,   icon:<Calendar size={16}/> },
                    { label:'Account Status', value: 'Active ✅',   icon:<CheckCircle size={16} color="#10B981"/> },
                    ...(user?.role === 'Cardiologist' ? [
                      { label:'Specialization', value: user?.specialization || 'General Cardiology', icon:<Stethoscope size={16}/> },
                      { label:'License No.',    value: user?.licenseNumber  || 'Not provided',       icon:<BadgeCheck size={16}/> },
                    ] : []),
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="settings-info-item">
                      <div className="settings-info-icon">{icon}</div>
                      <div>
                        <p className="settings-info-label">{label}</p>
                        <p className="settings-info-value">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Usage stats */}
              <div className="settings-card" style={{ marginBottom:'20px' }}>
                <div className="settings-card-header">
                  <Activity size={20} color="#0A66C2"/>
                  <div>
                    <h2>Usage Statistics</h2>
                    <p>Your activity on CardioSense AI.</p>
                  </div>
                </div>
                <div className="settings-stats-row">
                  {(user?.role === 'Cardiologist' ? [
                    { label:'Reports Uploaded',   value: myReports.length },
                    { label:'Pending Reviews',     value: myReports.filter(r => !['Approved','Rejected'].includes(r.status)).length },
                    { label:'Approved Reports',    value: myReports.filter(r => r.status === 'Approved').length },
                    { label:'Critical Cases',      value: myReports.filter(r => r.status === 'Critical').length },
                  ] : [
                    { label:'Total Reports',      value: myReports.length },
                    { label:'Normal Results',      value: myReports.filter(r => r.status === 'Normal').length },
                    { label:'Need Attention',      value: myReports.filter(r => ['Moderate','High Risk'].includes(r.status)).length },
                    { label:'Latest Risk Score',   value: myReports[0]?.analysis?.riskScore != null ? `${myReports[0].analysis.riskScore}/100` : '—' },
                  ]).map(({ label, value }) => (
                    <div key={label} className="settings-stat-box">
                      <p className="settings-stat-value">{value}</p>
                      <p className="settings-stat-label">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              <div className="settings-card settings-danger-card">
                <div className="settings-card-header">
                  <AlertCircle size={20} color="#EF4444"/>
                  <div>
                    <h2 style={{ color:'#EF4444' }}>Danger Zone</h2>
                    <p>Irreversible actions — proceed with caution.</p>
                  </div>
                </div>
                <div className="settings-danger-row">
                  <div>
                    <p style={{ fontWeight:'600', fontSize:'14px' }}>Sign Out of All Devices</p>
                    <p style={{ fontSize:'13px', color:'#9CA3AF' }}>This will end all active sessions.</p>
                  </div>
                  <button type="button" className="btn settings-btn-danger"
                    onClick={() => { logout(); window.location.href = '/login'; }}>
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Settings;
