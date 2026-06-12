import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Users, Activity,
  LogOut, MessageSquare, ClipboardList, Stethoscope,
  HeartPulse, Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/cardiosense-logo.svg';
import './Sidebar.css';

/* Navigation items per role */
const CARDIOLOGIST_NAV = [
  { name: 'Dashboard',     path: '/',        icon: <LayoutDashboard size={20} /> },
  { name: 'Upload ECG',    path: '/upload',  icon: <Upload size={20} /> },
  { name: 'Results',       path: '/results', icon: <Activity size={20} /> },
  { name: 'Doctor Review', path: '/review',  icon: <ClipboardList size={20} /> },
  { name: 'Patients',      path: '/patients',icon: <Users size={20} /> },
];

const PATIENT_NAV = [
  { name: 'Dashboard',    path: '/',        icon: <LayoutDashboard size={20} /> },
  { name: 'My Results',   path: '/results', icon: <Activity size={20} /> },
  { name: 'Chat with AI', path: '/chat',    icon: <MessageSquare size={20} /> },
];

const roleLabel = (role) =>
  role === 'Cardiologist' ? 'Cardiologist' : 'Patient';

const roleIcon = (role) =>
  role === 'Cardiologist'
    ? <Stethoscope size={14} />
    : <HeartPulse size={14} />;

const avatarInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

const Sidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = user?.role === 'Cardiologist' ? CARDIOLOGIST_NAV : PATIENT_NAV;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src={logo} alt="CardioSense AI logo" className="sidebar-logo-img" />
        <h2>CardioSense AI</h2>
      </div>

      {/* Role badge */}
      {user && (
        <div className="sidebar-role-badge">
          {roleIcon(user.role)}
          <span>{roleLabel(user.role)}</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer — user info + settings + logout */}
      <div className="sidebar-footer">
        <NavLink to="/settings" className="nav-item">
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>

        {user ? (
          <>
            {/* User info card */}
            <div className="sidebar-user-card">
              <div className="sidebar-avatar">{avatarInitials(user.name)}</div>
              <div className="sidebar-user-info">
                <p className="sidebar-user-name">{user.name}</p>
                <p className="sidebar-user-email">{user.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { logout(); navigate('/login'); }}
              className="nav-item text-danger sidebar-button"
            >
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <NavLink to="/login" className="nav-item text-primary">
            <LogOut size={20} />
            <span>Sign In</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
