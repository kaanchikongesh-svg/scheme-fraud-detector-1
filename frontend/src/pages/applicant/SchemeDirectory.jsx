import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api.js';

export default function SchemeDirectory() {
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchemes() {
      setLoading(true);
      try {
        const res = await api.get('/api/v1/schemes');
        setSchemes(Array.isArray(res) ? res : []);
      } catch {
        setSchemes([]);
      } finally {
        setLoading(false);
      }
    }
    loadSchemes();
  }, []);

  const categories = ['All', ...new Set(schemes.map(s => s.category).filter(Boolean))];

  const filteredSchemes = filter === 'All' 
    ? schemes 
    : schemes.filter(s => s.category === filter);

  return (
    <div>
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
            Tamil Nadu Government Welfare Schemes
          </h1>
          <div className="card-subtitle">
            Apply online with instant AI document verification and direct benefit transfer
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/applicant-dashboard')}>
          ← My Dashboard
        </button>
      </div>

      {/* CATEGORY FILTER */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading welfare schemes...</div>
      ) : (
        <div className="grid grid-2" style={{ gap: 20 }}>
          {filteredSchemes.map(scheme => (
            <div
              key={scheme.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '20px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    {scheme.name}
                  </h3>
                  <span className="meta-chip" style={{ fontSize: 11, flexShrink: 0 }}>
                    {scheme.category}
                  </span>
                </div>

                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
                  {scheme.description}
                </p>

                <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Scheme Benefit:</span>
                    <strong style={{ color: 'var(--green-400)' }}>
                      ₹{Number(scheme.benefit_amount || 0).toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Eligibility Limit:</span>
                    <span>
                      {scheme.eligibility_criteria?.max_income ? `Income < ₹${Number(scheme.eligibility_criteria.max_income).toLocaleString('en-IN')}/yr` : 'Standard BPL / Income Criteria'}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  📋 <strong>Required Documents:</strong> Aadhaar ID, Income Certificate, Residence Proof, Bank Passbook
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px', fontWeight: 700 }}
                onClick={() => navigate(`/apply/${scheme.id}`)}
              >
                Apply for this Scheme →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
