import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppDialogProvider } from './app-dialog';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppDialogProvider>
        <App />
      </AppDialogProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
