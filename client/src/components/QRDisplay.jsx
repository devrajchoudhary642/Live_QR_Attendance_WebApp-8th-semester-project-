import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const QR_REFRESH_INTERVAL = 9000;

export default function QRDisplay({ sessionId }) {
  const [currentToken, setCurrentToken] = useState(null);
  const [countdown, setCountdown] = useState(9);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  async function fetchNewToken() {
    try {
      const { data } = await api.post(`/session/refresh-token/${sessionId}`);
      setCurrentToken(data.token);
      setCountdown(9);
    } catch (err) {
      toast.error('Failed to refresh QR code');
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchNewToken().finally(() => setLoading(false));

    refreshTimerRef.current = setInterval(fetchNewToken, QR_REFRESH_INTERVAL);

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 9 : prev - 1));
    }, 1000);

    return () => {
      clearInterval(refreshTimerRef.current);
      clearInterval(countdownTimerRef.current);
    };
  }, [sessionId]);

  const clientBase = import.meta.env.VITE_CLIENT_URL || window.location.origin;
  const attendanceUrl = currentToken
    ? `${clientBase}/attend?token=${currentToken}`
    : '';

  const progressPercent = (countdown / 9) * 100;
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference * (1 - progressPercent / 100);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Generating QR code...</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '24px',
      padding: '32px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        border: '2px solid #e5e7eb',
      }}>
        {currentToken ? (
          <QRCodeSVG
            value={attendanceUrl}
            size={280}
            level="H"
            includeMargin={false}
          />
        ) : (
          <div style={{ width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#9ca3af' }}>Loading...</span>
          </div>
        )}
      </div>

      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="44" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke={countdown <= 3 ? '#ef4444' : '#1d4ed8'}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.3s' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          fontWeight: '700',
          color: countdown <= 3 ? '#ef4444' : '#1d4ed8',
        }}>
          {countdown}
        </div>
      </div>

      <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', margin: 0 }}>
        QR code refreshes every 9 seconds. Ask students to scan the current code.
      </p>
    </div>
  );
}
