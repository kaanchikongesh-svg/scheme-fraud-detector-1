import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

/**
 * Complete list of all 38 Tamil Nadu districts (2023).
 */
const TN_DISTRICTS = [
  { id: 1,  name: 'Ariyalur' },
  { id: 2,  name: 'Chengalpattu' },
  { id: 3,  name: 'Chennai' },
  { id: 4,  name: 'Coimbatore' },
  { id: 5,  name: 'Cuddalore' },
  { id: 6,  name: 'Dharmapuri' },
  { id: 7,  name: 'Dindigul' },
  { id: 8,  name: 'Erode' },
  { id: 9,  name: 'Kallakurichi' },
  { id: 10, name: 'Kancheepuram' },
  { id: 11, name: 'Kanyakumari' },
  { id: 12, name: 'Karur' },
  { id: 13, name: 'Krishnagiri' },
  { id: 14, name: 'Madurai' },
  { id: 15, name: 'Mayiladuthurai' },
  { id: 16, name: 'Nagapattinam' },
  { id: 17, name: 'Namakkal' },
  { id: 18, name: 'Nilgiris' },
  { id: 19, name: 'Perambalur' },
  { id: 20, name: 'Pudukkottai' },
  { id: 21, name: 'Ramanathapuram' },
  { id: 22, name: 'Ranipet' },
  { id: 23, name: 'Salem' },
  { id: 24, name: 'Sivaganga' },
  { id: 25, name: 'Tenkasi' },
  { id: 26, name: 'Thanjavur' },
  { id: 27, name: 'Theni' },
  { id: 28, name: 'Thoothukudi' },
  { id: 29, name: 'Tiruchirappalli' },
  { id: 30, name: 'Tirunelveli' },
  { id: 31, name: 'Tirupathur' },
  { id: 32, name: 'Tiruppur' },
  { id: 33, name: 'Tiruvallur' },
  { id: 34, name: 'Tiruvannamalai' },
  { id: 35, name: 'Tiruvarur' },
  { id: 36, name: 'Vellore' },
  { id: 37, name: 'Viluppuram' },
  { id: 38, name: 'Virudhunagar' },
];

const MAX_DOB = new Date();
MAX_DOB.setFullYear(MAX_DOB.getFullYear() - 18); // must be at least 18 years old
const MIN_DOB = new Date('1900-01-01');

function extractErrorMessage(err) {
  /**
   * Safely extract a human-readable message from any thrown error.
   * Handles: string, Error object, [object Object] safely.
   */
  if (!err) return 'An unexpected error occurred. Please try again.';
  if (typeof err === 'string') return err;
  if (typeof err.message === 'string' && err.message && err.message !== '[object Object]') {
    return err.message;
  }
  return 'An unexpected error occurred. Please try again.';
}

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const submitLock = useRef(false); // prevents double-submit

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    mobile: '',
    dob: '',
    district_id: 3, // default Chennai
    gender: 'female',
    annual_income: '',
    address: '',
    aadhaar_number: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear the field-level error as user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
    setGlobalError('');
  }

  function validate() {
    const errors = {};
    const { name, email, password, confirm_password, mobile, dob, address, annual_income } = formData;

    // Full name
    if (!name.trim()) {
      errors.name = 'Full name is required.';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    } else if (name.trim().length > 100) {
      errors.name = 'Name must be under 100 characters.';
    } else if (!/^[a-zA-Z\u0B80-\u0BFF\s.'-]+$/.test(name.trim())) {
      errors.name = 'Name contains invalid characters.';
    }

    // Email
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    // Password
    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      errors.password = 'Password must contain both letters and numbers.';
    }

    // Confirm password
    if (!confirm_password) {
      errors.confirm_password = 'Please confirm your password.';
    } else if (password !== confirm_password) {
      errors.confirm_password = 'Passwords do not match.';
    }

    // Mobile
    if (!mobile.trim()) {
      errors.mobile = 'Mobile number is required.';
    } else if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
      errors.mobile = 'Enter a valid 10-digit Indian mobile number (starts with 6–9).';
    }

    // Date of birth
    if (!dob) {
      errors.dob = 'Date of birth is required.';
    } else {
      const dobDate = new Date(dob);
      if (isNaN(dobDate.getTime())) {
        errors.dob = 'Please enter a valid date.';
      } else if (dobDate > MAX_DOB) {
        errors.dob = 'You must be at least 18 years old to apply.';
      } else if (dobDate < MIN_DOB) {
        errors.dob = 'Please enter a valid date of birth.';
      }
    }

    // Address
    if (!address.trim()) {
      errors.address = 'Residential address is required.';
    } else if (address.trim().length < 10) {
      errors.address = 'Please enter your full address (at least 10 characters).';
    } else if (address.trim().length > 300) {
      errors.address = 'Address must be under 300 characters.';
    }

    // Annual income (optional but must be non-negative if provided)
    if (annual_income !== '' && annual_income !== undefined) {
      const income = parseFloat(annual_income);
      if (isNaN(income)) {
        errors.annual_income = 'Annual income must be a number.';
      } else if (income < 0) {
        errors.annual_income = 'Annual income cannot be negative.';
      } else if (income > 100000000) {
        errors.annual_income = 'Please enter a realistic annual income.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGlobalError('');
    setSuccessMsg('');

    // Client-side validation — do NOT call API if it fails
    if (!validate()) return;

    // Prevent duplicate submissions
    if (submitLock.current || loading) return;
    submitLock.current = true;
    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirm_password: formData.confirm_password,
        mobile: formData.mobile.trim(),
        dob: formData.dob || undefined,
        district_id: parseInt(formData.district_id) || 3,
        gender: formData.gender,
        annual_income: formData.annual_income !== '' ? parseFloat(formData.annual_income) : 0,
        address: formData.address.trim(),
        // Only include aadhaar if provided — never log it
        ...(formData.aadhaar_number.trim() ? { aadhaar_number: formData.aadhaar_number.trim() } : {}),
      };

      const result = await register(payload);

      setSuccessMsg('Account created successfully. Welcome to the Tamil Nadu Citizen Welfare Portal.');

      // Redirect after brief success display
      setTimeout(() => {
        const role = result?.user?.role;
        if (role === 'citizen') {
          navigate('/applicant-dashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 1500);

    } catch (err) {
      const message = extractErrorMessage(err);
      const code = err?.code;

      if (code === 'DUPLICATE_EMAIL' || (message.toLowerCase().includes('email') && (message.toLowerCase().includes('already') || message.toLowerCase().includes('exists')))) {
        setGlobalError('An account with this email address already exists. Please sign in instead.');
        setFieldErrors(prev => ({ ...prev, email: 'This email is already registered.' }));
      } else if (message.toLowerCase().includes('mobile') && (message.toLowerCase().includes('registered') || message.toLowerCase().includes('exists'))) {
        setGlobalError('An account with this mobile number already exists.');
        setFieldErrors(prev => ({ ...prev, mobile: 'This mobile number is already registered.' }));
      } else if (message.toLowerCase().includes('password') && message.toLowerCase().includes('match')) {
        setGlobalError('Passwords do not match.');
        setFieldErrors(prev => ({ ...prev, confirm_password: 'Passwords do not match.' }));
      } else if (code === 'DATABASE_ERROR' || message.toLowerCase().includes('database')) {
        setGlobalError('Unable to create the account because the database is unavailable. Please try again shortly.');
      } else if (code === 'BACKEND_UNAVAILABLE' || message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('networkerror') || message.toLowerCase().includes('timeout')) {
        setGlobalError('Backend API service is unavailable. Please verify the Python backend is running on port 8000.');
      } else {
        setGlobalError(message);
      }
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  }

  return (
    <div className="login-page">
      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div className="login-left">
        <div className="login-logo-area">
          <img src="/logo.svg" alt="SchemeSecure AI" style={{ width: 56, height: 56, marginBottom: 12, filter: 'drop-shadow(0 4px 14px rgba(37,99,235,0.5))' }} />
          <div className="login-logo-title">SchemeSecure AI</div>
          <div className="login-logo-sub">AI Government Scheme Fraud Detection & Verification System</div>


          <div className="login-floating-card" style={{ marginTop: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-400)', marginBottom: 8 }}>
              🛡️ Secure &amp; Verified Registration
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Apply directly for Tamil Nadu state welfare schemes. Your information is stored securely —
              passwords are hashed, Aadhaar is never stored in raw form, and PII is protected
              under applicable government data guidelines.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 32, maxWidth: 340, width: '100%' }}>
          {[
            ['📄', 'Scheme-specific required document checklist'],
            ['🤖', 'Instant AI document authenticity verification'],
            ['🔒', 'Zero PII leakage — AES-encrypted credential storage'],
            ['📊', 'Real-time application status tracking'],
            ['🏛️', '38 Tamil Nadu districts · 6+ welfare schemes'],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────────── */}
      <div className="login-right">
        <div className="login-box" style={{ maxWidth: 520 }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              Applicant Registration
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Create a verified account to apply for Tamil Nadu government welfare schemes
            </p>
          </div>

          {/* Global error — never renders [object Object] */}
          {globalError && (
            <div
              className="alert-red"
              style={{ marginBottom: 16 }}
              role="alert"
              aria-live="polite"
            >
              ⚠️ {typeof globalError === 'string' ? globalError : 'An error occurred. Please try again.'}
            </div>
          )}

          {/* Success banner */}
          {successMsg && (
            <div
              className="alert-green"
              style={{ marginBottom: 16 }}
              role="status"
              aria-live="polite"
            >
              ✅ {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* ── Row 1: Name + Email ── */}
            <div className="grid grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="reg-name">Full Name *</label>
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="e.g. K. Selvi"
                  className={`form-input${fieldErrors.name ? ' input-error' : ''}`}
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                  maxLength={100}
                />
                {fieldErrors.name && (
                  <div className="field-error" style={{ fontSize: 11, color: 'var(--red-400)', marginTop: 4 }}>
                    {fieldErrors.name}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="reg-email">Email Address *</label>
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  className={`form-input${fieldErrors.email ? ' input-error' : ''}`}
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
                {fieldErrors.email && (
                  <div className="field-error" style={{ fontSize: 11, color: 'var(--red-400)', marginTop: 4 }}>
                    {fieldErrors.email}
                  </div>
                )}
              </div>
            </div>

            {/* ── Row 2: Password + Confirm ── */}
            <div className="grid grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="reg-password">Password *</label>
                <input
                  id="reg-password"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="Min 8 chars, letters + numbers"
                  className={`form-input${fieldErrors.password ? ' input-error' : ''}`}
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                {fieldErrors.password && (
                  <div className="field-error" style={{ fontSize: 11, color: 'var(--red-400)', marginTop: 4 }}>
                    {fieldErrors.password}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="reg-confirm-password">Confirm Password *</label>
                <input
                  id="reg-confirm-password"
                  type="password"
                  name="confirm_password"
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  className={`form-input${fieldErrors.confirm_password ? ' input-error' : ''}`}
                  value={formData.confirm_password}
                  onChange={handleChange}
                  disabled={loading}
                />
                {fieldErrors.confirm_password && (
                  <div className="field-error" style={{ fontSize: 11, color: 'var(--red-400)', marginTop: 4 }}>
                    {fieldErrors.confirm_password}
                  </div>
                )}
              </div>
            </div>

            {/* ── Row 3: Mobile + DOB ── */}
            <div className="grid grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="reg-mobile">Mobile Number *</label>
                <input
                  id="reg-mobile"
                  type="tel"
                  name="mobile"
                  autoComplete="tel"
                  placeholder="10-digit Indian mobile"
                  className={`form-input${fieldErrors.mobile ? ' input-error' : ''}`}
                  value={formData.mobile}
                  onChange={handleChange}
                  disabled={loading}
                  maxLength={10}
                />
                {fieldErrors.mobile && (
                  <div className="field-error" style={{ fontSize: 11, color: 'var(--red-400)', marginTop: 4 }}>
                    {fieldErrors.mobile}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="reg-dob">Date of Birth *</label>
                <input
                  id="reg-dob"
                  type="date"
                  name="dob"
                  className={`form-input${fieldErrors.dob ? ' input-error' : ''}`}
                  value={formData.dob}
                  onChange={handleChange}
                  disabled={loading}
                  max={MAX_DOB.toISOString().split('T')[0]}
                  min="1900-01-01"
                />
                {fieldErrors.dob && (
                  <div className="field-error" style={{ fontSize: 11, color: 'var(--red-400)', marginTop: 4 }}>
                    {fieldErrors.dob}
                  </div>
                )}
              </div>
            </div>

            {/* ── Row 4: District + Gender + Income ── */}
            <div className="grid grid-3" style={{ gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="reg-district">District *</label>
                <select
                  id="reg-district"
                  name="district_id"
                  className="form-input"
                  value={formData.district_id}
                  onChange={handleChange}
                  disabled={loading}
                >
                  {TN_DISTRICTS.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="reg-gender">Gender</label>
                <select
                  id="reg-gender"
                  name="gender"
                  className="form-input"
                  value={formData.gender}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="transgender">Transgender</option>
                  <option value="other">Prefer not to say</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="reg-income">Annual Income (₹)</label>
                <input
                  id="reg-income"
                  type="number"
                  name="annual_income"
                  placeholder="e.g. 120000"
                  className={`form-input${fieldErrors.annual_income ? ' input-error' : ''}`}
                  value={formData.annual_income}
                  onChange={handleChange}
                  disabled={loading}
                  min="0"
                  max="100000000"
                  step="1000"
                />
                {fieldErrors.annual_income && (
                  <div className="field-error" style={{ fontSize: 11, color: 'var(--red-400)', marginTop: 4 }}>
                    {fieldErrors.annual_income}
                  </div>
                )}
              </div>
            </div>

            {/* ── Address ── */}
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" htmlFor="reg-address">Residential Address *</label>
              <input
                id="reg-address"
                type="text"
                name="address"
                autoComplete="street-address"
                placeholder="Street, Village / Town, District, Tamil Nadu"
                className={`form-input${fieldErrors.address ? ' input-error' : ''}`}
                value={formData.address}
                onChange={handleChange}
                disabled={loading}
                maxLength={300}
              />
              {fieldErrors.address && (
                <div className="field-error" style={{ fontSize: 11, color: 'var(--red-400)', marginTop: 4 }}>
                  {fieldErrors.address}
                </div>
              )}
            </div>

            {/* ── Aadhaar (optional) ── */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" htmlFor="reg-aadhaar">
                Aadhaar Virtual ID / Reference (Optional)
              </label>
              <input
                id="reg-aadhaar"
                type="text"
                name="aadhaar_number"
                placeholder="Last 4 digits or Virtual ID — hashed securely, never stored raw"
                className="form-input"
                value={formData.aadhaar_number}
                onChange={handleChange}
                disabled={loading}
                autoComplete="off"
                maxLength={16}
              />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                Optional. Only a cryptographic hash is stored — the raw value is never persisted or logged.
              </div>
            </div>

            {/* ── Submit ── */}
            <button
              id="reg-submit"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px', fontWeight: 700, fontSize: 14 }}
              disabled={loading || !!successMsg}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                  Creating Account...
                </span>
              ) : successMsg ? (
                'Account Created ✓'
              ) : (
                'Register & Enter Applicant Portal →'
              )}
            </button>
          </form>

          {/* Security note */}
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              background: 'rgba(59,130,246,0.06)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(59,130,246,0.15)',
              fontSize: 11,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            🔒 Your password is hashed with bcrypt before storage. Sensitive fields (Aadhaar, mobile)
            are SHA-256 hashed and never returned in API responses.
          </div>

          {/* Sign in link */}
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link
              to="/login"
              style={{ color: 'var(--blue-400)', fontWeight: 600, textDecoration: 'none' }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
