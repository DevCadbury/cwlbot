'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Users as UsersIcon,
  Shield,
  Trash2,
  Edit,
  Key,
} from 'lucide-react';
import AnimatedPanel from '@/components/ui/AnimatedPanel';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import DataTable from '@/components/ui/DataTable';
import {
  apiListUsers,
  apiUpdateUserRoles,
  apiDeleteUser,
  apiResetUserPassword,
} from '@/lib/api';

const ROLE_OPTIONS = ['user', 'admin', 'superadmin'] as const;

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiListUsers({ page, limit: 20, search });
      setUsers(res.users || res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const handleUpdateRoles = async () => {
    if (!editUser) return;
    setEditLoading(true);
    try {
      await apiUpdateUserRoles(editUser.phone, editRoles);
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Failed to update roles', err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (userPhone: string) => {
    if (!confirm('Delete this user? This action cannot be undone.')) return;
    try {
      await apiDeleteUser(userPhone);
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user', err);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser || !resetPassword) return;
    setResetLoading(true);
    try {
      await apiResetUserPassword(resetUser.phone, resetPassword);
      setResetUser(null);
      setResetPassword('');
    } catch (err) {
      console.error('Failed to reset password', err);
    } finally {
      setResetLoading(false);
    }
  };

  const columns = [
    {
      key: 'phone',
      header: 'Phone',
      render: (user: any) => (
        <span className="font-mono text-sm">{user.phone}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (user: any) => user.name || '—',
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (user: any) => (
        <div className="flex gap-1">
          {(user.roles || []).map((role: string) => (
            <span
              key={role}
              className={`text-xs px-2 py-0.5 rounded-full ${role === 'superadmin'
                  ? 'bg-red-100 text-red-700'
                  : role === 'admin'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
            >
              {role}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'linkedPlayer',
      header: 'Linked Player',
      render: (user: any) => (
        <span className="font-mono text-sm text-slate-500">
          {user.linkedPlayerTag || user.linkedPlayer?.playerTag || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: any) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setEditUser(user);
              setEditRoles(user.roles || ['user']);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
            title="Edit roles"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setResetUser(user)}
            className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors text-slate-400 hover:text-amber-600"
            title="Reset password"
          >
            <Key className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(user.phone)}
            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-slate-400 hover:text-red-600"
            title="Delete user"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Manage registered users and their roles
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by phone or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={handleSearch}>
          Search
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <DataTable data={users} columns={columns} />
      )}

      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Edit Roles Modal */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title={`Edit Roles — ${editUser?.phone || ''}`}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {ROLE_OPTIONS.map((role) => (
              <label
                key={role}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={editRoles.includes(role)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEditRoles([...editRoles, role]);
                    } else {
                      setEditRoles(editRoles.filter((r) => r !== role));
                    }
                  }}
                  className="rounded border-neutral-600"
                />
                <span className="capitalize">{role}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRoles} disabled={editLoading}>
              {editLoading ? <LoadingSpinner size="sm" /> : 'Save Roles'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={!!resetUser}
        onClose={() => {
          setResetUser(null);
          setResetPassword('');
        }}
        title={`Reset Password — ${resetUser?.phone || ''}`}
      >
        <div className="space-y-4">
          <Input
            label="New Password"
            type="password"
            placeholder="Enter new password (min 6 chars)"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setResetUser(null);
                setResetPassword('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetLoading || resetPassword.length < 6}
            >
              {resetLoading ? <LoadingSpinner size="sm" /> : 'Reset Password'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
