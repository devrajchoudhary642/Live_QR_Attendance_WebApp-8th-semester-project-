import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import OtpForm from '../components/OtpForm';

const STEP = { LOADING: 'loading', EMAIL: 'email', OTP: 'otp', SUCCESS: 'success', ERROR: 'error' };

export default function StudentAttendance() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [step, setStep] = useState(STEP.LOADING);
  const [sessionEntryToken, setSessionEntryToken] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [studentName, setStudentName] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef(null);
  const emailInputRef = useRef(null);

  useEffect(() => {
    if (!token) {
      setErrorMsg('Invalid QR code. Please scan a valid attendance QR code.');
      setStep(STEP.ERROR);
      return;
    }

    api.post('/auth/exchange-scan-token', { scanToken: token })
      .then(({ data }) => {
        setSessionEntryToken(data.sessionEntryToken);
        setStep(STEP.EMAIL);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'QR code expired, please scan the current code';
        setErrorMsg(msg);
        setStep(STEP.ERROR);
      });
  }, []);

  useEffect(() => {
    if (step === STEP.EMAIL) {
      emailInputRef.current?.focus();
    }
  }, [step]);

  useEffect(() => {
    return () => clearInterval(cooldownRef.current);
  }, []);

  function startResendCooldown() {
    setResendCooldown(30);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: email.trim(), name: name.trim(), sessionToken: sessionEntryToken });
      setStep(STEP.OTP);
      startResendCooldown();
      toast.success('OTP sent to your email!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP';
      if (err.response?.status === 409) {
        setStep(STEP.SUCCESS);
        setStudentName('');
        toast.success('You already marked attendance for this session!');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: email.trim(), sessionToken: sessionEntryToken });
      startResendCooldown();
      toast.success('New OTP sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(otp) {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', {
        email: email.trim(),
        otp,
        sessionToken: sessionEntryToken,
      });
      setStudentName(data.user?.name || email);
      setStep(STEP.SUCCESS);
      toast.success('Attendance marked!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed';
      if (err.response?.status === 409) {
        setStep(STEP.SUCCESS);
        setStudentName('');
        toast.success('Attendance already recorded for this session.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageWrapper>
      {step === STEP.LOADING && (
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTopColor: '#1d4ed8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ color: '#6b7280', fontSize: '15px', margin: 0 }}>Validating QR code...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}

      {step === STEP.EMAIL && (
        <div style={cardStyle}>
          <div style={headerStyle}>
            <span style={{ fontSize: '40px' }}>📲</span>
            <h1 style={titleStyle}>Mark Attendance</h1>
            <p style={subtitleStyle}>Enter your college email to receive an OTP</p>
          </div>
          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name (optional)"
                style={inputStyle}
                autoComplete="name"
              />
            </div>
            <div>
              <label style={labelStyle}>College Email</label>
              <input
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@college.edu"
                style={inputStyle}
                autoComplete="email"
                required
              />
            </div>
            <button type="submit" disabled={loading} style={btnPrimary(loading)}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        </div>
      )}

      {step === STEP.OTP && (
        <div style={cardStyle}>
          <div style={headerStyle}>
            <span style={{ fontSize: '40px' }}>🔐</span>
            <h1 style={titleStyle}>Verify OTP</h1>
            <p style={subtitleStyle}>
              Enter the 6-digit code sent to<br />
              <strong>{email}</strong>
            </p>
          </div>
          <OtpForm onSubmit={handleOtpSubmit} loading={loading} label="Enter 6-digit OTP" />
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || loading}
              style={{
                background: 'none',
                border: 'none',
                color: resendCooldown > 0 ? '#9ca3af' : '#1d4ed8',
                cursor: resendCooldown > 0 ? 'default' : 'pointer',
                fontSize: '14px',
                padding: '8px',
              }}
            >
              {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </div>
          <button
            onClick={() => setStep(STEP.EMAIL)}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '13px', display: 'block', margin: '4px auto 0', padding: '8px' }}
          >
            ← Change email
          </button>
        </div>
      )}

      {step === STEP.SUCCESS && (
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: '72px',
              height: '72px',
              background: '#dcfce7',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '36px',
            }}>
              ✅
            </div>
            <h1 style={{ ...titleStyle, color: '#16a34a' }}>Attendance Marked!</h1>
            {studentName && (
              <p style={{ fontSize: '18px', fontWeight: '600', color: '#374151', margin: '8px 0 4px' }}>
                {studentName}
              </p>
            )}
            <p style={{ ...subtitleStyle, marginTop: '8px' }}>
              Your attendance has been recorded successfully. You may close this page.
            </p>
          </div>
        </div>
      )}

      {step === STEP.ERROR && (
        <ErrorCard message={errorMsg || 'Something went wrong. Please try again.'} />
      )}
    </PageWrapper>
  );
}

function PageWrapper({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>{children}</div>
    </div>
  );
}

function ErrorCard({ message }) {
  return (
    <div style={cardStyle}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <span style={{ fontSize: '48px' }}>⚠️</span>
        <h2 style={{ margin: '12px 0 8px', fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>
          Cannot Mark Attendance
        </h2>
        <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.5' }}>{message}</p>
      </div>
    </div>
  );
}

const cardStyle = {
  background: '#fff',
  borderRadius: '16px',
  padding: '32px 28px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  width: '100%',
  boxSizing: 'border-box',
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '28px',
};

const titleStyle = {
  margin: '8px 0 4px',
  fontSize: '24px',
  fontWeight: '700',
  color: '#111827',
};

const subtitleStyle = {
  margin: 0,
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
};

const labelStyle = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '14px',
  fontWeight: '500',
  color: '#374151',
};

const inputStyle = {
  width: '100%',
  padding: '14px',
  border: '1.5px solid #d1d5db',
  borderRadius: '10px',
  fontSize: '16px',
  outline: 'none',
  boxSizing: 'border-box',
  color: '#111827',
  minHeight: '48px',
};

const btnPrimary = (disabled) => ({
  padding: '15px',
  background: disabled ? '#9ca3af' : '#1d4ed8',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: disabled ? 'not-allowed' : 'pointer',
  minHeight: '52px',
  transition: 'background 0.2s',
});
