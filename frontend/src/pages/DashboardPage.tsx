import React, { useEffect, useState } from 'react';
import {
  Users,
  Fingerprint,
  ScanFace,
  CreditCard,
  CalendarCheck,
  Clock,
  RefreshCw,
  Cpu,
  AlertTriangle,
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

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Registered Users"
          value={summary?.stats.totalUsers ?? 0}
          icon={<Users size={20} color="#3b82f6" />}
          iconBg="rgba(59, 130, 246, 0.15)"
          meta="Synchronized from terminal"
        />
        <StatCard
          title="Fingerprint Enrolled"
          value={summary?.stats.fingerprintUsers ?? 0}
          icon={<Fingerprint size={20} color="#10b981" />}
          iconBg="rgba(16, 185, 129, 0.15)"
          meta="Active biometrics"
        />
        <StatCard
          title="Face Enrolled"
          value={summary?.stats.faceUsers ?? 0}
          icon={<ScanFace size={20} color="#8b5cf6" />}
          iconBg="rgba(139, 92, 246, 0.15)"
          meta="Facial profiles"
        />
        <StatCard
          title="Card Enrolled"
          value={summary?.stats.cardUsers ?? 0}
          icon={<CreditCard size={20} color="#f59e0b" />}
          iconBg="rgba(245, 158, 11, 0.15)"
          meta="RFID / Mifare cards"
        />
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <StatCard
          title="Total Events Recorded"
          value={summary?.stats.totalEvents ?? 0}
          icon={<CalendarCheck size={20} color="#38bdf8" />}
          iconBg="rgba(56, 189, 248, 0.15)"
          meta="Stored in database"
        />
        <StatCard
          title="Today's Terminal Events"
          value={summary?.stats.todayEvents ?? 0}
          icon={<Clock size={20} color="#ec4899" />}
          iconBg="rgba(236, 72, 153, 0.15)"
          meta="Logged since midnight"
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
            <div className="table-title">Recent Terminal Activity</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Latest access and authentication events (Neutral ISAPI descriptors)
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={onNavigateToUsers}>
              Manage Users
            </button>
            <button className="btn btn-secondary" onClick={onNavigateToAttendance}>
              View All Events
            </button>
            <button className="btn btn-primary" onClick={onTriggerSync} disabled={isSyncing}>
              <RefreshCw size={14} className={isSyncing ? 'spinner' : ''} />
              Sync Now
            </button>
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Employee No</th>
                <th>Name</th>
                <th>Event Description</th>
                <th>Verification Mode</th>
                <th>Door</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                    <div className="spinner" style={{ margin: '0 auto 8px auto' }} />
                    <span style={{ color: 'var(--text-muted)' }}>Loading recent events...</span>
                  </td>
                </tr>
              ) : summary?.recentEvents && summary.recentEvents.length > 0 ? (
                summary.recentEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                          {ev.timeFormatted || new Date(ev.eventTime).toLocaleTimeString()}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Local: {new Date(ev.eventTime).toLocaleTimeString()}
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
                          ev.eventDescription.includes('Granted') || ev.eventDescription.includes('Unlocked')
                            ? 'success'
                            : ev.eventDescription.includes('Denied') || ev.eventDescription.includes('Failed')
                            ? 'danger'
                            : 'info'
                        }
                      >
                        {ev.eventDescription}
                      </Badge>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{ev.verificationModeLabel}</td>
                    <td>Door {ev.doorNo ?? 1}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No attendance events recorded yet. Click "Sync Now" to import from device.
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
