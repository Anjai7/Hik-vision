import React from 'react';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface TopbarProps {
  title: string;
  isOnline: boolean | null;
  isSyncing: boolean;
  onQuickSync: () => void;
  lastSyncAt?: string | null;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  isOnline,
  isSyncing,
  onQuickSync,
  lastSyncAt,
}) => {
  return (
    <header className="topbar">
      <div className="page-title">{title}</div>

      <div className="topbar-actions">
        {/* Live Status Indicator */}
        {isOnline === null ? (
          <Badge variant="neutral">
            <span className="spinner" style={{ width: '12px', height: '12px' }} /> Checking terminal...
          </Badge>
        ) : isOnline ? (
          <Badge variant="success">
            <CheckCircle2 size={13} /> Terminal Online
          </Badge>
        ) : (
          <Badge variant="danger">
            <XCircle size={13} /> Terminal Offline
          </Badge>
        )}

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#34d399',
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '3px 9px',
            borderRadius: '9999px',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
          title="Events and data update automatically in the background"
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 6px #10b981',
              display: 'inline-block',
            }}
          />
          Live
        </span>

        {lastSyncAt && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Synced: {new Date(lastSyncAt).toLocaleTimeString()}
          </span>
        )}

        <button
          className="btn btn-secondary"
          onClick={onQuickSync}
          disabled={isSyncing}
          title="Synchronize Users & Events"
        >
          <RefreshCw size={15} className={isSyncing ? 'spinner' : ''} />
          {isSyncing ? 'Syncing...' : 'Sync All'}
        </button>
      </div>
    </header>
  );
};
