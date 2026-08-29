import React, { useState, useEffect } from 'react';

const styles = {
  app: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    padding: '2rem',
  },
  logo: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: '0.5rem',
    background: 'linear-gradient(90deg, #e94560, #f5a623)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#8892b0',
    marginBottom: '2rem',
  },
  status: {
    padding: '0.75rem 1.5rem',
    background: 'rgba(233, 69, 96, 0.1)',
    border: '1px solid rgba(233, 69, 96, 0.3)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    color: '#e94560',
  },
  version: {
    position: 'fixed' as const,
    bottom: '1rem',
    right: '1rem',
    fontSize: '0.75rem',
    color: '#4a5568',
  },
};

export default function App() {
  const [version, setVersion] = useState('');

  useEffect(() => {
    // @ts-ignore - electronAPI is exposed via preload
    window.electronAPI?.getAppVersion?.().then((v: string) => setVersion(v));
  }, []);

  return (
    <div style={styles.app}>
      <div style={styles.logo}>🐱</div>
      <h1 style={styles.title}>不要加班</h1>
      <p style={styles.subtitle}>macOS 联机工作桌宠 — 把事做完，准点下班</p>
      <div style={styles.status}>
        ✅ Electron 壳运行成功！
      </div>
      {version && <div style={styles.version}>v{version}</div>}
    </div>
  );
}
