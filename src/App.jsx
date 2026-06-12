import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UploadECG from './pages/UploadECG';
import Results from './pages/Results';
import DoctorReview from './pages/DoctorReview';
import Report from './pages/Report';
import ChatBot from './pages/ChatBot';
import Settings from './pages/Settings';
import Patients from './pages/Patients';
import PatientProfile from './pages/PatientProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAuth } from './context/AuthContext';

// Redirect to /login if not authenticated
const ProtectedRoute = ({ children, doctorOnly = false }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (doctorOnly && user.role !== 'Cardiologist') return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<ProtectedRoute doctorOnly><UploadECG /></ProtectedRoute>} />
          <Route path="results" element={<Results />} />
          <Route path="review" element={<ProtectedRoute doctorOnly><DoctorReview /></ProtectedRoute>} />
          <Route path="report" element={<Report />} />
          <Route path="chat" element={<ChatBot />} />
          <Route path="patients" element={<ProtectedRoute doctorOnly><Patients /></ProtectedRoute>} />
          <Route path="patients/:email" element={<ProtectedRoute doctorOnly><PatientProfile /></ProtectedRoute>} />
          <Route
            path="reports"
            element={<Navigate to="/results" replace />}
          />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
