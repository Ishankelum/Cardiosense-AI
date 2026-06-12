import { useState } from 'react';
import { X, UploadCloud, File, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useReports } from '../context/ReportsContext';
import './PatientECGUploadModal.css';

const PatientECGUploadModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [cardiologistEmail, setCardiologistEmail] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');
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

  const { user } = useAuth();
  const { uploadReport } = useReports();

  if (!isOpen) return null;

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !user) return;
    
    if (!cardiologistEmail && cardiologistEmail.trim() === '') {
      setError('Please enter your cardiologist\'s email address');
      return;
    }

    setError('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('ecgFile', file);
      formData.append('patientName', user.name);
      formData.append('patientEmail', user.email);
      formData.append('patientAge', user.age || '');
      formData.append('patientGender', user.gender || '');
      formData.append('symptoms', symptoms);
      formData.append('notes', notes);
      formData.append('cardiologistEmail', cardiologistEmail.trim().toLowerCase());
      formData.append('cardiologistName', 'Pending Assignment');
      formData.append('cp', cp);
      formData.append('trestbps', trestbps || '120');
      formData.append('chol', chol || '200');
      formData.append('fbs', fbs ? 'true' : 'false');
      formData.append('thalach', thalach || '150');
      formData.append('exang', exang ? 'true' : 'false');
      formData.append('oldpeak', oldpeak || '0');
      formData.append('slope', slope);

      const report = await uploadReport(formData);
      
      // Reset form
      setFile(null);
      setCardiologistEmail('');
      setSymptoms('');
      setNotes('');
      setCp('2');
      setTrestbps('');
      setChol('');
      setFbs(false);
      setThalach('');
      setExang(false);
      setOldpeak('');
      setSlope('1');
      
      onClose();
      if (onSuccess) onSuccess(report);
    } catch (uploadError) {
      setError(uploadError.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="patient-ecg-modal-overlay" onClick={onClose}>
      <div className="patient-ecg-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="patient-ecg-modal-header">
          <h2>Upload Your ECG Report</h2>
          <button
            type="button"
            className="patient-ecg-modal-close"
            onClick={onClose}
            disabled={isUploading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleUpload} className="patient-ecg-modal-form">
          {/* File Upload Section */}
          <div className="patient-ecg-upload-section">
            <h3>ECG File</h3>
            <p className="patient-ecg-upload-hint">
              Upload your ECG file for your cardiologist to review and analyze.
            </p>
            {!file ? (
              <div
                className="patient-ecg-dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="patient-ecg-dropzone-icon">
                  <UploadCloud size={36} color="#0A66C2" />
                </div>
                <p className="patient-ecg-dropzone-text">Drag & drop your ECG file here</p>
                <p className="patient-ecg-dropzone-hint">
                  <strong>.csv</strong> (signal) • <strong>.pdf</strong> • <strong>.jpg</strong> • <strong>.png</strong>
                </p>
                <input
                  type="file"
                  id="patient-ecg-file-upload"
                  accept=".csv,.pdf,.jpg,.jpeg,.png,.txt"
                  onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <label htmlFor="patient-ecg-file-upload" className="btn btn-outline">
                  Browse Files
                </label>
              </div>
            ) : (
              <div className="patient-ecg-file-preview">
                <div className="patient-ecg-file-info">
                  <File size={24} color="#0A66C2" />
                  <div>
                    <p className="patient-ecg-file-name">{file.name}</p>
                    <p className="patient-ecg-file-size">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="patient-ecg-remove-file"
                  onClick={() => setFile(null)}
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Cardiologist Email */}
          <div className="patient-ecg-section">
            <h3>Cardiologist Information</h3>
            <div className="patient-ecg-input-group">
              <label className="patient-ecg-input-label">Cardiologist Email *</label>
              <input
                type="email"
                className="patient-ecg-input-field"
                placeholder="your.cardiologist@example.com"
                value={cardiologistEmail}
                onChange={(e) => setCardiologistEmail(e.target.value)}
                required
              />
              <p className="patient-ecg-input-hint">
                Enter your cardiologist's email so they can review your ECG report
              </p>
            </div>
          </div>

          {/* Clinical Info Section */}
          <div className="patient-ecg-section">
            <h3>Clinical Information</h3>

            <div className="patient-ecg-form-row">
              <div className="patient-ecg-input-group">
                <label className="patient-ecg-input-label">Current Symptoms</label>
                <input
                  type="text"
                  className="patient-ecg-input-field"
                  placeholder="e.g., chest pain, palpitations, shortness of breath"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>
            </div>

            <div className="patient-ecg-form-row">
              <div className="patient-ecg-input-group">
                <label className="patient-ecg-input-label">Additional Notes</label>
                <textarea
                  className="patient-ecg-input-field"
                  placeholder="Any other relevant medical information or concerns..."
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <h4 className="patient-ecg-subsection-title">Clinical Measurements (Optional)</h4>
            <div className="patient-ecg-measurements-grid">
              <div className="patient-ecg-input-group">
                <label className="patient-ecg-input-label">Chest Pain Type</label>
                <select
                  className="patient-ecg-input-field"
                  value={cp}
                  onChange={(e) => setCp(e.target.value)}
                >
                  <option value="1">Typical Angina</option>
                  <option value="2">Atypical Angina</option>
                  <option value="3">Non-Anginal Pain</option>
                  <option value="4">Asymptomatic</option>
                </select>
              </div>

              <div className="patient-ecg-input-group">
                <label className="patient-ecg-input-label">Blood Pressure (mmHg)</label>
                <input
                  type="number"
                  className="patient-ecg-input-field"
                  placeholder="e.g. 130"
                  min="60"
                  max="250"
                  value={trestbps}
                  onChange={(e) => setTrestbps(e.target.value)}
                />
              </div>

              <div className="patient-ecg-input-group">
                <label className="patient-ecg-input-label">Cholesterol (mg/dL)</label>
                <input
                  type="number"
                  className="patient-ecg-input-field"
                  placeholder="e.g. 220"
                  min="100"
                  max="600"
                  value={chol}
                  onChange={(e) => setChol(e.target.value)}
                />
              </div>

              <div className="patient-ecg-input-group">
                <label className="patient-ecg-input-label">Max Heart Rate (bpm)</label>
                <input
                  type="number"
                  className="patient-ecg-input-field"
                  placeholder="e.g. 150"
                  min="50"
                  max="250"
                  value={thalach}
                  onChange={(e) => setThalach(e.target.value)}
                />
              </div>

              <div className="patient-ecg-input-group">
                <label className="patient-ecg-input-label">ST Depression</label>
                <input
                  type="number"
                  step="0.1"
                  className="patient-ecg-input-field"
                  placeholder="e.g. 1.5"
                  min="0"
                  max="10"
                  value={oldpeak}
                  onChange={(e) => setOldpeak(e.target.value)}
                />
              </div>

              <div className="patient-ecg-input-group">
                <label className="patient-ecg-input-label">ST Slope</label>
                <select
                  className="patient-ecg-input-field"
                  value={slope}
                  onChange={(e) => setSlope(e.target.value)}
                >
                  <option value="1">Upsloping</option>
                  <option value="2">Flat</option>
                  <option value="3">Downsloping</option>
                </select>
              </div>
            </div>

            <div className="patient-ecg-checkbox-row">
              <label className="patient-ecg-checkbox-label">
                <input
                  type="checkbox"
                  checked={fbs}
                  onChange={(e) => setFbs(e.target.checked)}
                />
                <span>Fasting Blood Sugar &gt; 120 mg/dL</span>
              </label>
              <label className="patient-ecg-checkbox-label">
                <input
                  type="checkbox"
                  checked={exang}
                  onChange={(e) => setExang(e.target.checked)}
                />
                <span>Exercise-Induced Angina</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="patient-ecg-error-message" role="alert">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="patient-ecg-modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!file || isUploading}
            >
              {isUploading ? (
                <>
                  <Activity className="spinner" size={18} /> Uploading...
                </>
              ) : (
                'Submit for Review'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientECGUploadModal;
