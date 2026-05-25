import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function AttendanceTable({ sessionId, liveRefresh = false, onCountChange }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  async function fetchRecords(silent = false) {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/session/${sessionId}/attendance`);
      setRecords(data);
      setLastUpdated(new Date());
      onCountChange?.(data.length);
    } catch (err) {
      if (!silent) toast.error('Failed to load attendance records');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecords();

    if (liveRefresh) {
      intervalRef.current = setInterval(() => fetchRecords(true), 5000);
    }

    return () => clearInterval(intervalRef.current);
  }, [sessionId, liveRefresh]);

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function formatLastUpdated(date) {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '600', color: '#374151' }}>
            {records.length} student{records.length !== 1 ? 's' : ''} present
          </span>
          {liveRefresh && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#16a34a',
                display: 'inline-block',
                animation: 'livePulse 1.4s ease-in-out infinite',
              }} />
              LIVE
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {lastUpdated && (
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
              updated {formatLastUpdated(lastUpdated)}
            </span>
          )}
          {!liveRefresh && (
            <button
              onClick={() => fetchRecords()}
              disabled={loading}
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes rowFadeIn {
          from { background: #eff6ff; }
          to { background: transparent; }
        }
      `}</style>

      {records.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: '#9ca3af',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px dashed #d1d5db',
        }}>
          {liveRefresh ? 'Waiting for students to mark attendance...' : 'No attendance recorded yet'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: liveRefresh ? '340px' : 'none', overflowY: liveRefresh ? 'auto' : 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ position: liveRefresh ? 'sticky' : 'static', top: 0, zIndex: 1 }}>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Student Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Time</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr
                  key={r._id}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    animation: liveRefresh && i === records.length - 1 ? 'rowFadeIn 1.5s ease' : 'none',
                  }}
                >
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>{r.studentName || '—'}</td>
                  <td style={tdStyle}>{r.studentEmail}</td>
                  <td style={tdStyle}>{formatTime(r.markedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: '600',
  color: '#374151',
  fontSize: '13px',
};

const tdStyle = {
  padding: '10px 12px',
  color: '#4b5563',
};
