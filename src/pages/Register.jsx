import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, HeartPulse, Mail, Lock, User, Stethoscope, AlertCircle, CheckCircle2 } from 'lucide-react';
import './Auth.css';

const Register = () => {
  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole]                   = useState('Patient');
  const [error, setError]                 = useState('');
  const [isLoading, setIsLoading]         = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const passwordMatch = confirmPassword && password === confirmPassword;
  const passwordWeak  = password && password.length < 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setIsLoading(true);
    const result = await register({ name, email, password, role });
    setIsLoading(false);
    if (!result.success) { setError(result.message); return; }
    navigate('/login');
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
            <h1>Join the Future<br/>of Heart Care</h1>
            <p>Create your account and get access to AI-powered ECG analysis, real-time cardiac monitoring, and expert cardiologist reviews.</p>
          </div>

          <div className="auth-features">
            {[
              { icon: '📋', title: 'Instant ECG Reports', desc: 'Results in seconds, not days' },
              { icon: '🏥', title: 'Connect with Doctors', desc: 'Reviewed by licensed cardiologists' },
              { icon: '📊', title: 'Track Your History', desc: 'Full report timeline & analytics' },
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

          <div className="auth-trust">
            <p>🇱🇰 Serving patients across all 9 provinces of Sri Lanka</p>
          </div>
        </div>

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
            <h2>Create your account</h2>
            <p>Get started with CardioSense AI today</p>
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

          {role === 'Cardiologist' && (
            <div className="auth-info-banner">
              <Stethoscope size={16} />
              Cardiologist accounts require license verification by admin.
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">

            {/* Name */}
            <div className="auth-field">
              <label>Full Name</label>
              <div className="auth-input-wrap">
                <User size={18} className="auth-input-icon" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Smith"
                  required
                  autoComplete="name"
                />
              </div>
            </div>

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

            {/* Two column passwords */}
            <div className="auth-two-col">
              {/* Password */}
              <div className="auth-field">
                <label>Password</label>
                <div className="auth-input-wrap">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(v => !v)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordWeak && <p className="auth-field-hint error">Too short — min 6 characters</p>}
              </div>

              {/* Confirm Password */}
              <div className="auth-field">
                <label>Confirm Password</label>
                <div className="auth-input-wrap">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowConfirm(v => !v)}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordMatch && <p className="auth-field-hint success"><CheckCircle2 size={13}/> Passwords match</p>}
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
                <>Create {role} Account</>
              )}
            </button>
          </form>

          <div className="auth-divider"><span>Already have an account?</span></div>

          <p className="auth-footer-text">
            Already registered?{' '}
            <Link to="/login">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
