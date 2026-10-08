import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  Trash2, 
  ShieldCheck, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  User, 
  Lock 
} from 'lucide-react';
import type { AuthUser, NewUserPayload } from '../types';
import { fetchUsers, createUser, deleteUser } from '../services/api';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New User Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR');

  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load user directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setShowAddForm(false);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim() || !username.trim() || !password) {
      setErrorMessage('Full name, username, and password are required.');
      return;
    }

    setIsCreating(true);
    try {
      const payload: NewUserPayload = {
        full_name: fullName.trim(),
        username: username.trim(),
        password,
        role,
      };

      await createUser(payload);
      setSuccessMessage(`Account for "${fullName}" created successfully!`);
      setFullName('');
      setUsername('');
      setPassword('');
      setRole('OPERATOR');
      setShowAddForm(false);
      await loadUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create user account.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (userToDelete: AuthUser) => {
    if (userToDelete.id === currentUser?.id) {
      setErrorMessage('You cannot delete your own active administrator account.');
      return;
    }

    if (!confirm(`Are you sure you want to delete staff account "${userToDelete.username}"?`)) {
      return;
    }

    try {
      await deleteUser(userToDelete.id);
      setSuccessMessage(`User "${userToDelete.username}" was removed.`);
      await loadUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete user.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div 
        className="relative w-full max-w-2xl bg-tm-midnight border border-tm-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-tm-border bg-tm-slate/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-tm-orange/15 border border-tm-orange/30 text-tm-orange">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Staff User Administration (RBAC)
              </h2>
              <p className="text-xs text-tm-muted">
                Manage operator credentials and administrative access privileges
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-tm-muted hover:text-white hover:bg-tm-slate transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-tm-red/15 border border-tm-red/40 text-tm-red text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-tm-green/15 border border-tm-green/40 text-tm-green text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-tm-muted">
              Active User Directory ({users.length})
            </h3>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 rounded-lg bg-tm-orange/15 hover:bg-tm-orange text-tm-orange hover:text-white border border-tm-orange/30 text-xs font-semibold flex items-center space-x-1.5 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel Form' : 'Add New Staff'}</span>
            </button>
          </div>

          {/* Add User Drawer / Form */}
          {showAddForm && (
            <form onSubmit={handleCreateUser} className="p-4 rounded-xl bg-tm-slate/60 border border-tm-border space-y-3 animate-fade-in">
              <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <UserPlus className="w-4 h-4 text-tm-orange" />
                <span>Create Staff User Account</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-tm-muted mb-1 font-medium">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full bg-tm-midnight border border-tm-border rounded-lg px-3 py-2 text-white placeholder-tm-muted focus:outline-none focus:border-tm-orange"
                  />
                </div>

                <div>
                  <label className="block text-tm-muted mb-1 font-medium">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. sjenkins"
                    className="w-full bg-tm-midnight border border-tm-border rounded-lg px-3 py-2 text-white placeholder-tm-muted focus:outline-none focus:border-tm-orange font-mono"
                  />
                </div>

                <div>
                  <label className="block text-tm-muted mb-1 font-medium">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-tm-midnight border border-tm-border rounded-lg px-3 py-2 text-white placeholder-tm-muted focus:outline-none focus:border-tm-orange font-mono"
                  />
                </div>

                <div>
                  <label className="block text-tm-muted mb-1 font-medium">Assigned Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'ADMIN' | 'OPERATOR')}
                    className="w-full bg-tm-midnight border border-tm-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-tm-orange cursor-pointer"
                  >
                    <option value="OPERATOR">OPERATOR (Monitoring Only)</option>
                    <option value="ADMIN">ADMIN (Full Matrix Management)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-tm-orange to-tm-flame hover:brightness-110 text-white font-bold text-xs flex items-center space-x-2 shadow-md shadow-tm-orange/30 disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Users Table */}
          <div className="rounded-xl bg-tm-slate/40 border border-tm-border overflow-hidden">
            {isLoading && users.length === 0 ? (
              <div className="p-8 text-center text-xs text-tm-muted flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-tm-orange" />
                <span>Loading users...</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-tm-slate/80 text-tm-muted uppercase text-[10px] font-bold tracking-wider border-b border-tm-border">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tm-border/40 text-slate-300">
                  {users.map((u) => {
                    const isAdmin = u.role === 'ADMIN';
                    const isSelf = u.id === currentUser?.id;

                    return (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-semibold text-white">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white font-bold">
                              {u.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span>{u.full_name}</span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-normal">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-tm-muted">
                          @{u.username}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center space-x-1 w-max ${
                              isAdmin
                                ? 'bg-tm-orange/15 text-tm-orange border border-tm-orange/30'
                                : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                            <span>{u.role}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-lg bg-tm-red/15 hover:bg-tm-red text-tm-red hover:text-white border border-tm-red/30 transition-all"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
