import { useState, useRef, useEffect } from 'react';
import api from '../lib/api.js';

const pageTitles = {
  '/dashboard':         { title: 'Dashboard',          subtitle: 'System overview and AI leakage probability summary' },
  '/beneficiaries':     { title: 'Beneficiaries',       subtitle: 'Manage and review all registered beneficiaries' },
  '/schemes':           { title: 'Schemes',             subtitle: 'Government welfare scheme registry' },
  '/applications':      { title: 'Scheme Applications', subtitle: 'Review, verify and monitor government scheme applications.' },
  '/my-applications':   { title: 'My Applications', subtitle: 'Track submitted scheme applications and review status.' },
  '/ai/risk-explorer':  { title: 'Leakage Probability Explorer', subtitle: 'AI-powered leakage probability and concern level analysis' },
  '/ai/network-graph':  { title: 'Network Graph',       subtitle: 'Suspicious clusters and duplicate pattern visualization' },
  '/geomap':            { title: 'District Heatmap',    subtitle: 'Geographic leakage probability density across districts' },
  '/analytics':         { title: 'Analytics & Reports', subtitle: 'Trends, exports, and detection metrics' },
  '/complaints':        { title: 'Complaints Portal',   subtitle: 'Citizen-reported anomalies and grievances' },
  '/admin':             { title: 'Admin Panel',         subtitle: 'User management, audit logs, and AI parameter controls' },
};

const notifications = [
  { id:1, message: '🚨 Critical Concern cluster: 10 applicants in Lucknow linked via shared phone/bank', time:'2 min ago', unread:true, type:'danger' },
  { id:2, message: '⚠️ Moderate Concern: 3 new income-mismatch cases identified in Mumbai district', time:'15 min ago', unread:true, type:'warning' },
  { id:3, message: '✅ Application #67 approved by Verifying Officer K.', time:'1 hr ago', unread:false, type:'success' },
  { id:4, message: '📢 New complaint filed: Applicant #43 cluster reported for inquiry', time:'2 hr ago', unread:true, type:'danger' },
  { id:5, message: '🔍 AI model evaluated 24 new applications since last login', time:'4 hr ago', unread:false, type:'info' },
];

export default function Header({ pathname }) {
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState('');
  const [backendConnected, setBackendConnected] = useState(false);
  const notifRef = useRef(null);
  const page = pageTitles[pathname] || (pathname.startsWith('/applications/') ? { title: 'Application Detail', subtitle: 'Application evidence, history, and advisory AI analysis' } : { title: 'SchemeSecure AI', subtitle: 'AI Government Scheme Fraud Detection & Verification System' });
  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    let active = true;
    const checkBackend = async () => {
      try {
        const response = await api.get('/health', { timeout: 2500 });
        if (active) setBackendConnected(response?.status === 'ok');
      } catch {
        if (active) setBackendConnected(false);
      }
    };
    checkBackend();
    const interval = window.setInterval(checkBackend, 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  return (
    <header className="header">
      {/* Page Title */}
      <div className="header-breadcrumb">
        <h2>{page.title}</h2>
        <p>{page.subtitle}</p>
      </div>

      {/* Search */}
      <div className="header-search">
        <span className="header-search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search beneficiaries, schemes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="header-actions">
        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button className="icon-btn" onClick={() => setShowNotifs(v => !v)} title="Notifications">
            🔔
            {unreadCount > 0 && <span className="notif-dot" />}
          </button>
          {showNotifs && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>Notifications</span>
                <span style={{ fontSize:11, color:'var(--blue-400)', cursor:'pointer' }}>{unreadCount} new</span>
              </div>
              {notifications.map(n => (
                <div key={n.id} className={`notif-item ${n.unread ? 'unread' : ''}`}>
                  <div className="notif-icon" style={{ background: n.type === 'danger' ? 'var(--red-100)' : n.type === 'warning' ? 'var(--amber-100)' : 'var(--green-100)' }}>
                    {n.type === 'danger' ? '🚨' : n.type === 'warning' ? '⚠️' : '✅'}
                  </div>
                  <div>
                    <div className="notif-text">{n.message}</div>
                    <div className="notif-time">{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Status */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:backendConnected ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)', border:`1px solid ${backendConnected ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)'}`, borderRadius:'var(--radius-full)' }} title="Backend health status">
          <span style={{ width:7, height:7, background:backendConnected ? 'var(--green-500)' : 'var(--red-500)', borderRadius:'50%', animation:backendConnected ? 'pulse-dot 2s infinite' : undefined, display:'inline-block' }} />
          <span style={{ fontSize:11, fontWeight:600, color:backendConnected ? 'var(--green-500)' : 'var(--red-500)' }}>{backendConnected ? 'Backend Connected' : 'Backend Offline'}</span>
        </div>

        {/* Date */}
        <div style={{ fontSize:12, color:'var(--text-muted)', padding:'0 4px' }}>
          {new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
        </div>
      </div>
    </header>
  );
}
