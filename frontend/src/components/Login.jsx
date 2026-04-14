import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

/* ─────────────────────────────────────────────
   Vanta NET is loaded from CDN at runtime.
   Make sure you also have Three.js available,
   e.g. add to your index.html <head>:
     <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
     <script src="https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.net.min.js"></script>
   Or install via npm:
     npm install three vanta
   and import { NET } from 'vanta/dist/vanta.net.min'
───────────────────────────────────────────── */

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  useEffect(() => {
    const initVanta = () => {
      if (
        vantaRef.current &&
        !vantaEffect.current &&
        window.VANTA &&
        window.THREE
      ) {
        vantaEffect.current = window.VANTA.NET({
          el: vantaRef.current,
          THREE: window.THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 600,
          minWidth: 200,
          scale: 1.0,
          scaleMobile: 1.0,
          color: 0x2563eb,
          backgroundColor: 0xf0f6ff,
          points: 10,
          maxDistance: 22,
          spacing: 18,
          showDots: true,
        });
      }
    };

    // Attempt immediately (if scripts already loaded)
    initVanta();

    // Retry after a short delay in case scripts are still loading
    const timer = setTimeout(initVanta, 500);

    return () => {
      clearTimeout(timer);
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  // ── Original logic ──────────────────────────────────
  const handleSuccess = (credentialResponse) => {
    setError('');
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      console.log('Logged in user:', decoded);
      login({
        uid: decoded.sub,
        email: decoded.email,
        displayName: decoded.name,
        photoURL: decoded.picture,
      });
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Failed to parse Google login token. Please try again.');
    }
  };

  const handleFailure = () => {
    setError('Failed to log in with Google. Please try again.');
  };

  const handleAnonymousLogin = () => {
    login({
      uid: `anonymous-${Math.random().toString(36).substr(2, 9)}`,
      email: null,
      displayName: 'Anonymous User',
      photoURL: null,
      isAnonymous: true,
    });
    navigate('/');
  };
  // ────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');

        .ue-root {
          position: relative;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
          overflow: hidden;
        }
        .ue-vanta-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
        }
        .ue-layout {
          position: relative;
          z-index: 1;
          display: flex;
          min-height: 100vh;
          align-items: stretch;
        }
        /* ── Left Column ── */
        .ue-left {
          flex: 1.15;
          padding: 3rem 3rem 2.5rem;
          display: flex;
          flex-direction: column;
        }
        .ue-logo-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 2rem;
        }
        .ue-logo-text {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 3.5px;
          color: #1E3A8A;
        }
        .ue-headline {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800;
          font-size: 2.25rem;
          line-height: 1.2;
          color: #0F172A;
          margin: 0 0 0.75rem;
        }
        .ue-sub {
          font-size: 15px;
          color: #475569;
          line-height: 1.75;
          margin: 0 0 1.5rem;
          max-width: 380px;
        }
        .ue-features {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .ue-feat {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          background: rgba(255,255,255,0.72);
          border: 0.5px solid rgba(37,99,235,0.15);
          border-radius: 14px;
          padding: 16px 18px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ue-feat:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(37,99,235,0.1);
        }
        .ue-feat-highlight {
          background: linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.02));
          border: 1px solid rgba(239,68,68,0.2);
        }
        .ue-feat-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #EFF6FF;
          border: 0.5px solid #BFDBFE;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ue-feat-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          font-size: 14px;
          color: #1E3A8A;
          margin: 0 0 5px;
        }
        .ue-feat-desc {
          font-size: 13px;
          color: #475569;
          line-height: 1.6;
          margin: 0;
        }
        .ue-safety-callout {
          margin-top: 1.5rem;
          background: linear-gradient(135deg, rgba(220,38,38,0.06) 0%, rgba(37,99,235,0.06) 100%);
          border: 1px solid rgba(220,38,38,0.15);
          border-radius: 14px;
          padding: 18px 20px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .ue-safety-callout-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800;
          font-size: 13px;
          color: #991B1B;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin: 0 0 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ue-safety-callout-text {
          font-size: 13.5px;
          color: #374151;
          line-height: 1.65;
          margin: 0;
        }
        .ue-biz { margin-top: 1.2rem; }
        .ue-biz-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          letter-spacing: 1.5px;
          color: #2563EB;
          text-transform: uppercase;
          margin: 0 0 0.6rem;
          font-weight: 700;
        }
        .ue-biz-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }
        .ue-biz-chip {
          background: rgba(255,255,255,0.7);
          border: 0.5px solid rgba(37,99,235,0.12);
          border-radius: 10px;
          padding: 9px 11px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .ue-biz-chip-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12.5px;
          font-weight: 700;
          color: #1E40AF;
          margin: 0 0 3px;
        }
        .ue-biz-chip-desc {
          font-size: 11.5px;
          color: #64748B;
          line-height: 1.45;
          margin: 0;
        }

        /* ── Right Column ── */
        .ue-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 2.5rem;
        }
        .ue-card {
          width: 100%;
          max-width: 400px;
          background: rgba(255,255,255,0.9);
          border: 0.5px solid rgba(37,99,235,0.18);
          border-radius: 20px;
          padding: 2.2rem 2rem;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 8px 40px rgba(37,99,235,0.08);
        }
        .ue-right-head {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800;
          font-size: 1.5rem;
          color: #0F172A;
          margin: 0 0 8px;
        }
        .ue-right-sub {
          font-size: 14px;
          color: #475569;
          margin: 0 0 1.5rem;
          line-height: 1.7;
        }
        .ue-error-box {
          background: #FEF2F2;
          border: 0.5px solid #FECACA;
          border-radius: 10px;
          padding: 10px 13px;
          margin-bottom: 1rem;
          font-size: 12.5px;
          color: #DC2626;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .ue-google-wrap {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .ue-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 1rem 0;
        }
        .ue-div-line {
          flex: 1;
          height: 0.5px;
          background: #CBD5E1;
        }
        .ue-div-text {
          font-size: 12px;
          color: #94A3B8;
        }
        .ue-anon-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          background: white;
          border: 1px solid #CBD5E1;
          border-radius: 9999px;
          padding: 12px 0;
          font-size: 14px;
          font-weight: 700;
          color: #374151;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: background 0.15s;
        }
        .ue-anon-btn:hover { background: #F8FAFC; }
        .ue-anon-btn:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.35);
        }
        .ue-admin-link {
          text-align: center;
          margin-top: 0.9rem;
          font-size: 12px;
          color: #64748B;
        }
        .ue-admin-link a {
          color: #2563EB;
          text-decoration: none;
          font-weight: 500;
        }
        .ue-admin-link a:hover { text-decoration: underline; }
        .ue-trust {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 1.2rem;
          flex-wrap: wrap;
        }
        .ue-trust-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10.5px;
          color: #64748B;
        }
        .ue-terms {
          text-align: center;
          font-size: 11px;
          color: #94A3B8;
          margin-top: 1rem;
          line-height: 1.5;
        }
        .ue-terms a { color: #2563EB; text-decoration: none; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .ue-layout { flex-direction: column; }
          .ue-left { padding: 2rem 1.5rem 1.5rem; }
          .ue-right { padding: 1.5rem; }
          .ue-headline { font-size: 1.5rem; }
        }
      `}</style>

      <div className="ue-root">
        {/* Vanta NET background */}
        <div ref={vantaRef} className="ue-vanta-bg" />

        <div className="ue-layout">
          {/* ── Left: Value Proposition ── */}
          <div className="ue-left">
            {/* Brand name only — no logo icon */}
            <div className="ue-logo-wrap">
              <span className="ue-logo-text">URBANEYE</span>
            </div>

            <h1 className="ue-headline">Your community,<br />re-imagined.</h1>
            <p className="ue-sub">
              Secure your city's infrastructure and stay informed. Join a platform built on
              trust, transparency, and real-time civic intelligence.
            </p>
            {/* Safety Callout - replaces stats */}
            <div className="ue-safety-callout">
              <p className="ue-safety-callout-title">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L2 4v4c0 3 2 5.5 6 6.5 4-1 6-3.5 6-6.5V4L8 1z" stroke="#DC2626" strokeWidth="1.3" />
                  <path d="M6 8l1.5 1.5L10 6" stroke="#DC2626" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Beyond civic reporting
              </p>
              <p className="ue-safety-callout-text">
                UrbanEye is a complete urban safety &amp; surveillance ecosystem — combining citizen
                reports, AI triage, and live CCTV violence detection into a single command center
                for smarter, safer cities.
              </p>
            </div>
            <br></br>


            {/* Feature Pillars */}
            <div className="ue-features">
              {/* ★ Lead feature: CCTV Violence Detection */}
              <div className="ue-feat ue-feat-highlight">
                <div className="ue-feat-icon" style={{ background: '#FEF2F2', border: '0.5px solid #FECACA' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="#DC2626" strokeWidth="1.4" />
                    <path d="M14 7l4-2v7l-4-2V7z" stroke="#DC2626" strokeWidth="1.3" fill="none" />
                    <circle cx="8" cy="8.5" r="2" stroke="#EF4444" strokeWidth="1.2" />
                    <path d="M5 15h10" stroke="#FCA5A5" strokeWidth="1" strokeLinecap="round" />
                    <circle cx="16" cy="5" r="1.5" fill="#EF4444" />
                  </svg>
                </div>
                <div>
                  <p className="ue-feat-title" style={{ color: '#991B1B' }}>Live CCTV violence detection</p>
                  <p className="ue-feat-desc">
                    Not just a civic issue reporter — UrbanEye is a real-time safety &amp;
                    surveillance system with AI-powered live CCTV analysis that detects
                    violence, weapons, and anomalies automatically.
                  </p>
                </div>
              </div>

              <div className="ue-feat">
                <div className="ue-feat-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="8" r="4" stroke="#2563EB" strokeWidth="1.4" />
                    <path d="M6 8h8M10 4v8" stroke="#60A5FA" strokeWidth="1.2" />
                    <rect x="13.5" y="13" width="5" height="5" rx="1" stroke="#2563EB" strokeWidth="1.2" />
                    <path d="M14.8 15.5h2.4M16 14.2v2.6" stroke="#60A5FA" strokeWidth="1" />
                  </svg>
                </div>
                <div>
                  <p className="ue-feat-title">Instant AI-powered sorting</p>
                  <p className="ue-feat-desc">
                    AI-analyzed reports get prioritized and routed to the right teams in
                    seconds, not hours — Gemini-grade classification at civic scale.
                  </p>
                </div>
              </div>

              <div className="ue-feat">
                <div className="ue-feat-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2C7.24 2 5 4.24 5 7c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" stroke="#2563EB" strokeWidth="1.4" />
                    <rect x="7" y="11" width="6" height="4" rx="1" stroke="#60A5FA" strokeWidth="1.2" />
                    <path d="M8.5 11V9.5h3V11" stroke="#60A5FA" strokeWidth="1.1" />
                  </svg>
                </div>
                <div>
                  <p className="ue-feat-title">Transparent local updates</p>
                  <p className="ue-feat-desc">
                    Follow reports in your exact neighborhood. Get real-time alerts when
                    local problems are resolved by your city team.
                  </p>
                </div>
              </div>

              <div className="ue-feat">
                <div className="ue-feat-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2L4 5v5c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V5L10 2z" stroke="#2563EB" strokeWidth="1.4" />
                    <circle cx="10" cy="10" r="2.5" stroke="#60A5FA" strokeWidth="1.2" />
                    <path d="M7 14c0-1.66 1.34-3 3-3s3 1.34 3 3" stroke="#60A5FA" strokeWidth="1.1" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p className="ue-feat-title">Trusted civic engagement</p>
                  <p className="ue-feat-desc">
                    Connect directly with official city teams. Your Karma Matrix rank
                    reflects your real-world contribution to the community.
                  </p>
                </div>
              </div>
            </div>

            {/* Platform Capabilities */}
            <div className="ue-biz">
              <p className="ue-biz-label">Platform capabilities</p>
              <div className="ue-biz-grid">
                <div className="ue-biz-chip">
                  <p className="ue-biz-chip-title">Karma Matrix</p>
                  <p className="ue-biz-chip-desc">Gamified civic tiers — Novice to Champion</p>
                </div>
                <div className="ue-biz-chip">
                  <p className="ue-biz-chip-title">AI Safety Monitor</p>
                  <p className="ue-biz-chip-desc">Gemini-powered anomaly detection</p>
                </div>
                <div className="ue-biz-chip">
                  <p className="ue-biz-chip-title">Geospatial Triage</p>
                  <p className="ue-biz-chip-desc">Auto-routing to nearest authority</p>
                </div>
                <div className="ue-biz-chip">
                  <p className="ue-biz-chip-title">KPI Dashboard</p>
                  <p className="ue-biz-chip-desc">Real-time municipal command center</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Login Card ── */}
          <div className="ue-right">
            <div className="ue-card">
              <h2 className="ue-right-head">Welcome to UrbanEye</h2>
              <p className="ue-right-sub">
                Use your official city account or community Google account to get started
                securely.
              </p>

              {/* Error message */}
              {error && (
                <div className="ue-error-box">
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0 }}>{error}</p>
                </div>
              )}

              {/* Google OAuth — original component, original props */}
              <div className="ue-google-wrap">
                <GoogleLogin
                  onSuccess={handleSuccess}
                  onError={handleFailure}
                  useOneTap
                  theme="outline"
                  size="large"
                  shape="pill"
                  width="100%"
                />
              </div>

              <div className="ue-divider">
                <div className="ue-div-line" />
                <span className="ue-div-text">or</span>
                <div className="ue-div-line" />
              </div>

              {/* Anonymous login — original handler */}
              <button className="ue-anon-btn" onClick={handleAnonymousLogin}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="6.5" r="3.2" stroke="#6B7280" strokeWidth="1.3" />
                  <path
                    d="M2 17c0-3.866 3.134-6 7-6s7 2.134 7 6"
                    stroke="#6B7280"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
                Continue Anonymously
              </button>

              {/* Admin link */}
              <div className="ue-admin-link">
                Official city employee?{' '}
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Log in here
                </a>
              </div>

              {/* Trust badges */}
              <div className="ue-trust">
                <div className="ue-trust-item">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1L2 3v3c0 2.5 1.7 4.5 4 5 2.3-.5 4-2.5 4-5V3L6 1z" stroke="#64748B" strokeWidth="1" />
                  </svg>
                  End-to-end encrypted
                </div>
                <div className="ue-trust-item">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="2" y="5" width="8" height="6" rx="1" stroke="#64748B" strokeWidth="1" />
                    <path d="M4 5V3.5a2 2 0 114 0V5" stroke="#64748B" strokeWidth="1" />
                  </svg>
                  OAuth 2.0 secured
                </div>
                <div className="ue-trust-item">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="4.5" stroke="#64748B" strokeWidth="1" />
                    <path d="M4 6l1.5 1.5L8 4" stroke="#64748B" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                  GDPR compliant
                </div>
              </div>

              <p className="ue-terms">
                By continuing, you agree to our{' '}
                <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
