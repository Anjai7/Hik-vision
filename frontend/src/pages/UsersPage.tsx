import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Fingerprint,
  ScanFace,
  CreditCard,
  UserPlus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Shield,
  ShieldOff,
  Clock,
  RefreshCw,
  Check,
  Calendar,
  Key,
} from 'lucide-react';
import { usersApi, GetUsersParams, CreateUserPayload, UpdateUserPayload } from '../api/usersApi';
import { UserData } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';

export interface UsersPageProps {
  onNavigateToAttendance?: (employeeNo: string) => void;
}

export const UsersPage: React.FC<UsersPageProps> = ({ onNavigateToAttendance }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [bioFilter, setBioFilter] = useState<'all' | 'fp' | 'face' | 'card'>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFPModalOpen, setIsFPModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  // Fingerprint Enrollment state
  const [userFingerprints, setUserFingerprints] = useState<
    Array<{ cardReaderNo: number; fingerPrintID: number; fingerType: string }>
  >([]);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpCapturing, setFpCapturing] = useState(false);
  const [selectedFingerNo, setSelectedFingerNo] = useState(1);
  const [fpFeedback, setFpFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Access period state for terminal configuration
  const [periodData, setPeriodData] = useState<{
    validFrom: string;
    validTo: string;
    enabled: boolean;
  }>({
    validFrom: '',
    validTo: '',
    enabled: true,
  });

  // Form states
  const [formData, setFormData] = useState<CreateUserPayload>({
    employeeNo: '',
    name: '',
    userType: 'normal',
    gender: 'male',
    enabled: true,
    groupId: 1,
    numOfCard: 0,
    validFrom: '',
    validTo: '',
  });

  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

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

  // Open Add Modal
  const openAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFormData({
      employeeNo: '',
      name: '',
      userType: 'normal',
      gender: 'male',
      enabled: true,
      groupId: 1,
      numOfCard: 0,
      validFrom: today,
      validTo: nextYear,
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (user: UserData) => {
    setSelectedUser(user);
    setFormData({
      employeeNo: user.employeeNo,
      name: user.name,
      userType: user.userType || 'normal',
      gender: user.gender || 'male',
      enabled: user.enabled,
      groupId: user.groupId || 1,
      numOfCard: user.numOfCard || 0,
      validFrom: user.validFrom ? new Date(user.validFrom).toISOString().split('T')[0] : '',
      validTo: user.validTo ? new Date(user.validTo).toISOString().split('T')[0] : '',
    });
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (user: UserData) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Open Access Period Modal
  const openPeriodModal = (user: UserData) => {
    setSelectedUser(user);
    const today = new Date().toISOString().split('T')[0];
    const fromStr = user.validFrom ? new Date(user.validFrom).toISOString().split('T')[0] : today;
    const toStr = user.validTo ? new Date(user.validTo).toISOString().split('T')[0] : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setPeriodData({
      validFrom: fromStr,
      validTo: toStr,
      enabled: user.enabled,
    });
    setIsPeriodModalOpen(true);
  };

  // Save Custom Access Period Directly to Physical Terminal & DB
  const handleSaveAccessPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      setError(null);
      await usersApi.setAccessPeriod(selectedUser.employeeNo, {
        validFrom: periodData.validFrom,
        validTo: periodData.validTo,
        enabled: periodData.enabled,
      });
      setSuccessMsg(`Access validity period for '${selectedUser.name}' (ID: ${selectedUser.employeeNo}) configured and synced directly to terminal.`);
      setIsPeriodModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update access period on physical terminal');
    } finally {
      setActionLoading(false);
    }
  };

  // Sync Directly From Physical Terminal
  const handleSyncFromDevice = async () => {
    try {
      setSyncLoading(true);
      setError(null);
      const res = await usersApi.syncUsers();
      setSuccessMsg(`Synchronized ${res.count} employees from terminal hardware memory (${res.durationMs}ms).`);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to sync with terminal hardware');
    } finally {
      setSyncLoading(false);
    }
  };

  // Open Fingerprint Enrollment Modal
  const openFPModal = async (user: UserData) => {
    setSelectedUser(user);
    setIsFPModalOpen(true);
    setFpFeedback(null);
    setSelectedFingerNo(1);
    try {
      setFpLoading(true);
      const fps = await usersApi.getUserFingerprints(user.employeeNo);
      setUserFingerprints(fps || []);
    } catch {
      setUserFingerprints([]);
    } finally {
      setFpLoading(false);
    }
  };

  // Trigger Hardware Fingerprint Capture
  const handleCaptureFingerprint = async () => {
    if (!selectedUser) return;
    try {
      setFpCapturing(true);
      setFpFeedback({
        type: 'info',
        text: 'Terminal sensor is now ACTIVE! Place employee\'s finger firmly on the optical scanner now...',
      });
      const result = await usersApi.captureFingerprint(selectedUser.employeeNo, selectedFingerNo);
      setFpFeedback({
        type: 'success',
        text: `Fingerprint #${selectedFingerNo} captured & enrolled directly into terminal memory!${result.fingerPrintQuality ? ` (Quality: ${result.fingerPrintQuality}%)` : ''}`,
      });
      // Refresh fingerprints list and users list
      const fps = await usersApi.getUserFingerprints(selectedUser.employeeNo);
      setUserFingerprints(fps || []);
      await fetchUsers();
    } catch (err: any) {
      setFpFeedback({
        type: 'error',
        text: err.message || 'Fingerprint capture timed out or failed. Please try again.',
      });
    } finally {
      setFpCapturing(false);
    }
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeNo || !formData.name) {
      setError('Employee ID and Name are required');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await usersApi.createUser(formData);
      setSuccessMsg(`Employee '${formData.name}' (ID: ${formData.employeeNo}) added successfully.`);
      setIsAddModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to add employee');
    } finally {
      setActionLoading(false);
    }
  };

  // Update User Handler
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      setError(null);
      const payload: UpdateUserPayload = {
        name: formData.name,
        userType: formData.userType,
        gender: formData.gender,
        enabled: formData.enabled,
        groupId: formData.groupId,
        validFrom: formData.validFrom || null,
        validTo: formData.validTo || null,
      };
      await usersApi.updateUser(selectedUser.employeeNo, payload);
      setSuccessMsg(`Employee '${formData.name}' updated successfully.`);
      setIsEditModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update employee');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete User Handler
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      setError(null);
      await usersApi.deleteUser(selectedUser.employeeNo);
      setSuccessMsg(`Employee '${selectedUser.name}' removed successfully.`);
      setIsDeleteModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete employee');
    } finally {
      setActionLoading(false);
    }
  };

  // Expire User Access (Blocks on terminal)
  const handleExpireUser = async (user: UserData) => {
    try {
      setActionLoading(true);
      await usersApi.expireUser(user.employeeNo);
      setSuccessMsg(`Terminal validity for '${user.name}' expired. Access will be blocked on physical terminal.`);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to expire user');
    } finally {
      setActionLoading(false);
    }
  };

  // Grant Access (Extends validity)
  const handleGrantAccess = async (user: UserData, years = 1) => {
    try {
      setActionLoading(true);
      await usersApi.grantAccess(user.employeeNo, years);
      setSuccessMsg(`Granted ${years} year(s) terminal access for '${user.name}'.`);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to extend access');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Toggle Status Handler
  const handleToggleStatus = async (user: UserData) => {
    try {
      const nextStatus = !user.enabled;
      await usersApi.toggleStatus(user.employeeNo, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.employeeNo === user.employeeNo ? { ...u, enabled: nextStatus } : u))
      );
      setSuccessMsg(
        `Access for '${user.name}' has been ${nextStatus ? 'activated' : 'suspended'}.`
      );
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to change access status');
    }
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

      {/* Main Container */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="card-title">Employee & Access Management</h2>
            <p className="card-subtitle">Manage enrolled employees, credential access permissions, and profiles</p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-outline"
              onClick={handleSyncFromDevice}
              disabled={syncLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              title="Query terminal user endpoint directly to refresh all users"
            >
              <RefreshCw size={16} className={syncLoading ? 'spin' : ''} />
              <span>{syncLoading ? 'Syncing...' : 'Sync Device'}</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={openAddModal}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <UserPlus size={16} />
              <span>Add Employee</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search name or ID..."
                className="input-field"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '32px', width: '220px' }}
              />
            </div>
            <button type="submit" className="btn btn-secondary">Search</button>
          </form>

          {/* Biometric filter buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['all', 'face', 'card', 'fp'] as const).map((mode) => (
              <button
                key={mode}
                className={`btn ${bioFilter === mode ? 'btn-secondary' : 'btn-outline'}`}
                style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderColor: bioFilter === mode ? 'var(--primary-color)' : undefined,
                  textTransform: 'capitalize',
                }}
                onClick={() => {
                  setBioFilter(mode);
                  setPage(1);
                }}
              >
                {mode === 'all' ? 'All Employees' : mode === 'fp' ? 'Fingerprint' : mode}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Full Name</th>
                <th>Access Status</th>
                <th>Valid Period & Terminal Access</th>
                <th>Role / Type</th>
                <th>Enrolled Biometrics</th>
                <th>Department</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px' }}>
                    <div className="spinner" style={{ margin: '0 auto 8px auto' }} />
                    <span style={{ color: 'var(--text-muted)' }}>Loading employee roster...</span>
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Badge variant="neutral">{u.employeeNo}</Badge>
                    </td>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className="btn btn-outline"
                        style={{
                          padding: '3px 10px',
                          borderRadius: '20px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: u.enabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          borderColor: u.enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                          color: u.enabled ? '#10b981' : '#ef4444',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                        title="Click to toggle access active/disabled"
                      >
                        {u.enabled ? <Shield size={12} /> : <ShieldOff size={12} />}
                        <span>{u.enabled ? 'Active' : 'Suspended'}</span>
                      </button>
                    </td>
                    <td>
                      {(() => {
                        const isExpired = !u.enabled || (u.validTo && new Date(u.validTo) < new Date());
                        const dateStr = u.validTo ? new Date(u.validTo).toLocaleDateString() : 'No expiry';
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Badge variant={isExpired ? 'danger' : 'success'}>
                                <Clock size={11} style={{ marginRight: '4px' }} />
                                {isExpired ? 'Expired / Blocked' : `Valid to ${dateStr}`}
                              </Badge>
                              {u.terminalSyncStatus === 'PENDING' ? (
                                <span style={{ fontSize: '11px', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '3px' }} title="Change queued for physical terminal sync">
                                  <RefreshCw size={10} /> Pending
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px' }} title="Synced to terminal memory">
                                  <Check size={10} /> Synced
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                              {isExpired ? (
                                <button
                                  onClick={() => handleGrantAccess(u, 1)}
                                  className="btn btn-outline"
                                  style={{ fontSize: '10.5px', padding: '1px 6px', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)', borderRadius: '4px' }}
                                  title="Extend validity +1 year to re-enable access"
                                >
                                  Grant 1 Year
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleExpireUser(u)}
                                  className="btn btn-outline"
                                  style={{ fontSize: '10.5px', padding: '1px 6px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', borderRadius: '4px' }}
                                  title="Expire validity on terminal (blocks scan & keeps door locked)"
                                >
                                  Expire (Block)
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                        {u.userType || 'Normal'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Badge variant={u.numOfFace > 0 ? 'success' : 'neutral'}>
                          <ScanFace size={11} style={{ marginRight: '4px' }} />
                          Face ({u.numOfFace})
                        </Badge>
                        <Badge variant={u.numOfCard > 0 ? 'info' : 'neutral'}>
                          <CreditCard size={11} style={{ marginRight: '4px' }} />
                          Card ({u.numOfCard})
                        </Badge>
                        <span
                          style={{ cursor: 'pointer', display: 'inline-flex' }}
                          onClick={() => openFPModal(u)}
                          title="Click to manage fingerprints on terminal"
                        >
                          <Badge variant={u.numOfFP > 0 ? 'success' : 'neutral'}>
                            <Fingerprint size={11} style={{ marginRight: '4px' }} />
                            FP ({u.numOfFP})
                          </Badge>
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      Group {u.groupId ?? 1}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          className="btn btn-outline"
                          style={{
                            padding: '4px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            borderColor: 'rgba(59, 130, 246, 0.4)',
                            color: '#60a5fa',
                          }}
                          onClick={() => openFPModal(u)}
                          title="Capture & Enroll Fingerprint on Physical Terminal"
                        >
                          <Fingerprint size={12} />
                          <span>FP</span>
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                          onClick={() => onNavigateToAttendance?.(u.employeeNo)}
                          title="View Attendance History for this Employee"
                        >
                          <Clock size={12} />
                          <span>Attendance</span>
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                          onClick={() => openPeriodModal(u)}
                          title="Configure Access Period & Terminal Expiry"
                        >
                          <Calendar size={12} />
                          <span>Access</span>
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '5px 8px' }}
                          onClick={() => openEditModal(u)}
                          title="Edit Employee Details"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '5px 8px', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                          onClick={() => openDeleteModal(u)}
                          title="Remove Employee"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    <Users size={32} style={{ margin: '0 auto 10px auto', color: 'var(--text-muted)' }} />
                    <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>No employees found</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Click "Add Employee" above to enroll a new team member.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* ADD EMPLOYEE MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        title="Add New Employee"
        onClose={() => setIsAddModalOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateUser} disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
              Employee ID <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 102"
              className="input-field"
              value={formData.employeeNo}
              onChange={(e) => setFormData({ ...formData, employeeNo: e.target.value })}
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              This must match the ID used at the terminal for automatic punch pairing.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
              Full Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Morgan"
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Role / Type
              </label>
              <select
                className="select-field"
                value={formData.userType}
                onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="normal">Normal Staff</option>
                <option value="visitor">Visitor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Gender
              </label>
              <select
                className="select-field"
                value={formData.gender || 'male'}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Valid From
              </label>
              <input
                type="date"
                className="input-field"
                value={formData.validFrom || ''}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Valid Until (Terminal Expiry)
              </label>
              <input
                type="date"
                className="input-field"
                value={formData.validTo || ''}
                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '11.5px', padding: '3px 8px' }}
              onClick={() => {
                const now = new Date().toISOString().split('T')[0];
                const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                setFormData({ ...formData, enabled: true, validFrom: now, validTo: nextYear });
              }}
            >
              Grant 1 Year
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '11.5px', padding: '3px 8px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
              onClick={() => {
                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                setFormData({ ...formData, enabled: false, validTo: yesterday });
              }}
            >
              Expire Now (Block Terminal)
            </button>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
              Access Permission
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              />
              <span>Allow terminal access and check-in</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* EDIT EMPLOYEE MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        title={`Edit Employee (${selectedUser?.employeeNo})`}
        onClose={() => setIsEditModalOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="btn btn-outline" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpdateUser} disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Update Details'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
              Full Name
            </label>
            <input
              type="text"
              required
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Role / Type
              </label>
              <select
                className="select-field"
                value={formData.userType}
                onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="normal">Normal Staff</option>
                <option value="visitor">Visitor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Gender
              </label>
              <select
                className="select-field"
                value={formData.gender || 'male'}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Valid From
              </label>
              <input
                type="date"
                className="input-field"
                value={formData.validFrom || ''}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Valid Until (Terminal Expiry)
              </label>
              <input
                type="date"
                className="input-field"
                value={formData.validTo || ''}
                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '11.5px', padding: '3px 8px' }}
              onClick={() => {
                const now = new Date().toISOString().split('T')[0];
                const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                setFormData({ ...formData, enabled: true, validFrom: now, validTo: nextYear });
              }}
            >
              Grant 1 Year
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '11.5px', padding: '3px 8px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
              onClick={() => {
                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                setFormData({ ...formData, enabled: false, validTo: yesterday });
              }}
            >
              Expire Now (Block Terminal)
            </button>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
              Access Permission Status
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              />
              <span>Active (Granted Access)</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        title="Remove Employee"
        onClose={() => setIsDeleteModalOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="btn btn-outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              style={{ background: '#ef4444', borderColor: '#ef4444' }}
              onClick={handleDeleteUser}
              disabled={actionLoading}
            >
              {actionLoading ? 'Deleting...' : 'Delete Employee'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', color: '#ef4444' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>
              Are you sure you want to remove {selectedUser?.name}?
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
              Employee ID <strong>{selectedUser?.employeeNo}</strong> will be deleted from the database.
            </p>
          </div>
        </div>
      </Modal>

      {/* ACCESS PERIOD CONFIGURATION MODAL (SYNCED TO PHYSICAL TERMINAL) */}
      <Modal
        isOpen={isPeriodModalOpen}
        title={`Set Terminal Access Period — ${selectedUser?.name} (#${selectedUser?.employeeNo})`}
        onClose={() => setIsPeriodModalOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button className="btn btn-outline" onClick={() => setIsPeriodModalOpen(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSaveAccessPeriod}
              disabled={actionLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Key size={14} />
              <span>{actionLoading ? 'Pushing to Terminal...' : 'Sync & Save to Terminal'}</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveAccessPeriod} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '10px 14px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>
              Physical Hardware Sync Guaranteed
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Changes will be pushed directly to the terminal's memory via ISAPI. Setting an expired date or unchecking active access ensures the turnstile/door will block this employee on the physical reader.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Valid From
              </label>
              <input
                type="date"
                required
                className="input-field"
                value={periodData.validFrom}
                onChange={(e) => setPeriodData({ ...periodData, validFrom: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>
                Valid Until (Terminal Expiry)
              </label>
              <input
                type="date"
                required
                className="input-field"
                value={periodData.validTo}
                onChange={(e) => setPeriodData({ ...periodData, validTo: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Quick Presets:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { label: '+1 Month', days: 30 },
                { label: '+3 Months', days: 90 },
                { label: '+6 Months', days: 182 },
                { label: '+1 Year', days: 365 },
                { label: '+3 Years', days: 1095 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '11.5px', padding: '4px 8px' }}
                  onClick={() => {
                    const now = new Date();
                    const fromStr = now.toISOString().split('T')[0];
                    const future = new Date(now.getTime() + preset.days * 24 * 60 * 60 * 1000);
                    const toStr = future.toISOString().split('T')[0];
                    setPeriodData({ validFrom: fromStr, validTo: toStr, enabled: true });
                  }}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '11.5px', padding: '4px 8px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                onClick={() => {
                  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  setPeriodData({ ...periodData, validTo: yesterday, enabled: false });
                }}
              >
                🚫 Block / Expire Now
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={periodData.enabled}
                onChange={(e) => setPeriodData({ ...periodData, enabled: e.target.checked })}
              />
              <span>Terminal Access Enabled (Allow Face / Card / PIN Unlock)</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* Fingerprint Enrollment Modal */}
      <Modal
        isOpen={isFPModalOpen}
        title={`Fingerprint Management — ${selectedUser?.name} (#${selectedUser?.employeeNo})`}
        onClose={() => {
          if (!fpCapturing) setIsFPModalOpen(false);
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Hardware: DS-K1T320MFWX (192.168.18.229)
            </span>
            <button
              className="btn btn-outline"
              onClick={() => setIsFPModalOpen(false)}
              disabled={fpCapturing}
            >
              Close
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Info */}
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(59, 130, 246, 0.08)',
              borderRadius: '8px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
                flexShrink: 0,
              }}
            >
              <Fingerprint size={22} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                Physical Terminal Optical Sensor Enrollment
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Calls terminal <code style={{ color: '#60a5fa' }}>/ISAPI/AccessControl/CaptureFingerPrint</code> directly.
              </p>
            </div>
          </div>

          {/* Feedback banner */}
          {fpFeedback && (
            <div
              className={`alert-banner ${
                fpFeedback.type === 'success'
                  ? 'alert-success'
                  : fpFeedback.type === 'error'
                  ? 'alert-danger'
                  : 'alert-info'
              }`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                borderRadius: '6px',
              }}
            >
              {fpFeedback.type === 'success' && <CheckCircle2 size={16} />}
              {fpFeedback.type === 'error' && <AlertTriangle size={16} />}
              {fpFeedback.type === 'info' && <RefreshCw size={16} className="spin" />}
              <span>{fpFeedback.text}</span>
            </div>
          )}

          {/* Currently Enrolled Fingerprints on Physical Device */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Enrolled Device Fingerprints ({userFingerprints.length})
              </span>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={async () => {
                  if (selectedUser) {
                    setFpLoading(true);
                    const fps = await usersApi.getUserFingerprints(selectedUser.employeeNo);
                    setUserFingerprints(fps || []);
                    setFpLoading(false);
                  }
                }}
                disabled={fpLoading}
              >
                <RefreshCw size={10} className={fpLoading ? 'spin' : ''} style={{ marginRight: '4px' }} />
                Refresh from Terminal
              </button>
            </div>

            {fpLoading ? (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <div className="spinner" style={{ margin: '0 auto 6px auto' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Querying terminal memory...</span>
              </div>
            ) : userFingerprints.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {userFingerprints.map((fp) => (
                  <div
                    key={fp.fingerPrintID}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Fingerprint size={16} style={{ color: '#10b981' }} />
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>
                          Fingerprint Slot #{fp.fingerPrintID}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                          Type: {fp.fingerType} | Reader: #{fp.cardReaderNo}
                        </span>
                      </div>
                    </div>
                    <Badge variant="success">Active on Terminal</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(255, 255, 255, 0.01)', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  No fingerprints enrolled on physical device for this employee yet.
                </p>
              </div>
            )}
          </div>

          {/* New Enrollment Action */}
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              background: fpCapturing ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
              border: fpCapturing ? '1px solid #3b82f6' : '1px solid var(--border-color)',
              transition: 'all 0.3s ease',
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13.5px', fontWeight: 600 }}>
              Live Hardware Sensor Capture
            </h4>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <label style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Finger Slot:</label>
              <select
                className="input-field"
                value={selectedFingerNo}
                onChange={(e) => setSelectedFingerNo(Number(e.target.value))}
                disabled={fpCapturing}
                style={{ width: '130px', padding: '5px 10px', fontSize: '12.5px' }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    Finger #{n}
                  </option>
                ))}
              </select>
            </div>

            {fpCapturing ? (
              <div
                style={{
                  padding: '16px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  borderRadius: '8px',
                  border: '1px dashed #3b82f6',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div className="spinner" style={{ width: '28px', height: '28px' }} />
                <span style={{ fontWeight: 600, color: '#60a5fa', fontSize: '14px' }}>
                  Terminal Sensor Activated!
                </span>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', maxWidth: '380px' }}>
                  Please place employee's finger flat and firmly on the terminal glass sensor now. Waiting for device read (up to 25s)...
                </span>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCaptureFingerprint}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                }}
              >
                <Fingerprint size={18} />
                <span>Activate Terminal Sensor & Capture</span>
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
