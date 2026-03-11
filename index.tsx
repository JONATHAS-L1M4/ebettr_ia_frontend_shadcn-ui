
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { NotificationProvider } from './context/NotificationContext';
import { darkTheme } from './design-tokens';

// Keep the app in dark mode from the first paint.
const rootEl = document.documentElement;
rootEl.classList.add('dark');
rootEl.style.colorScheme = 'dark';

Object.entries(darkTheme).forEach(([key, value]) => {
  rootEl.style.setProperty(key, value);
});


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </BrowserRouter>
  </React.StrictMode>
);
