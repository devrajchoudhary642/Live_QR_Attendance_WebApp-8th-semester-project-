import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import AttendanceTable from '../components/AttendanceTable';

export default function SessionHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const { data } = await api.get('/session/history');
      setSessions(data);
    } catch (err) {
      toast.error('Failed to load session history');
    } finally {
      setLoading(false);
    }
  }

  async function handleEndSession(sessionId, e) {
    e.stopPropagation();
    if (!window.confirm('End this live session? Students will no longer be able to mark attendance.')) return;
    try {
      await api.patch(`/session/${sessionId}/end`);
      setSessions((prev) =>
        prev.map((s) => (s.sessionId === sessionId ? { ...s, isActive: false } : s))
      );
      toast.success('Session ended');
    } catch {
      toast.error('Failed to end session');
    }
  }

  function handleViewQr(session, e) {
    e.stopPropagation();
    navigate('/professor/dashboard', {
      state: {
        resumeSession: {
          sessionId: session.sessionId,
          subjectCode: session.subjectCode,
          subjectName: session.subjectName,
        },
      },
    });
  }

  function isWithinTwoHours(createdAt) {
    return Date.now() - new Date(createdAt).getTime() <= 2 * 60 * 60 * 1000;
  }

  async function handleRestartSession(session, e) {
    e.stopPropagation();
    try {
      await api.patch(`/session/${session.sessionId}/reactivate`);
      setSessions((prev) =>
        prev.map((s) => (s.sessionId === session.sessionId ? { ...s, isActive: true } : s))
      );
      toast.success('Session restarted — previous attendance is preserved!');
      navigate('/professor/dashboard', {
        state: {
          resumeSession: {
            sessionId: session.sessionId,
            subjectCode: session.subjectCode,
            subjectName: session.subjectName,
          },
        },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restart session');
    }
  }

  async function handleExportCsv(sessionId, subjectCode, e) {
    e.stopPropagation();
    try {
      const response = await api.get(`/session/${sessionId}/export-csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${subjectCode}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export CSV');
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: '700', color: '#111827' }}>
            Session History
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          onClick={() => navigate('/professor/dashboard')}
          style={{
            padding: '9px 18px',
            background: '#1d4ed8',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          + New Session
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px', color: '#9ca3af' }}>Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px',
          background: '#fff',
          borderRadius: '12px',
          border: '1px dashed #d1d5db',
        }}>
          <p style={{ color: '#9ca3af', fontSize: '16px' }}>No sessions yet. Start a new session from the dashboard.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sessions.map((session) => (
            <div key={session.sessionId}>
              <div
                onClick={() => setSelectedSession(selectedSession?.sessionId === session.sessionId ? null : session)}
                style={{
                  background: '#fff',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  border: `1.5px solid ${selectedSession?.sessionId === session.sessionId ? '#1d4ed8' : '#e5e7eb'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#111827' }}>
                      {session.subjectName}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                      {session.subjectCode} • {formatDate(session.date)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}>
                      {session.attendanceCount} present
                    </span>
                    <span style={{
                      background: session.isActive ? '#dcfce7' : '#f3f4f6',
                      color: session.isActive ? '#16a34a' : '#6b7280',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}>
                      {session.isActive ? 'LIVE' : 'Ended'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                  {session.isActive && (
                    <>
                      <button
                        onClick={(e) => handleViewQr(session, e)}
                        style={{
                          background: '#1d4ed8',
                          border: 'none',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        View QR
                      </button>
                      <button
                        onClick={(e) => handleEndSession(session.sessionId, e)}
                        style={{
                          background: '#fee2e2',
                          border: '1px solid #fca5a5',
                          color: '#dc2626',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        End
                      </button>
                    </>
                  )}
                  {!session.isActive && isWithinTwoHours(session.createdAt) && (
                    <button
                      onClick={(e) => handleRestartSession(session, e)}
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        color: '#16a34a',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Start Again
                    </button>
                  )}
                  <button
                    onClick={(e) => handleExportCsv(session.sessionId, session.subjectCode, e)}
                    style={{
                      background: 'none',
                      border: '1px solid #d1d5db',
                      color: '#374151',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    CSV
                  </button>
                  <span style={{ color: '#9ca3af', fontSize: '18px' }}>
                    {selectedSession?.sessionId === session.sessionId ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {selectedSession?.sessionId === session.sessionId && (
                <div style={{
                  background: '#f9fafb',
                  border: '1.5px solid #1d4ed8',
                  borderTop: 'none',
                  borderRadius: '0 0 10px 10px',
                  padding: '20px',
                }}>
                  <AttendanceTable sessionId={session.sessionId} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
