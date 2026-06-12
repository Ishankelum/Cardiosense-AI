import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, HeartPulse, Mail, Lock, ChevronDown, AlertCircle } from 'lucide-react';
import './Auth.css';

const Login = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('Patient');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await login({ email, password, role });
    setIsLoading(false);
    if (!result.success) { setError(result.message); return; }
    navigate('/');
  };

  return (
    <div className="auth-page">

      {/* ── Left Panel ── */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-logo">
            <HeartPulse size={32} color="white" />
            <span>CardioSense AI</span>
          </div>

          <div className="auth-hero">
            <h1>Smart Cardiac Care,<br/>Powered by AI</h1>
            <p>Advanced ECG analysis and intelligent diagnosis at your fingertips. Trusted by cardiologists across Sri Lanka.</p>
          </div>

          <div className="auth-features">
            {[
              { icon: '🫀', title: 'Real ECG Analysis', desc: 'Signal processing with neurokit2' },
              { icon: '🤖', title: '97% AI Accuracy', desc: 'Trained on 1,498 patient records' },
              { icon: '🔒', title: 'Secure & Private', desc: 'End-to-end encrypted data' },
            ].map((f, i) => (
              <div className="auth-feature-item" key={i}>
                <span className="auth-feature-icon">{f.icon}</span>
                <div>
                  <p className="auth-feature-title">{f.title}</p>
                  <p className="auth-feature-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-stats">
            {[
              { value: '1,498+', label: 'Patient Records' },
              { value: '97%', label: 'Accuracy' },
              { value: '9', label: 'Provinces Covered' },
            ].map((s, i) => (
              <div className="auth-stat" key={i}>
                <h3>{s.value}</h3>
                <p>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative circles */}
        <div className="auth-circle auth-circle-1" />
        <div className="auth-circle auth-circle-2" />
        <div className="auth-circle auth-circle-3" />
      </div>

      {/* ── Right Panel ── */}
      <div className="auth-right">
        <div className="auth-form-wrapper">

          <div className="auth-form-header">
            <div className="auth-mobile-logo">
              <HeartPulse size={24} color="#0A66C2" />
              <span>CardioSense AI</span>
            </div>
            <h2>Welcome back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          {/* Role Selector */}
          <div className="auth-role-tabs">
            {['Patient', 'Cardiologist'].map(r => (
              <button
                key={r}
                type="button"
                className={`auth-role-tab ${role === r ? 'active' : ''}`}
                onClick={() => setRole(r)}
              >
                {r === 'Patient' ? '🧑‍⚕️' : '👨‍⚕️'} {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="auth-form">

            {/* Email */}
            <div className="auth-field">
              <label>Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrap">
                <Lock size={18} className="auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="auth-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? (
                <span className="auth-spinner" />
              ) : (
                <>Sign In as {role}</>
              )}
            </button>
          </form>

          <div className="auth-divider"><span>New to CardioSense?</span></div>

          <p className="auth-footer-text">
            Don't have an account?{' '}
            <Link to="/register">Create one here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
