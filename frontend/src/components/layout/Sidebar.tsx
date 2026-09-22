import React from 'react';
import { LayoutDashboard, Users, CalendarCheck, Cpu, ShieldCheck } from 'lucide-react';

export type NavTab = 'dashboard' | 'users' | 'attendance' | 'device';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  deviceModel?: string;
  firmware?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  deviceModel = 'DS-K1T320MFWX',
  firmware = 'V3.5.2',
}) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'users', label: 'Users', icon: <Users size={18} /> },
    { id: 'attendance', label: 'Attendance Logs', icon: <CalendarCheck size={18} /> },
    { id: 'device', label: 'Device & ISAPI', icon: <Cpu size={18} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">
          <ShieldCheck size={20} />
        </div>
        <div className="logo-text">
          <h1>Hikvision Attendance</h1>
          <p>ISAPI Standalone Prototype</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
            style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left' }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="device-badge-mini">
          <div className="title">Connected Terminal</div>
          <div className="model">{deviceModel}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {firmware}
          </div>
        </div>
      </div>
    </aside>
  );
};
