import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App.jsx';
import './index.css';
import './i18n';

// Configure Axios with Backend URL (for production)
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
