import React, { useEffect, useState } from 'react';
import './App.css';

interface ApiHealth {
  status: string;
  service: string;
  environment: string;
}

function App() {
  const [apiStatus, setApiStatus] = useState<string>('checking...');
  const [apiData, setApiData] = useState<ApiHealth | null>(null);
  const [backendMessage, setBackendMessage] = useState<string>('');

  useEffect(() => {
    // Kontrollera backend health
    fetch(`${process.env.REACT_APP_API_URL}/health`)
      .then(res => res.json())
      .then((data: ApiHealth) => {
        setApiStatus(data.status);
        setApiData(data);
      })
      .catch(() => {
        setApiStatus('offline');
      });

    // Hämta root message
    fetch(`${process.env.REACT_APP_API_URL}/`)
      .then(res => res.json())
      .then(data => {
        setBackendMessage(data.message || '');
      })
      .catch(() => {
        setBackendMessage('Kunde inte ansluta till backend');
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🍽️ GastroPartner</h1>
        <h2>Hello World från GastroPartner!</h2>
        
        <div style={{ marginTop: '2rem' }}>
          <h3>System Status</h3>
          <p>
            Frontend Environment: <strong>{process.env.REACT_APP_ENV}</strong>
          </p>
          <p>
            Backend Status: <strong style={{
              color: apiStatus === 'healthy' ? '#4CAF50' : '#f44336'
            }}>{apiStatus}</strong>
          </p>
          {apiData && (
            <>
              <p>Backend Service: <strong>{apiData.service}</strong></p>
              <p>Backend Environment: <strong>{apiData.environment}</strong></p>
            </>
          )}
          {backendMessage && (
            <p style={{ marginTop: '1rem', fontSize: '1.2rem' }}>
              {backendMessage}
            </p>
          )}
        </div>
        
        <p style={{ marginTop: '3rem', fontSize: '0.9rem', color: '#888' }}>
          En modulär SaaS-plattform för småskaliga livsmedelsproducenter, restauranger och krögare
        </p>
      </header>
    </div>
  );
}

export default App;
