import { useState, useRef, useEffect } from 'react';

export default function OtpForm({ onSubmit, loading, label = 'Enter OTP' }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(index, value) {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length === 6) onSubmit(otp);
  }

  const inputStyle = {
    width: '48px',
    height: '56px',
    fontSize: '24px',
    fontWeight: '700',
    textAlign: 'center',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    color: '#111827',
    transition: 'border-color 0.2s',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <p style={{ margin: 0, color: '#374151', fontWeight: '500' }}>{label}</p>
      <div style={{ display: 'flex', gap: '8px' }} onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            style={{
              ...inputStyle,
              borderColor: d ? '#1d4ed8' : '#d1d5db',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#1d4ed8')}
            onBlur={(e) => (e.target.style.borderColor = digits[i] ? '#1d4ed8' : '#d1d5db')}
            autoComplete="one-time-code"
          />
        ))}
      </div>
      <button
        type="submit"
        disabled={loading || digits.join('').length < 6}
        style={{
          width: '100%',
          padding: '14px',
          background: digits.join('').length < 6 ? '#9ca3af' : '#1d4ed8',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: digits.join('').length < 6 ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {loading ? 'Verifying...' : 'Verify OTP'}
      </button>
    </form>
  );
}
