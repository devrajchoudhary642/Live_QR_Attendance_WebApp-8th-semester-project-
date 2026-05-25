import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import QRDisplay from '../components/QRDisplay';
import AttendanceTable from '../components/AttendanceTable';
import { useAuth } from '../context/AuthContext';

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeSession, setActiveSession] = useState(location.state?.resumeSession || null);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [ending, setEnding] = useState(false);

  async function handleCreateSession(e) {
    e.preventDefault();
    if (!subjectCode.trim() || !subjectName.trim()) {
      toast.error('Subject code and name are required');
      return;
    }
    setCreating(true);
    try {
      const { data } = await api.post('/session/create', { subjectCode, subjectName });
      setActiveSession({ sessionId: data.sessionId, subjectCode, subjectName });
      setAttendanceCount(0);
      toast.success('Session started!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create session');
    } finally {
      setCreating(false);
    }
  }


  async function handleEndSession() {
    if (!activeSession) return;
    setEnding(true);
    try {
      await api.patch(`/session/${activeSession.sessionId}/end`);
      toast.success('Session ended');
      setActiveSession(null);
      setSubjectCode('');
      setSubjectName('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end session');
    } finally {
      setEnding(false);
    }
  }

  async function handleExportCsv() {
    if (!activeSession) return;
    try {
      const response = await api.get(`/session/${activeSession.sessionId}/export-csv`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${activeSession.subjectCode}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: '700', color: '#111827' }}>
          Professor Dashboard
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
          Welcome, {user?.name || user?.email}
        </p>
      </div>

      {!activeSession ? (
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          maxWidth: '480px',
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
            Start New Session
          </h2>
          <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Subject Code</label>
              <input
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="e.g. CS301"
                style={inputStyle}
                autoFocus
              />
            </div>
            <div>
              <label style={labelStyle}>Subject Name</label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Data Structures"
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              style={{
                padding: '13px',
                background: creating ? '#9ca3af' : '#1d4ed8',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: creating ? 'not-allowed' : 'pointer',
              }}
            >
              {creating ? 'Starting...' : 'Start Session'}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <div>
                  <h2 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                    {activeSession.subjectName}
                  </h2>
                  <span style={{
                    display: 'inline-block',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    padding: '2px 10px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}>
                    {activeSession.subjectCode}
                  </span>
                </div>
                <div style={{
                  background: '#dcfce7',
                  color: '#16a34a',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}>
                  LIVE
                </div>
              </div>
              <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: '800', color: '#1d4ed8' }}>{attendanceCount}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>students present</div>
              </div>
            </div>

            <QRDisplay sessionId={activeSession.sessionId} />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleExportCsv}
                style={{
                  flex: 1,
                  padding: '11px',
                  background: '#fff',
                  border: '1.5px solid #1d4ed8',
                  color: '#1d4ed8',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Export CSV
              </button>
              <button
                onClick={handleEndSession}
                disabled={ending}
                style={{
                  flex: 1,
                  padding: '11px',
                  background: ending ? '#9ca3af' : '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: ending ? 'not-allowed' : 'pointer',
                }}
              >
                {ending ? 'Ending...' : 'End Session'}
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
              Live Attendance
            </h3>
            <AttendanceTable
              sessionId={activeSession.sessionId}
              liveRefresh={true}
              onCountChange={setAttendanceCount}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '14px',
  fontWeight: '500',
  color: '#374151',
};

const inputStyle = {
  width: '100%',
  padding: '11px 13px',
  border: '1.5px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
  color: '#111827',
};

const cardStyle = {
  background: '#fff',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
  border: '1px solid #e5e7eb',
};
