import React, { useRef, useEffect } from 'react';

const Support = () => {
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
        vantaEffect.current = window.VANTA.GLOBE({
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
          size: 0.90
        });
      }
    };

    initVanta();
    const timer = setTimeout(initVanta, 500);

    return () => {
      clearTimeout(timer);
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '75vh', borderRadius: '24px', overflow: 'hidden' }}>
      <div ref={vantaRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '75vh', padding: '2rem' }}>
        <div style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(37,99,235,0.18)',
          borderRadius: '24px',
          padding: '3rem',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(37,99,235,0.1)',
          textAlign: 'center'
        }}>
          <h1 style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, fontSize: '2rem', color: '#1E3A8A', marginBottom: '1rem' }}>
            Support & Contacts
          </h1>
          <p style={{ color: '#475569', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: 1.6 }}>
            Need help with UrbanEye? Reach out to our core team for technical platform assistance.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '54px', height: '54px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 'bold', fontSize: '1.4rem' }}>
                H
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: '1.15rem' }}>Hitesh</h3>
                <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>IIT2025058</p>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '54px', height: '54px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 'bold', fontSize: '1.4rem' }}>
                P
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: '1.15rem' }}>Pranav</h3>
                <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>IIT2025021</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
