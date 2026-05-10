import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ProcessMonitor from './components/Monitor/ProcessMonitor';
import './styles/index.css';

const isTerminal = window.location.search.includes('terminal=true');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isTerminal ? <ProcessMonitor standalone={true} /> : <App />}
  </React.StrictMode>
);
