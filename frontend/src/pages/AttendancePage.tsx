import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  RefreshCw,
  Eye,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { attendanceApi, GetAttendanceParams } from '../api/attendanceApi';
import { AttendanceEventData } from '../types';
import { Badge } from '../components/ui/Badge';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { JsonViewer } from '../components/ui/JsonViewer';

export const AttendancePage: React.FC = () => {
  const [events, setEvents] = useState<AttendanceEventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [verifyMode, setVerifyMode] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  const [autoRefresh, setAutoRefresh] = useState(true);

  // Modal inspection
  const [selectedEvent, setSelectedEvent] = useState<AttendanceEventData | null>(null);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawEventDetails, setRawEventDetails] = useState<any>(null);

  const fetchAttendance = async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true);
        setError(null);
      }
      const params: GetAttendanceParams = {
        page,
        limit: 50,
        search: search.trim() || undefined,
        from: fromDate ? new Date(fromDate).toISOString() : undefined,
        to: toDate ? new Date(`${toDate}T23:59:59`).toISOString() : undefined,
        verificationMode: verifyMode || undefined,
      };

      const res = await attendanceApi.getAttendance(params);
      setEvents(res.events);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: any) {
      if (!isSilent) {
        setError(err.message || 'Failed to fetch attendance events');
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [page, verifyMode]);

  // Silent background polling every 3 seconds without full-page re-render
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      if (!search && !fromDate && !toDate) {
        fetchAttendance(true);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [autoRefresh, page, verifyMode, search, fromDate, toDate]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAttendance();
  };

  const handleSyncEvents = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSuccessMsg(null);
      const result = await attendanceApi.syncAttendance();
      setSuccessMsg(`Successfully imported ${result.count} events from terminal in ${result.durationMs}ms`);
      setPage(1);
      await fetchAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to synchronize events from terminal');
    } finally {
      setSyncing(false);
    }
  };

  const handleInspectRaw = async (ev: AttendanceEventData) => {
    setSelectedEvent(ev);
    try {
      setRawLoading(true);
      const full = await attendanceApi.getAttendanceById(ev.id);
      setRawEventDetails(full.rawEvent || full);
    } catch (err) {
      setRawEventDetails(ev);
    } finally {
      setRawLoading(false);
    }
  };

  return (
    <div>
      {/* Informational Guidance Banner */}
      <div className="alert-banner" style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', color: '#93c5fd' }}>
        <CalendarCheck size={18} />
        <span>
          Live Authentication Logs: Showing verified successful and failed access events pushed directly from your Hikvision terminal.
        </span>
      </div>

      {error && (
        <div className="alert-banner alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert-banner alert-success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="table-card">
        {/* Filters and Actions Bar */}
        <div className="table-header-bar">
          <div>
            <div className="table-title">Access & Attendance Logs</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Showing {events.length} of {pagination.total} logged records
            </div>
          </div>

          <div className="table-filters">
            <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search name / ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '150px' }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="date"
                  className="input-field"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{ width: '135px' }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>to</span>
                <input
                  type="date"
                  className="input-field"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{ width: '135px' }}
                />
              </div>

              <select
                className="select-field"
                value={verifyMode}
                onChange={(e) => {
                  setVerifyMode(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Verification Modes</option>
                <option value="faceOrFpOrCardOrPw">Any (face/fp/card/pw)</option>
                <option value="fp">Fingerprint</option>
                <option value="face">Face</option>
                <option value="card">Card</option>
              </select>

              <button type="submit" className="btn btn-secondary" style={{ padding: '8px 12px' }}>
                <Filter size={14} /> Filter
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${autoRefresh ? 'btn-secondary' : 'btn-outline'}`}
                style={{
                  padding: '7px 12px',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: autoRefresh ? 'rgba(16, 185, 129, 0.4)' : undefined,
                }}
                onClick={() => setAutoRefresh(!autoRefresh)}
                title="Toggle automatic background updates"
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: autoRefresh ? '#10b981' : '#64748b',
                    boxShadow: autoRefresh ? '0 0 6px #10b981' : 'none',
                    display: 'inline-block',
                  }}
                />
                {autoRefresh ? 'Live Updates (Auto)' : 'Live Updates Paused'}
              </button>

              <button
                className="btn btn-primary"
                onClick={handleSyncEvents}
                disabled={syncing}
              >
                <RefreshCw size={14} className={syncing ? 'spinner' : ''} />
                {syncing ? 'Syncing...' : 'Sync Events'}
              </button>
            </div>
          </div>
        </div>

        {/* Attendance Log Table */}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Authentication Result</th>
                <th>Verification Mode</th>
                <th>Door</th>
                <th>Device</th>
                <th>Raw</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px' }}>
                    <div className="spinner" style={{ margin: '0 auto 8px auto' }} />
                    <span style={{ color: 'var(--text-muted)' }}>Loading attendance events...</span>
                  </td>
                </tr>
              ) : events.length > 0 ? (
                events.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
                        {ev.dateFormatted}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                          {ev.timeFormatted}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Local: {ev.localTimeFormatted || new Date(ev.eventTime).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge variant="neutral">{ev.employeeNo}</Badge>
                    </td>
                    <td style={{ fontWeight: 600 }}>{ev.employeeName}</td>
                    <td>
                      <Badge
                        variant={
                          ev.status === 'FAILED' ||
                          ev.eventDescription.includes('Fail') ||
                          ev.eventDescription.includes('Denied')
                            ? 'danger'
                            : 'success'
                        }
                      >
                        {ev.status === 'FAILED' ||
                        ev.eventDescription.includes('Fail') ||
                        ev.eventDescription.includes('Denied')
                          ? 'Failed Authentication'
                          : 'Successful Authentication'}
                      </Badge>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      <Badge variant="neutral">
                        {ev.verificationModeLabel === 'faceOrFpOrCardOrPw'
                          ? 'Face'
                          : ev.verificationModeLabel || 'Face'}
                      </Badge>
                    </td>
                    <td>Door {ev.doorNo ?? 1}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{ev.deviceModel}</td>
                    <td>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => handleInspectRaw(ev)}
                        title="View Raw ISAPI Event Payload"
                      >
                        <Eye size={12} /> JSON
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="empty-state">
                    No attendance events matching filter criteria. Click "Sync Events" to fetch from device.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={(newPage) => setPage(newPage)}
        />
      </div>

      {/* Raw ISAPI Event Payload Modal */}
      <Modal
        isOpen={!!selectedEvent}
        title={`Raw Hikvision ISAPI Event [${selectedEvent?.employeeNo} - ${selectedEvent?.employeeName}]`}
        onClose={() => {
          setSelectedEvent(null);
          setRawEventDetails(null);
        }}
        footer={
          <button className="btn btn-secondary" onClick={() => setSelectedEvent(null)}>
            Close
          </button>
        }
      >
        {rawLoading ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div className="spinner" style={{ margin: '0 auto 8px auto' }} />
            <span>Loading raw event payload...</span>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Raw ISAPI JSON returned by DS-K1T320MFWX <code>/ISAPI/AccessControl/AcsEvent</code>:
            </div>
            <JsonViewer data={rawEventDetails} />
          </div>
        )}
      </Modal>
    </div>
  );
};
