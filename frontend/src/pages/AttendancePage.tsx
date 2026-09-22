import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Clock,
  Search,
  LogIn,
  LogOut,
  Download,
  Users,
  Timer,
  Activity,
  ListFilter,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Eye,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { attendanceApi, GetAttendanceParams, DailySummaryRecord, DailySummaryStats } from '../api/attendanceApi';
import { usersApi } from '../api/usersApi';
import { AttendanceEventData, UserData } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { JsonViewer } from '../components/ui/JsonViewer';
import { Pagination } from '../components/ui/Pagination';

export const AttendancePage: React.FC = () => {
  // View mode: 'timesheet' (Daily summary) | 'punches' (Access log) | 'by-user' (Per-user breakdown)
  const [viewMode, setViewMode] = useState<'timesheet' | 'punches' | 'by-user'>('timesheet');

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
  // Filter for access logs: 'all' | 'success' | 'failed'
  const [authFilter, setAuthFilter] = useState<'all' | 'success' | 'failed'>('all');

  // Per-User Attendance View data
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [selectedEmployeeNo, setSelectedEmployeeNo] = useState<string>('');
  const [userSummary, setUserSummary] = useState<DailySummaryRecord[]>([]);
  const [userSummaryLoading, setUserSummaryLoading] = useState(false);

  // General Filters
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modals & alerts
  const [error, setError] = useState<string | null>(null);
  const [successMsg] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AttendanceEventData | null>(null);
  const [rawEventDetails, setRawEventDetails] = useState<unknown | null>(null);
  const [rawLoading, setRawLoading] = useState(false);

  // Drilldown punch modal for a timesheet record
  const [drilldownRecord, setDrilldownRecord] = useState<DailySummaryRecord | null>(null);

  // Fetch Users for the 'by-user' dropdown
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await usersApi.getUsers({ limit: 100 });
        setUsersList(res.users);
        if (res.users.length > 0 && !selectedEmployeeNo) {
          setSelectedEmployeeNo(res.users[0].employeeNo);
        }
      } catch (err: any) {
        console.error('Failed to load users list:', err);
      }
    };
    loadUsers();
  }, []);

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

  // Fetch Raw Punches (Access Logs)
  const fetchPunches = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: GetAttendanceParams = {
        page,
        limit: 50,
        from: fromDate || undefined,
        to: toDate || undefined,
        search: search.trim() || undefined,
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

  // Fetch Per-User Summary
  const fetchUserSummary = async (empNo: string) => {
    if (!empNo) return;
    try {
      setUserSummaryLoading(true);
      setError(null);
      const res = await attendanceApi.getDailySummary({
        employeeNo: empNo,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setUserSummary(res.summary);
    } catch (err: any) {
      setError(err.message || `Failed to load attendance for employee #${empNo}`);
    } finally {
      setUserSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'timesheet') {
      fetchDailySummary();
    } else if (viewMode === 'punches') {
      fetchPunches();
    } else if (viewMode === 'by-user' && selectedEmployeeNo) {
      fetchUserSummary(selectedEmployeeNo);
    }
  }, [viewMode, page, selectedEmployeeNo]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    if (viewMode === 'timesheet') {
      fetchDailySummary();
    } else if (viewMode === 'punches') {
      fetchPunches();
    } else if (viewMode === 'by-user' && selectedEmployeeNo) {
      fetchUserSummary(selectedEmployeeNo);
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

  const handleExportCsv = (empNo?: string) => {
    const params = new URLSearchParams();
    if (fromDate) params.append('from', fromDate);
    if (toDate) params.append('to', toDate);
    if (empNo) {
      params.append('employeeNo', empNo);
    } else if (search) {
      params.append('search', search);
    }

    window.open(`/api/attendance/summary/export?${params.toString()}`, '_blank');
  };

  // Filtered punches based on authFilter
  const filteredEvents = events.filter((ev) => {
    const isFailed =
      ev.status === 'FAILED' ||
      ev.eventDescription.toLowerCase().includes('fail') ||
      ev.eventDescription.toLowerCase().includes('denied') ||
      ev.eventDescription.toLowerCase().includes('mismatch') ||
      ev.eventDescription.toLowerCase().includes('expired');

    if (authFilter === 'success') return !isFailed;
    if (authFilter === 'failed') return isFailed;
    return true;
  });

  const selectedUserObj = usersList.find((u) => u.employeeNo === selectedEmployeeNo);

  // Calculate per-user stats
  const userTotalDays = userSummary.length;
  const userTotalMinutes = userSummary.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
  const userTotalPunches = userSummary.reduce((acc, curr) => acc + (curr.punchesCount || 0), 0);
  const userAvgMinutes = userTotalDays > 0 ? Math.round(userTotalMinutes / userTotalDays) : 0;

  return (
    <div>
      {error && (
        <div className="alert-banner alert-error" style={{ marginBottom: '16px' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert-banner alert-success" style={{ marginBottom: '16px' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Stats Bar (For Overview) */}
      {viewMode === 'timesheet' && (
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
      )}

      {/* Main Table Card */}
      <div className="card">
        {/* Navigation Tabs between Views */}
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`btn ${viewMode === 'timesheet' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('timesheet')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CalendarCheck size={16} />
              <span>Daily Timesheet</span>
            </button>

            <button
              className={`btn ${viewMode === 'by-user' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('by-user')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <UserCheck size={16} />
              <span>👤 By Employee</span>
            </button>

            <button
              className={`btn ${viewMode === 'punches' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('punches')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ListFilter size={16} />
              <span>Authentication & Access Logs</span>
            </button>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => handleExportCsv(viewMode === 'by-user' ? selectedEmployeeNo : undefined)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Download report as CSV"
          >
            <Download size={15} />
            <span>{viewMode === 'by-user' ? 'Export Employee CSV' : 'Export All CSV'}</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <form onSubmit={handleFilterSubmit} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', width: '100%' }}>
            {viewMode !== 'by-user' && (
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
            )}

            {/* If in By-Employee mode: show employee selector dropdown */}
            {viewMode === 'by-user' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Employee:</label>
                <select
                  className="input-field"
                  style={{ width: '240px', fontWeight: 600 }}
                  value={selectedEmployeeNo}
                  onChange={(e) => setSelectedEmployeeNo(e.target.value)}
                >
                  {usersList.map((u) => (
                    <option key={u.id} value={u.employeeNo}>
                      {u.name} (ID: {u.employeeNo}) {u.enabled ? '' : '⚠️ [Blocked]'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>From:</span>
              <input
                type="date"
                className="input-field"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12.5px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>To:</span>
              <input
                type="date"
                className="input-field"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '12.5px' }}
              />
            </div>

            <button type="submit" className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '13px' }}>
              Apply
            </button>

            {(fromDate || toDate || search) && (
              <button
                type="button"
                className="btn"
                style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--text-muted)' }}
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setSearch('');
                  setPage(1);
                  if (viewMode === 'timesheet') fetchDailySummary();
                  else if (viewMode === 'punches') fetchPunches();
                  else if (viewMode === 'by-user' && selectedEmployeeNo) fetchUserSummary(selectedEmployeeNo);
                }}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* VIEW 1: DAILY TIMESHEET (ALL EMPLOYEES) */}
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
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{item.date}</td>
                      <td>
                        <div
                          style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedEmployeeNo(item.employeeNo);
                            setViewMode('by-user');
                          }}
                          title="Click to view full personal attendance for this user"
                        >
                          <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{item.employeeName}</span>
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
                        Scans from the Hikvision terminal will automatically calculate daily entry and exit times here.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 2: BY EMPLOYEE (INDIVIDUAL BREAKDOWN) */}
        {viewMode === 'by-user' && (
          <div style={{ padding: '20px' }}>
            {selectedUserObj ? (
              <>
                {/* Employee Profile Header & KPIs */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '20px',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: 700,
                        color: 'white',
                      }}
                    >
                      {selectedUserObj.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{selectedUserObj.name}</h3>
                        <Badge variant={selectedUserObj.enabled ? 'success' : 'danger'}>
                          {selectedUserObj.enabled ? 'Active' : 'Expired / Blocked'}
                        </Badge>
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', gap: '14px', marginTop: '2px' }}>
                        <span>Employee ID: <strong>{selectedUserObj.employeeNo}</strong></span>
                        <span>Department Group: <strong>{selectedUserObj.groupId || 1}</strong></span>
                        {selectedUserObj.validTo && (
                          <span>
                            Valid Until: <strong>{new Date(selectedUserObj.validTo).toLocaleDateString()}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleExportCsv(selectedUserObj.employeeNo)}
                      style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Download size={14} />
                      <span>Export Timesheet</span>
                    </button>
                  </div>
                </div>

                {/* Per-User KPI Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Days Present</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#38bdf8' }}>{userTotalDays} days</div>
                  </div>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Working Hours</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#10b981' }}>
                      {Math.floor(userTotalMinutes / 60)}h {userTotalMinutes % 60}m
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Avg Daily Duration</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#f59e0b' }}>
                      {Math.floor(userAvgMinutes / 60)}h {userAvgMinutes % 60}m / day
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Punches Recorded</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{userTotalPunches} scans</div>
                  </div>
                </div>

                {/* Per-User Daily Timesheet Table */}
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>First In (Entry)</th>
                        <th>Last Out (Exit)</th>
                        <th>Working Hours</th>
                        <th>Status</th>
                        <th>Punches</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userSummaryLoading ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '36px' }}>
                            <div className="spinner" style={{ margin: '0 auto 8px auto' }} />
                            <span>Loading attendance history for {selectedUserObj.name}...</span>
                          </td>
                        </tr>
                      ) : userSummary.length > 0 ? (
                        userSummary.map((item, idx) => (
                          <tr key={`${item.date}_${idx}`}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600 }}>
                              {item.date}
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
                              >
                                {item.punchesCount} scans
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '36px' }}>
                            <Calendar size={28} style={{ margin: '0 auto 8px auto', color: 'var(--text-muted)' }} />
                            <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>No attendance records found for this employee</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              When {selectedUserObj.name} scans at the terminal, their daily timeline will appear here.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Users size={32} style={{ margin: '0 auto 10px auto', color: 'var(--text-muted)' }} />
                <p>Please select an employee from the dropdown above to view their attendance history.</p>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: RAW ACCESS LOGS & AUTHENTICATION (GRANTED VS FAILED) */}
        {viewMode === 'punches' && (
          <>
            {/* Sub-toolbar: Filter by Success vs Fail */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid var(--border-color)',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Filter Result:</span>
                <button
                  className={`btn ${authFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '4px 10px', fontSize: '11.5px' }}
                  onClick={() => setAuthFilter('all')}
                >
                  All Scans ({events.length})
                </button>
                <button
                  className={`btn ${authFilter === 'success' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '4px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setAuthFilter('success')}
                >
                  <ShieldCheck size={13} style={{ color: '#10b981' }} />
                  <span>Passed / Granted</span>
                </button>
                <button
                  className={`btn ${authFilter === 'failed' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '4px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setAuthFilter('failed')}
                >
                  <ShieldAlert size={13} style={{ color: '#ef4444' }} />
                  <span>Denied / Failed Attempts</span>
                </button>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Showing {filteredEvents.length} events
              </div>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Employee ID</th>
                    <th>Employee Name</th>
                    <th>Authentication Status</th>
                    <th>Verification Mode</th>
                    <th>Door</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '36px' }}>
                        <div className="spinner" style={{ margin: '0 auto 8px auto' }} />
                        <span style={{ color: 'var(--text-muted)' }}>Loading authentication logs...</span>
                      </td>
                    </tr>
                  ) : filteredEvents.length > 0 ? (
                    filteredEvents.map((ev) => {
                      const isFailed =
                        ev.status === 'FAILED' ||
                        ev.eventDescription.toLowerCase().includes('fail') ||
                        ev.eventDescription.toLowerCase().includes('denied') ||
                        ev.eventDescription.toLowerCase().includes('mismatch') ||
                        ev.eventDescription.toLowerCase().includes('expired');

                      return (
                        <tr
                          key={ev.id}
                          style={{
                            background: isFailed ? 'rgba(239, 68, 68, 0.05)' : undefined,
                          }}
                        >
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
                            <Badge variant="neutral">{ev.employeeNo || '-'}</Badge>
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {ev.employeeName || (isFailed ? 'Unknown / Blocked' : 'Unnamed')}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <Badge variant={isFailed ? 'danger' : 'success'}>
                                {isFailed ? '❌ Denied / Failed' : '✅ Access Granted'}
                              </Badge>
                              {ev.eventDescription && (
                                <span style={{ fontSize: '11px', color: isFailed ? '#f87171' : 'var(--text-muted)' }}>
                                  {ev.eventDescription}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <Badge variant="neutral">
                              {ev.verificationModeLabel === 'faceOrFpOrCardOrPw'
                                ? 'Face / Bio'
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
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                        <Clock size={32} style={{ margin: '0 auto 10px auto', color: 'var(--text-muted)' }} />
                        <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>No events found for this filter</p>
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
