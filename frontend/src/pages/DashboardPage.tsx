import React, { useEffect, useState } from 'react';
import {
  Users,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Clock,
  RefreshCw,
  Cpu,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { dashboardApi } from '../api/dashboardApi';
import { DashboardSummaryData } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';

interface DashboardPageProps {
  onNavigateToUsers: () => void;
  onNavigateToAttendance: () => void;
  onTriggerSync: () => void;
  isSyncing: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToUsers,
  onNavigateToAttendance,
  onTriggerSync,
  isSyncing,
}) => {
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true);
        setError(null);
      }
      const data = await dashboardApi.getSummary();
      setSummary(data);
    } catch (err: any) {
      if (!isSilent) {
        setError(err.message || 'Failed to load dashboard summary');
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadSummary();
    const interval = setInterval(() => {
      loadSummary(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {error && (
        <div className="alert-banner alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="stats-grid" style={{ marginBottom: '16px' }}>
        <StatCard
          title="Total Registered Employees"
          value={summary?.stats.totalUsers ?? 0}
          icon={<Users size={20} color="#38bdf8" />}
          iconBg="rgba(56, 189, 248, 0.15)"
          meta="Enrolled team members"
          onClick={onNavigateToUsers}
        />
        <StatCard
          title="Present in Office Today"
          value={summary?.stats.presentToday ?? 0}
          icon={<Activity size={20} color="#10b981" />}
          iconBg="rgba(16, 185, 129, 0.15)"
          meta="Scanned in today"
        />
        <StatCard
          title="Total Punches Today"
          value={summary?.stats.todayEvents ?? 0}
          icon={<Clock size={20} color="#8b5cf6" />}
          iconBg="rgba(139, 92, 246, 0.15)"
          meta="Logged check-in / outs"
        />
        <StatCard
          title="Denied Attempts"
          value={summary?.stats.failedAttemptsToday ?? 0}
          icon={<ShieldAlert size={20} color="#ef4444" />}
          iconBg="rgba(239, 68, 68, 0.15)"
          meta="Unauthorized / rejected"
        />
      </div>

      {/* Hardware / Device Info Bar */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <StatCard
          title="Face Enrolled"
          value={summary?.stats.faceUsers ?? 0}
          icon={<ShieldCheck size={20} color="#10b981" />}
          iconBg="rgba(16, 185, 129, 0.15)"
          meta="Facial biometrics active"
        />
        <StatCard
          title="Card Enrolled"
          value={summary?.stats.cardUsers ?? 0}
          icon={<Users size={20} color="#f59e0b" />}
          iconBg="rgba(245, 158, 11, 0.15)"
          meta="RFID badge users"
        />
        <div className="stat-card" style={{ justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Cpu size={18} color="var(--text-secondary)" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Terminal Status</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {summary?.device.model || 'DS-K1T320MFWX'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Firmware: {summary?.device.firmware || 'V3.5.2'}
          </div>
        </div>
      </div>

      {/* Recent Events Table */}
      <div className="table-card" style={{ marginTop: '16px' }}>
        <div className="table-header-bar">
          <div>
            <div className="table-title">Recent Authentication Stream</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Real-time feed of successful and denied entry scans
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-outline"
              onClick={onNavigateToAttendance}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <span>View Timesheet</span>
              <ArrowRight size={13} />
            </button>
            <button
              className="btn btn-secondary"
              onClick={onTriggerSync}
              disabled={isSyncing}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Authentication Result</th>
                <th>Verification Mode</th>
                <th>Door</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                    <div className="spinner" style={{ margin: '0 auto 8px auto' }} />
                    <span style={{ color: 'var(--text-muted)' }}>Loading recent activity...</span>
                  </td>
                </tr>
              ) : summary?.recentEvents && summary.recentEvents.length > 0 ? (
                summary.recentEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                        {ev.timeFormatted || new Date(ev.eventTime).toLocaleTimeString()}
                      </span>
                    </td>
                    <td>
                      <Badge variant="neutral">{ev.employeeNo}</Badge>
                    </td>
                    <td style={{ fontWeight: 600 }}>{ev.employeeName}</td>
                    <td>
                      <Badge
                        variant={
                          ev.eventDescription.includes('Fail') || ev.eventDescription.includes('Denied')
                            ? 'danger'
                            : 'success'
                        }
                      >
                        {ev.eventDescription.includes('Fail') || ev.eventDescription.includes('Denied')
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>No recent activity recorded today</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
