import { useState } from 'react';
import { UploadCloud, File, X, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useReports } from '../context/ReportsContext';
import './UploadECG.css';

const UploadECG = () => {
  const [file, setFile] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');

  // Clinical measurement fields for AI model
  const [cp, setCp] = useState('2');
  const [trestbps, setTrestbps] = useState('');
  const [chol, setChol] = useState('');
  const [fbs, setFbs] = useState(false);
  const [thalach, setThalach] = useState('');
  const [exang, setExang] = useState(false);
  const [oldpeak, setOldpeak] = useState('');
  const [slope, setSlope] = useState('1');

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { uploadReport } = useReports();

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !user) return;
    setError('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('ecgFile', file);
      formData.append('patientName', patientName);
      formData.append('patientEmail', patientEmail);
      formData.append('patientAge', age);
      formData.append('patientGender', gender);
      formData.append('symptoms', symptoms);
      formData.append('notes', notes);
      formData.append('cardiologistName', user.name);
      formData.append('cardiologistEmail', user.email);
      // Clinical measurements for AI
      formData.append('cp', cp);
      formData.append('trestbps', trestbps || '120');
      formData.append('chol', chol || '200');
      formData.append('fbs', fbs ? 'true' : 'false');
      formData.append('thalach', thalach || '150');
      formData.append('exang', exang ? 'true' : 'false');
      formData.append('oldpeak', oldpeak || '0');
      formData.append('slope', slope);

      const report = await uploadReport(formData);
      navigate('/results', { state: { reportId: report._id } });
    } catch (uploadError) {
      setError(uploadError.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-page">
      <div className="page-title">
        <h1>Upload ECG for AI Analysis</h1>
      </div>

      <form onSubmit={handleUpload}>
        <div className="upload-container">
          {/* ECG File Upload */}
          <div className="card upload-section">
            <h2>ECG File Upload</h2>

            {/* Mode indicator */}
            {file ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                background: file.name.endsWith('.csv') ? '#D1FAE5' : '#EBF3FF',
                border: `1px solid ${file.name.endsWith('.csv') ? '#10B981' : '#0A66C2'}`,
              }}>
                <Activity size={16} color={file.name.endsWith('.csv') ? '#10B981' : '#0A66C2'} />
                <div>
                  <p style={{ fontWeight: '600', fontSize: '13px', margin: 0,
                    color: file.name.endsWith('.csv') ? '#065F46' : '#1e40af' }}>
                    {file.name.endsWith('.csv')
                      ? '✅ ECG Signal Analysis — AI will read the real waveform'
                      : '📋 Clinical Data Analysis — AI uses the form values below'}
                  </p>
                  <p style={{ fontSize: '11px', margin: 0,
                    color: file.name.endsWith('.csv') ? '#047857' : '#3b82f6' }}>
                    {file.name.endsWith('.csv')
                      ? 'Heart Rate, PR, QRS, QTc, ST Deviation extracted directly from the signal'
                      : 'Upload a .csv ECG signal file to enable real waveform analysis'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted" style={{ marginBottom: '16px', fontSize: '14px' }}>
                Upload a <strong>.csv ECG signal file</strong> for real waveform analysis, or any other file (PDF/JPG) to use the clinical data model.
              </p>
            )}

            {!file ? (
              <div className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                <div className="dropzone-icon">
                  <UploadCloud size={40} color="#0A66C2" />
                </div>
                <h3>Drag & drop ECG file here</h3>
                <p className="text-muted" style={{ fontSize: '13px', margin: '4px 0 8px' }}>
                  <strong style={{ color: '#10B981' }}>.csv signal</strong> → real waveform analysis &nbsp;|&nbsp;
                  <strong style={{ color: '#0A66C2' }}>.pdf / .jpg</strong> → clinical data model
                </p>
                <input type="file" id="file-upload" accept=".csv,.pdf,.jpg,.jpeg,.png,.txt"
                  onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                  style={{ display: 'none' }} />
                <label htmlFor="file-upload" className="btn btn-outline" style={{ marginTop: '8px' }}>
                  Browse Files
                </label>
              </div>
            ) : (
              <div className="file-preview">
                <div className="file-info">
                  <File size={24} color="#0A66C2" />
                  <div>
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button type="button" className="icon-btn" onClick={() => setFile(null)}>
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Patient Info */}
          <div className="card form-section">
            <h2>Patient Information</h2>

            <div className="input-group">
              <label className="input-label">Full Name *</label>
              <input type="text" className="input-field" placeholder="e.g. John Doe" value={patientName} onChange={(e) => setPatientName(e.target.value)} required />
            </div>

            <div className="input-group">
              <label className="input-label">Email *</label>
              <input type="email" className="input-field" placeholder="patient@example.com" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} required />
            </div>

            <div className="form-row">
              <div className="input-group">
                <label className="input-label">Age *</label>
                <input type="number" className="input-field" placeholder="45" min="1" max="120" value={age} onChange={(e) => setAge(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label">Gender *</label>
                <select className="input-field" value={gender} onChange={(e) => setGender(e.target.value)} required>
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Presenting Symptoms</label>
              <input type="text" className="input-field" placeholder="e.g. chest pain, shortness of breath, palpitations" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">Additional Clinical Notes</label>
              <textarea className="input-field" placeholder="Relevant medical history, medications, previous diagnoses..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Clinical Measurements */}
        <div className="card" style={{ marginTop: '24px' }}>
          <h2 style={{ marginBottom: '8px' }}>Clinical Measurements</h2>
          <p className="text-muted" style={{ fontSize: '14px', marginBottom: '24px' }}>
            These values are used by the AI model to compute the cardiac risk score. Enter values from the patient's clinical assessment.
          </p>

          <div className="clinical-grid">
            <div className="input-group">
              <label className="input-label">Chest Pain Type</label>
              <select className="input-field" value={cp} onChange={(e) => setCp(e.target.value)}>
                <option value="1">Typical Angina</option>
                <option value="2">Atypical Angina</option>
                <option value="3">Non-Anginal Pain</option>
                <option value="4">Asymptomatic</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Resting Blood Pressure (mmHg)</label>
              <input type="number" className="input-field" placeholder="e.g. 130" min="60" max="250" value={trestbps} onChange={(e) => setTrestbps(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">Serum Cholesterol (mg/dL)</label>
              <input type="number" className="input-field" placeholder="e.g. 220" min="100" max="600" value={chol} onChange={(e) => setChol(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">Max Heart Rate Achieved (bpm)</label>
              <input type="number" className="input-field" placeholder="e.g. 150" min="50" max="250" value={thalach} onChange={(e) => setThalach(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">ST Depression (Oldpeak)</label>
              <input type="number" step="0.1" className="input-field" placeholder="e.g. 1.5" min="0" max="10" value={oldpeak} onChange={(e) => setOldpeak(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">Slope of Peak Exercise ST</label>
              <select className="input-field" value={slope} onChange={(e) => setSlope(e.target.value)}>
                <option value="1">Upsloping</option>
                <option value="2">Flat</option>
                <option value="3">Downsloping</option>
              </select>
            </div>
          </div>

          <div className="checkbox-row">
            <label className="checkbox-label">
              <input type="checkbox" checked={fbs} onChange={(e) => setFbs(e.target.checked)} />
              <span>Fasting Blood Sugar &gt; 120 mg/dL</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={exang} onChange={(e) => setExang(e.target.checked)} />
              <span>Exercise-Induced Angina</span>
            </label>
          </div>
        </div>

        {error && <div className="auth-error" style={{ marginTop: '16px' }}>{error}</div>}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!file || isUploading}
          style={{ width: '100%', marginTop: '24px', padding: '14px', fontSize: '16px' }}
        >
          {isUploading ? (
            <><Activity className="spinner" size={20} /> Analyzing ECG with AI...</>
          ) : (
            'Upload & Run AI Analysis'
          )}
        </button>
      </form>
    </div>
  );
};

export default UploadECG;
