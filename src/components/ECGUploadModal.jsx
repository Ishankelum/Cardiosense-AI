import { useState } from 'react';
import { X, UploadCloud, File, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useReports } from '../context/ReportsContext';
import './ECGUploadModal.css';

const ECGUploadModal = ({ isOpen, onClose, patient, onSuccess }) => {
  const [file, setFile] = useState(null);
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
    if (!file || !patient) return;
    setError('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('ecgFile', file);
      formData.append('patientName', patient.name);
      formData.append('patientEmail', patient.email);
      formData.append('patientAge', patient.age);
      formData.append('patientGender', patient.gender);
      formData.append('symptoms', symptoms);
      formData.append('notes', notes);
      formData.append('cardiologistName', user.name);
      formData.append('cardiologistEmail', user.email);
      formData.append('cp', cp);
      formData.append('trestbps', trestbps || '120');
      formData.append('chol', chol || '200');
      formData.append('fbs', fbs ? 'true' : 'false');
      formData.append('thalach', thalach || '150');
      formData.append('exang', exang ? 'true' : 'false');
      formData.append('oldpeak', oldpeak || '0');
      formData.append('slope', slope);

      const report = await uploadReport(formData);
      setFile(null);
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
    <div className="ecg-modal-overlay" onClick={onClose}>
      <div className="ecg-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ecg-modal-header">
          <h2>Upload ECG Report for {patient?.name}</h2>
          <button
            type="button"
            className="ecg-modal-close"
            onClick={onClose}
            disabled={isUploading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleUpload} className="ecg-modal-form">
          {/* File Upload Section */}
          <div className="ecg-upload-section">
            <h3>ECG File</h3>
            {!file ? (
              <div
                className="ecg-dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="ecg-dropzone-icon">
                  <UploadCloud size={36} color="#0A66C2" />
                </div>
                <p className="ecg-dropzone-text">Drag & drop ECG file here</p>
                <p className="ecg-dropzone-hint">
                  <strong>.csv</strong> for signal analysis or <strong>.pdf/.jpg</strong> for clinical data
                </p>
                <input
                  type="file"
                  id="ecg-file-upload"
                  accept=".csv,.pdf,.jpg,.jpeg,.png,.txt"
                  onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <label htmlFor="ecg-file-upload" className="btn btn-outline">
                  Browse Files
                </label>
              </div>
            ) : (
              <div className="ecg-file-preview">
                <div className="ecg-file-info">
                  <File size={24} color="#0A66C2" />
                  <div>
                    <p className="ecg-file-name">{file.name}</p>
                    <p className="ecg-file-size">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="ecg-remove-file"
                  onClick={() => setFile(null)}
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Clinical Info Section */}
          <div className="ecg-clinical-section">
            <h3>Clinical Information</h3>

            <div className="ecg-form-row">
              <div className="ecg-input-group">
                <label className="ecg-input-label">Symptoms</label>
                <input
                  type="text"
                  className="ecg-input-field"
                  placeholder="e.g. chest pain, palpitations"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>
            </div>

            <div className="ecg-form-row">
              <div className="ecg-input-group">
                <label className="ecg-input-label">Notes</label>
                <textarea
                  className="ecg-input-field"
                  placeholder="Additional clinical notes..."
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="ecg-measurements-grid">
              <div className="ecg-input-group">
                <label className="ecg-input-label">Chest Pain Type</label>
                <select
                  className="ecg-input-field"
                  value={cp}
                  onChange={(e) => setCp(e.target.value)}
                >
                  <option value="1">Typical Angina</option>
                  <option value="2">Atypical Angina</option>
                  <option value="3">Non-Anginal Pain</option>
                  <option value="4">Asymptomatic</option>
                </select>
              </div>

              <div className="ecg-input-group">
                <label className="ecg-input-label">Blood Pressure (mmHg)</label>
                <input
                  type="number"
                  className="ecg-input-field"
                  placeholder="e.g. 130"
                  min="60"
                  max="250"
                  value={trestbps}
                  onChange={(e) => setTrestbps(e.target.value)}
                />
              </div>

              <div className="ecg-input-group">
                <label className="ecg-input-label">Cholesterol (mg/dL)</label>
                <input
                  type="number"
                  className="ecg-input-field"
                  placeholder="e.g. 220"
                  min="100"
                  max="600"
                  value={chol}
                  onChange={(e) => setChol(e.target.value)}
                />
              </div>

              <div className="ecg-input-group">
                <label className="ecg-input-label">Max Heart Rate (bpm)</label>
                <input
                  type="number"
                  className="ecg-input-field"
                  placeholder="e.g. 150"
                  min="50"
                  max="250"
                  value={thalach}
                  onChange={(e) => setThalach(e.target.value)}
                />
              </div>

              <div className="ecg-input-group">
                <label className="ecg-input-label">ST Depression</label>
                <input
                  type="number"
                  step="0.1"
                  className="ecg-input-field"
                  placeholder="e.g. 1.5"
                  min="0"
                  max="10"
                  value={oldpeak}
                  onChange={(e) => setOldpeak(e.target.value)}
                />
              </div>

              <div className="ecg-input-group">
                <label className="ecg-input-label">ST Slope</label>
                <select
                  className="ecg-input-field"
                  value={slope}
                  onChange={(e) => setSlope(e.target.value)}
                >
                  <option value="1">Upsloping</option>
                  <option value="2">Flat</option>
                  <option value="3">Downsloping</option>
                </select>
              </div>
            </div>

            <div className="ecg-checkbox-row">
              <label className="ecg-checkbox-label">
                <input
                  type="checkbox"
                  checked={fbs}
                  onChange={(e) => setFbs(e.target.checked)}
                />
                <span>Fasting Blood Sugar &gt; 120 mg/dL</span>
              </label>
              <label className="ecg-checkbox-label">
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
            <div className="ecg-error-message" role="alert">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="ecg-modal-actions">
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
                  <Activity className="spinner" size={18} /> Analyzing...
                </>
              ) : (
                'Upload & Analyze'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ECGUploadModal;
