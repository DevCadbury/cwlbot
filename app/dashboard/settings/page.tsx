'use client';

import { useState } from 'react';
import { Save, Key } from 'lucide-react';
import AnimatedPanel from '@/components/ui/AnimatedPanel';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { apiChangePassword, apiUpdateLinkedPlayer } from '@/lib/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const [playerTag, setPlayerTag] = useState(user?.linkedPlayerTag || '');
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerMsg, setPlayerMsg] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleUpdatePlayer = async () => {
    setPlayerLoading(true);
    setPlayerMsg('');
    try {
      await apiUpdateLinkedPlayer(playerTag.toUpperCase());
      setPlayerMsg('Player tag updated successfully');
    } catch (err: any) {
      setPlayerMsg(err.message || 'Failed to update');
    } finally {
      setPlayerLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordMsg('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      await apiChangePassword(currentPassword, newPassword);
      setPasswordMsg('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Phone
                </label>
                <p className="font-mono text-sm text-slate-800">{user?.phone || '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Roles
                </label>
                <div className="flex gap-1 flex-wrap">
                  {(user?.roles || []).map((role: string) => (
                    <span
                      key={role}
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        role === 'superadmin'
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
              </div>
              <Input
                label="Linked Player Tag"
                placeholder="#ABCDE1234"
                value={playerTag}
                onChange={(e) => setPlayerTag(e.target.value)}
              />
              {playerMsg && (
                <p
                  className={`text-sm ${
                    playerMsg.includes('success')
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}
                >
                  {playerMsg}
                </p>
              )}
              <Button onClick={handleUpdatePlayer} disabled={playerLoading}>
                {playerLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Player Tag
                  </>
                )}
              </Button>
            </div>
          </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Change Password</h2>
            <div className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={passwordError}
              />
              {passwordMsg && (
                <p className="text-sm text-emerald-600">{passwordMsg}</p>
              )}
              <Button
                onClick={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </>
                )}
              </Button>
            </div>
          </div>
      </div>
    </div>
  );
}
