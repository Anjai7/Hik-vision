import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Fingerprint,
  ScanFace,
  CreditCard,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { usersApi, GetUsersParams } from '../api/usersApi';
import { UserData } from '../types';
import { Badge } from '../components/ui/Badge';
import { Pagination } from '../components/ui/Pagination';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [bioFilter, setBioFilter] = useState<'all' | 'fp' | 'face' | 'card'>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: GetUsersParams = {
        page,
        limit: 20,
        search: search.trim() || undefined,
      };

      if (bioFilter === 'fp') params.hasFP = true;
      if (bioFilter === 'face') params.hasFace = true;
      if (bioFilter === 'card') params.hasCard = true;

      const res = await usersApi.getUsers(params);
      setUsers(res.users);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, bioFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleSyncUsers = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSuccessMsg(null);
      const result = await usersApi.syncUsers();
      setSuccessMsg(`Successfully synchronized ${result.count} users from terminal in ${result.durationMs}ms`);
      setPage(1);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to synchronize users from terminal');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      {/* Notice Banner */}
      <div className="alert-banner" style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', color: '#93c5fd' }}>
        <Info size={18} />
        <span>
          User profiles and credentials are read directly from the Hikvision terminal. Remote biometric enrollment is intentionally disabled until hardware write endpoints are verified.
        </span>
      </div>

      {error && (
        <div className="alert-banner alert-error">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert-banner alert-success">
          <RefreshCw size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="table-card">
        <div className="table-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} color="#3b82f6" />
            <div>
              <div className="table-title">Registered Terminal Users</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Total: {pagination.total} employees recorded
              </div>
            </div>
          </div>

          <div className="table-filters">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Search name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '180px' }}
              />
              <button type="submit" className="btn btn-secondary" style={{ padding: '8px 12px' }}>
                <Search size={14} />
              </button>
            </form>

            {/* Biometric filter */}
            <select
              className="select-field"
              value={bioFilter}
              onChange={(e) => {
                setBioFilter(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="all">All Biometrics</option>
              <option value="fp">Has Fingerprint</option>
              <option value="face">Has Face</option>
              <option value="card">Has Card</option>
            </select>

            <button
              className="btn btn-primary"
              onClick={handleSyncUsers}
              disabled={syncing}
            >
              <RefreshCw size={14} className={syncing ? 'spinner' : ''} />
              {syncing ? 'Syncing...' : 'Sync Users'}
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee No</th>
                <th>Full Name</th>
                <th>User Type</th>
                <th>Fingerprint</th>
                <th>Face Profile</th>
                <th>Card</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>
                    <div className="spinner" style={{ margin: '0 auto 8px auto' }} />
                    <span style={{ color: 'var(--text-muted)' }}>Loading users...</span>
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {user.employeeNo}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{user.name}</td>
                    <td>
                      <Badge variant="neutral">{user.userType}</Badge>
                    </td>
                    <td>
                      {user.numOfFP > 0 ? (
                        <Badge variant="success">
                          <Fingerprint size={12} /> {user.numOfFP} Enrolled
                        </Badge>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>
                      )}
                    </td>
                    <td>
                      {user.numOfFace > 0 ? (
                        <Badge variant="info">
                          <ScanFace size={12} /> {user.numOfFace} Enrolled
                        </Badge>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>
                      )}
                    </td>
                    <td>
                      {user.numOfCard > 0 ? (
                        <Badge variant="warning">
                          <CreditCard size={12} /> {user.numOfCard} Enrolled
                        </Badge>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>
                      )}
                    </td>
                    <td>
                      {user.enabled ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Disabled</Badge>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No users found matching your query. Click "Sync Users" to fetch from device.
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
    </div>
  );
};
