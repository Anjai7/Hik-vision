import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Activity,
  RefreshCw,
  CheckCircle2,
  Users,
  Fingerprint,
  ScanFace,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Server,
  Network,
} from 'lucide-react';
import { deviceApi } from '../api/deviceApi';
import { usersApi } from '../api/usersApi';
import { attendanceApi } from '../api/attendanceApi';
import { DeviceData } from '../types';
import { Badge } from '../components/ui/Badge';

export const DevicePage: React.FC = () => {
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingUsers, setSyncingUsers] = useState(false);
  const [syncingEvents, setSyncingEvents] = useState(false);

  const [testResult, setTestResult] = useState<{
    online: boolean;
    latencyMs: number;
    deviceInfo?: any;
    userCounts?: any;
    error?: string;
  } | null>(null);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const loadDeviceInfo = async () => {
    try {
      setLoading(true);
      const data = await deviceApi.getDevice();
      setDevice(data);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to load device details',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setNotification(null);
      const res = await deviceApi.testConnection();
      setTestResult(res);
      if (res.online) {
        setNotification({
          type: 'success',
          message: `Hardware response received in ${res.latencyMs}ms! Terminal is online.`,
        });
        await loadDeviceInfo();
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'Connection to terminal failed.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncingAll(true);
      setNotification(null);
      const res = await deviceApi.syncAll();
      setNotification({
        type: 'success',
        message: `Sync completed: ${res.usersProcessed} users and ${res.eventsProcessed} events synchronized in ${res.durationMs}ms`,
      });
      await loadDeviceInfo();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Sync operation failed',
      });
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncUsers = async () => {
    try {
      setSyncingUsers(true);
      setNotification(null);
      const res = await usersApi.syncUsers();
      setNotification({
        type: 'success',
        message: `Users synchronized: ${res.count} records updated in ${res.durationMs}ms`,
      });
      await loadDeviceInfo();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'User sync failed',
      });
    } finally {
      setSyncingUsers(false);
    }
  };

  const handleSyncEvents = async () => {
    try {
      setSyncingEvents(true);
      setNotification(null);
      const res = await attendanceApi.syncAttendance();
      setNotification({
        type: 'success',
        message: `Events synchronized: ${res.count} new records stored in ${res.durationMs}ms`,
      });
      await loadDeviceInfo();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Attendance sync failed',
      });
    } finally {
      setSyncingEvents(false);
    }
  };

  if (loading && !device) {
    return (
      <div style={{ textAlign: 'center', padding: '64px' }}>
        <div className="spinner" style={{ margin: '0 auto 12px auto', width: '28px', height: '28px' }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading hardware details from ISAPI service...</span>
      </div>
    );
  }

  return (
    <div>
      {notification && (
        <div
          className={`alert-banner ${
            notification.type === 'success' ? 'alert-success' : 'alert-error'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Primary Device Overview Card */}
      <div className="table-card" style={{ marginBottom: '24px' }}>
        <div className="table-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}
            >
              <Cpu size={22} />
            </div>
            <div>
              <div className="table-title">Hikvision Access Terminal (ISAPI)</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {device?.model || 'DS-K1T320MFWX'}
              </div>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={handleTestConnection}
              disabled={testing || syncingAll || syncingUsers || syncingEvents}
            >
              <Activity size={15} className={testing ? 'spinner' : ''} />
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleSyncUsers}
              disabled={testing || syncingAll || syncingUsers || syncingEvents}
            >
              <RefreshCw size={15} className={syncingUsers ? 'spinner' : ''} />
              {syncingUsers ? 'Syncing...' : 'Sync Users'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleSyncEvents}
              disabled={testing || syncingAll || syncingUsers || syncingEvents}
            >
              <RefreshCw size={15} className={syncingEvents ? 'spinner' : ''} />
              {syncingEvents ? 'Syncing...' : 'Sync Events'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSyncAll}
              disabled={testing || syncingAll || syncingUsers || syncingEvents}
            >
              <RefreshCw size={15} className={syncingAll ? 'spinner' : ''} />
              {syncingAll ? 'Syncing All...' : 'Sync Everything'}
            </button>
          </div>
        </div>

        {/* Hardware & Connection Properties Grid */}
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Hardware Specs */}
          <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={16} /> Hardware Specifications
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Device Model:</span>
                <span style={{ fontWeight: 600 }}>{testResult?.deviceInfo?.model || device?.model || 'DS-K1T320MFWX'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Firmware:</span>
                <span style={{ fontWeight: 500 }}>{testResult?.deviceInfo?.firmwareVersion || device?.firmware || 'V3.5.2 build 240701'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Serial Number:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {testResult?.deviceInfo?.serialNumber
                    ? `${testResult.deviceInfo.serialNumber.substring(0, 4)}****${testResult.deviceInfo.serialNumber.slice(-4)}`
                    : device?.serialNo || 'DS-K****MFWX'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Device Name:</span>
                <span>{testResult?.deviceInfo?.deviceName || device?.name || 'Hikvision Access Terminal'}</span>
              </div>
            </div>
          </div>

          {/* Network & Protocol */}
          <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Network size={16} /> Network & Protocol
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Host Address:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{device?.connection?.host || device?.host || 'https://192.168.18.229'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>ISAPI Protocol:</span>
                <span>HTTPS (TLS 1.2/1.3)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Authentication:</span>
                <span>HTTP Digest (RFC 2617)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Client Status:</span>
                {testResult?.online ? (
                  <Badge variant="success">Online ({testResult.latencyMs}ms)</Badge>
                ) : testResult ? (
                  <Badge variant="danger">Offline</Badge>
                ) : (
                  <Badge variant="neutral">Configured</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Biometrics & Synchronization Status */}
          <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} /> Biometric Enrollments
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} /> Total Users:
                </span>
                <span style={{ fontWeight: 600 }}>{testResult?.userCounts?.userNumber ?? 1}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Fingerprint size={14} /> Fingerprint Profiles:
                </span>
                <span style={{ fontWeight: 600 }}>{testResult?.userCounts?.bindFingerprintUserNumber ?? 1}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ScanFace size={14} /> Facial Profiles:
                </span>
                <span style={{ fontWeight: 600 }}>{testResult?.userCounts?.bindFaceUserNumber ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={14} /> Card Numbers:
                </span>
                <span style={{ fontWeight: 600 }}>{testResult?.userCounts?.bindCardUserNumber ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timestamps footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-muted)' }}>
          <div>Last Seen: {device?.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Not recorded'}</div>
          <div>Last Sync: {device?.lastSyncAt ? new Date(device.lastSyncAt).toLocaleString() : 'Not yet synced'}</div>
        </div>
      </div>
    </div>
  );
};
