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
} from 'lucide-react';
import { usersApi, GetUsersParams, CreateUserPayload, UpdateUserPayload } from '../api/usersApi';
import { UserData } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';

export const UsersPage: React.FC = () => {
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState<CreateUserPayload>({
    employeeNo: '',
    name: '',
    userType: 'normal',
    gender: 'male',
    enabled: true,
    groupId: 1,
    numOfCard: 0,
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
    setFormData({
      employeeNo: '',
      name: '',
      userType: 'normal',
      gender: 'male',
      enabled: true,
      groupId: 1,
      numOfCard: 0,
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
    });
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (user: UserData) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
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

          <button
            className="btn btn-primary"
            onClick={openAddModal}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <UserPlus size={16} />
            <span>Add Employee</span>
          </button>
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
                <th>Role / Type</th>
                <th>Enrolled Biometrics</th>
                <th>Department</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>
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
                        <Badge variant={u.numOfFP > 0 ? 'success' : 'neutral'}>
                          <Fingerprint size={11} style={{ marginRight: '4px' }} />
                          FP ({u.numOfFP})
                        </Badge>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      Group {u.groupId ?? 1}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '5px 8px' }}
                          onClick={() => openEditModal(u)}
                          title="Edit Employee"
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
    </div>
  );
};
