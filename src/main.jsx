import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import { ReportsProvider } from './context/ReportsContext';
import { NotificationsProvider } from './context/NotificationsContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ReportsProvider>
        <NotificationsProvider>
          <App />
        </NotificationsProvider>
      </ReportsProvider>
    </AuthProvider>
  </React.StrictMode>,
);
