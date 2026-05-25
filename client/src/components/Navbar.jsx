import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAuthenticated, isProfessor } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav style={{
      background: '#1d4ed8',
      padding: '0 24px',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <Link to="/" style={{ color: '#fff', fontWeight: 700, fontSize: '18px', textDecoration: 'none' }}>
        QR Attendance
      </Link>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {isAuthenticated && isProfessor && (
          <>
            <Link to="/professor/dashboard" style={{ color: '#bfdbfe', textDecoration: 'none', fontSize: '14px' }}>
              Dashboard
            </Link>
            <Link to="/professor/history" style={{ color: '#bfdbfe', textDecoration: 'none', fontSize: '14px' }}>
              History
            </Link>
          </>
        )}
        {isAuthenticated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#e0e7ff', fontSize: '14px' }}>{user?.name || user?.email}</span>
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
