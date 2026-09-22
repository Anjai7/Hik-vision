import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { AttendancePage } from './pages/AttendancePage';
import { DevicePage } from './pages/DevicePage';
import { deviceApi } from './api/deviceApi';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [deviceModel, setDeviceModel] = useState<string>('DS-K1T320MFWX');
  const [firmware, setFirmware] = useState<string>('V3.5.2');
  const [attendanceEmployeeNo, setAttendanceEmployeeNo] = useState<string | undefined>();

  const checkStatus = async () => {
    try {
      const status = await deviceApi.getStatus();
      setIsOnline(status.online);
      if (status.deviceInfo?.model) {
        setDeviceModel(status.deviceInfo.model);
      }
      if (status.deviceInfo?.firmwareVersion) {
        setFirmware(status.deviceInfo.firmwareVersion);
      }
    } catch {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Periodically ping status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleGlobalSync = async () => {
    try {
      setIsSyncing(true);
      await deviceApi.syncAll();
      setLastSyncAt(new Date().toISOString());
      await checkStatus();
    } catch (err: any) {
      console.error('Global sync error:', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const pageTitles: Record<NavTab, string> = {
    dashboard: 'Executive Dashboard',
    users: 'Employee & User Management',
    attendance: 'Attendance & Access Records',
    device: 'Hardware & ISAPI Settings',
  };

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        deviceModel={deviceModel}
        firmware={firmware}
      />

      <div className="main-wrapper">
        <Topbar
          title={pageTitles[activeTab]}
          isOnline={isOnline}
          isSyncing={isSyncing}
          onQuickSync={handleGlobalSync}
          lastSyncAt={lastSyncAt}
        />

        <main className="content-area">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onNavigateToUsers={() => setActiveTab('users')}
              onNavigateToAttendance={() => setActiveTab('attendance')}
              onTriggerSync={handleGlobalSync}
              isSyncing={isSyncing}
            />
          )}

          {activeTab === 'users' && (
            <UsersPage
              onNavigateToAttendance={(empNo) => {
                setAttendanceEmployeeNo(empNo);
                setActiveTab('attendance');
              }}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendancePage initialEmployeeNo={attendanceEmployeeNo} />
          )}

          {activeTab === 'device' && <DevicePage />}
        </main>
      </div>
    </div>
  );
};

export default App;
