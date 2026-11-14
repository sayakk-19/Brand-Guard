import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './styles.css';
import { readPreferences } from './preferences';
import SmoothScroll from './components/SmoothScroll';
import './themes.css';
import './motion.css';

document.documentElement.dataset.theme = readPreferences().theme;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SmoothScroll />
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
