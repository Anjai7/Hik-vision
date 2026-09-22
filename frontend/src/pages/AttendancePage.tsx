import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Clock,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  CheckCircle2,
  LogIn,
  LogOut,
  Download,
  Users,
  Timer,
  Activity,
  ListFilter,
} from 'lucide-react';
import { attendanceApi, GetAttendanceParams, DailySummaryRecord, DailySummaryStats } from '../api/attendanceApi';
import { AttendanceEventData } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { JsonViewer } from '../components/ui/JsonViewer';
import { Pagination } from '../components/ui/Pagination';

export const AttendancePage: React.FC = () => {
  // View mode: 'timesheet' (First In, Last Out summary) vs 'punches' (Raw activity log)
  const [viewMode, setViewMode] = useState<'timesheet' | 'punches'>('timesheet');

  // Timesheet data
  const [dailySummary, setDailySummary] = useState<DailySummaryRecord[]>([]);
  const [summaryStats, setSummaryStats] = useState<DailySummaryStats>({
    totalEmployeesPresent: 0,
    currentlyInOffice: 0,
    completedShifts: 0,
    avgDurationMinutes: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Raw Punches data
  const [events, setEvents] = useState<AttendanceEventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [verifyMode] = useState('');

  // Modals & alerts
  const [error, setError] = useState<string | null>(null);
  const [successMsg] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AttendanceEventData | null>(null);
  const [rawEventDetails, setRawEventDetails] = useState<unknown | null>(null);
  const [rawLoading, setRawLoading] = useState(false);

  // Drilldown punch modal for a timesheet record
  const [drilldownRecord, setDrilldownRecord] = useState<DailySummaryRecord | null>(null);

  // Fetch Timesheet Summary
  const fetchDailySummary = async () => {
    try {
      setSummaryLoading(true);
      setError(null);
      const res = await attendanceApi.getDailySummary({
        from: fromDate || undefined,
        to: toDate || undefined,
        search: search.trim() || undefined,
      });
      setDailySummary(res.summary);
      if (res.stats) {
        setSummaryStats(res.stats);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance timesheet');
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch Raw Punches
  const fetchPunches = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: GetAttendanceParams = {
        page,
        limit: 25,
        from: fromDate || undefined,
        to: toDate || undefined,
        search: search.trim() || undefined,
        verificationMode: verifyMode || undefined,
      };
      const res = await attendanceApi.getAttendance(params);
      setEvents(res.events);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'timesheet') {
      fetchDailySummary();
    } else {
      fetchPunches();
    }
  }, [viewMode, page]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    if (viewMode === 'timesheet') {
      fetchDailySummary();
    } else {
      fetchPunches();
    }
  };

  const handleInspectRaw = async (ev: AttendanceEventData) => {
    setSelectedEvent(ev);
    try {
      setRawLoading(true);
      const full = await attendanceApi.getAttendanceById(ev.id);
      setRawEventDetails(full.rawEvent || full);
    } catch {
      setRawEventDetails(ev);
    } finally {
      setRawLoading(false);
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (fromDate) params.append('from', fromDate);
    if (toDate) params.append('to', toDate);
    if (search) params.append('search', search);

    window.open(`/api/attendance/summary/export?${params.toString()}`, '_blank');
  };

  return (
    <div>
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

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '10px', color: '#38bdf8' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Present Today</div>
            <div style={{ fontSize: '22px', fontWeight: 700 }}>{summaryStats.totalEmployeesPresent}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', color: '#10b981' }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Currently In Office</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981' }}>{summaryStats.currentlyInOffice}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '10px', color: '#a855f7' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Completed Shifts</div>
            <div style={{ fontSize: '22px', fontWeight: 700 }}>{summaryStats.completedShifts}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '10px', color: '#f59e0b' }}>
            <Timer size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Avg Work Duration</div>
            <div style={{ fontSize: '22px', fontWeight: 700 }}>
              {summaryStats.avgDurationMinutes > 0
                ? `${Math.floor(summaryStats.avgDurationMinutes / 60)}h ${summaryStats.avgDurationMinutes % 60}m`
                : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        {/* Header with View Tabs & Actions */}
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className={`btn ${viewMode === 'timesheet' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('timesheet')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CalendarCheck size={16} />
              <span>Daily Timesheet (Entry & Exit)</span>
            </button>

            <button
              className={`btn ${viewMode === 'punches' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('punches')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ListFilter size={16} />
              <span>Live Punches Log</span>
            </button>
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleExportCsv}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Download timesheet as CSV report"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <form onSubmit={handleFilterSubmit} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', width: '100%' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search employee or ID..."
                className="input-field"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '32px', width: '200px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>From:</span>
              <input
                type="date"
                className="input-field"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ width: '135px' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>To:</span>
              <input
                type="date"
                className="input-field"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ width: '135px' }}
              />
            </div>

            <button type="submit" className="btn btn-secondary" style={{ padding: '7px 12px' }}>
              <Filter size={13} /> Filter
            </button>

            {(fromDate || toDate || search) && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '7px 10px', fontSize: '12px' }}
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setSearch('');
                }}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* VIEW 1: DAILY TIMESHEET (FIRST IN / LAST OUT) */}
        {viewMode === 'timesheet' && (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>First In (Entry Time)</th>
                  <th>Last Out (Exit Time)</th>
                  <th>Working Duration</th>
                  <th>Status</th>
                  <th>Punches</th>
                </tr>
              </thead>
              <tbody>
                {summaryLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>
                      <div className="spinner" style={{ margin: '0 auto 8px auto' }} />
                      <span style={{ color: 'var(--text-muted)' }}>Calculating daily timesheets...</span>
                    </td>
                  </tr>
                ) : dailySummary.length > 0 ? (
                  dailySummary.map((item, idx) => (
                    <tr key={`${item.date}_${item.employeeNo}_${idx}`}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                        {item.date}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{item.employeeName}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {item.employeeNo}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          <LogIn size={14} />
                          <span>{item.firstInFormatted}</span>
                        </div>
                      </td>
                      <td>
                        {item.lastOutFormatted !== '-' ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                            <LogOut size={14} />
                            <span>{item.lastOutFormatted}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: item.durationFormatted === 'In Progress' ? '#10b981' : undefined }}>
                          {item.durationFormatted}
                        </span>
                      </td>
                      <td>
                        <Badge
                          variant={
                            item.status === 'IN_OFFICE'
                              ? 'success'
                              : item.status === 'COMPLETED'
                              ? 'info'
                              : 'neutral'
                          }
                        >
                          {item.statusLabel}
                        </Badge>
                      </td>
                      <td>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                          onClick={() => setDrilldownRecord(item)}
                          title="View all scans today"
                        >
                          {item.punchesCount} {item.punchesCount === 1 ? 'scan' : 'scans'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                      <CalendarCheck size={32} style={{ margin: '0 auto 10px auto', color: 'var(--text-muted)' }} />
                      <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>No attendance records found</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Punches pushed from the Hikvision terminal will automatically calculate daily entry and exit times here.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 2: RAW PUNCHES ACTIVITY LOG */}
        {viewMode === 'punches' && (
          <>
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
                    <th>Raw</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '36px' }}>
                        <div className="spinner" style={{ margin: '0 auto 8px auto' }} />
                        <span style={{ color: 'var(--text-muted)' }}>Loading raw punch logs...</span>
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
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                            {ev.timeFormatted}
                          </span>
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
                        <td>
                          <Badge variant="neutral">
                            {ev.verificationModeLabel === 'faceOrFpOrCardOrPw'
                              ? 'Face'
                              : ev.verificationModeLabel || 'Face'}
                          </Badge>
                        </td>
                        <td>Door {ev.doorNo ?? 1}</td>
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
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                        <Clock size={32} style={{ margin: '0 auto 10px auto', color: 'var(--text-muted)' }} />
                        <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>No punch events found</p>
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
              onPageChange={(p) => setPage(p)}
            />
          </>
        )}
      </div>

      {/* DRILLDOWN MODAL FOR TIMESHEET PUNCHES */}
      <Modal
        isOpen={!!drilldownRecord}
        title={`Punches for ${drilldownRecord?.employeeName} (${drilldownRecord?.date})`}
        onClose={() => setDrilldownRecord(null)}
      >
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>First In:</span>
              <div style={{ fontWeight: 600, color: '#10b981' }}>{drilldownRecord?.firstInFormatted}</div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Last Out:</span>
              <div style={{ fontWeight: 600, color: '#38bdf8' }}>{drilldownRecord?.lastOutFormatted}</div>
            </div>
          </div>

          <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>All Punches Recorded:</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {drilldownRecord?.punches.map((p, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.formattedTime}</span>
                </div>
                <Badge variant="neutral">{p.mode}</Badge>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* RAW JSON INSPECTION MODAL */}
      <Modal
        isOpen={!!selectedEvent}
        title={`ISAPI Payload: Event ${selectedEvent?.id ? selectedEvent.id.substring(0, 8) : ''}`}
        onClose={() => {
          setSelectedEvent(null);
          setRawEventDetails(null);
        }}
      >
        {rawLoading ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div className="spinner" style={{ margin: '0 auto 8px auto' }} />
            <span>Fetching payload details...</span>
          </div>
        ) : (
          <JsonViewer data={rawEventDetails} />
        )}
      </Modal>
    </div>
  );
};
