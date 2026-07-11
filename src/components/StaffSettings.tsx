'use client';

import React, { useState } from 'react';
import { useFlightStore, User } from '@/store/flightStore';
import ConfirmDialog from './ConfirmDialog';
import {
  Edit2,
  Trash2,
  Globe,
  Check,
  X,
  Mail,
  UserPlus,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function StaffSettings() {
  const { users, currentUser, createUser, updateUser, deleteUser, changePassword } = useFlightStore();
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' as any;

  // ── Staff form ──────────────────────────────────────────────────────────────
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [role, setRole] = useState<'Admin' | 'Staff'>('Staff');
  const [timezone, setTimezone] = useState('Europe/Stockholm');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Confirm dialog state ─────────────────────────────────────────────────────
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="p-6 text-center text-[var(--muted)] text-sm">
        Access Denied. You do not have permission to view this page.
      </div>
    );
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = 'Valid email required';
    if (!editingUserId && !password.trim()) errs.password = 'Password required for new accounts';
    if (!editingUserId && password && password.length < 4) errs.password = 'Min 4 characters';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Staff CRUD ──────────────────────────────────────────────────────────────
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    createUser({ name, email, password, role, timezone });
    resetForm();
    alert('Staff account created!');
  };

  const handleEditSelect = (user: User) => {
    setEditingUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setTimezone(user.timezone);
    setFormErrors({});
    setShowAddForm(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId || !validateForm()) return;
    updateUser(editingUserId, { name, email, role, timezone });
    if (password.trim()) changePassword(editingUserId, password);
    resetForm();
    alert('Account updated!');
  };

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) {
      setDeniedMessage('You cannot delete your own account.');
      return;
    }
    setConfirmDeleteUserId(id);
  };

  const resetForm = () => {
    setEditingUserId(null);
    setShowAddForm(false);
    setName(''); setEmail(''); setPassword('');
    setRole('Staff'); setTimezone('Europe/Stockholm');
    setFormErrors({});
  };

  // ── Shared input className ──────────────────────────────────────────────────
  const inputCls = (err?: boolean) =>
    `w-full rounded-xl px-3.5 py-2.5 text-xs outline-none transition-all
     bg-[var(--input-bg)] text-[var(--input-text)] border
     ${err ? 'border-error ring-1 ring-error/30' : 'border-[var(--input-border)] focus:border-accent focus:ring-1 focus:ring-accent/30'}`;

  const pwdInputCls = (err?: boolean) =>
    `w-full rounded-xl pl-9 pr-10 py-2.5 text-xs outline-none transition-all
     bg-[var(--input-bg)] text-[var(--input-text)] border
     ${err ? 'border-error ring-1 ring-error/30' : 'border-[var(--input-border)] focus:border-accent focus:ring-1 focus:ring-accent/30'}`;

  return (
    <div className="flex flex-col gap-5 md:gap-6 pb-24 md:pb-6">

      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Staff Management
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Create, update, and remove staff accounts for the Season Travels console.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Staff button */}
          {!showAddForm && !editingUserId && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-gradient-premium text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" /> Add Staff
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════
          STAFF MANAGEMENT
          ══════════════════════════════════ */}
      {/* Add / Edit form */}
          {(showAddForm || editingUserId) && (
            <form
              onSubmit={editingUserId ? handleUpdate : handleCreate}
              className="glass rounded-2xl p-5 md:p-6 border border-[var(--card-border)] shadow-md flex flex-col gap-4"
            >
              <p className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                {editingUserId ? '✏️  Edit Staff Account' : '➕  New Staff Account'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); setFormErrors(p => ({ ...p, name: '' })); }}
                    placeholder="e.g. Olof Johansson"
                    className={inputCls(!!formErrors.name)}
                  />
                  {formErrors.name && <span className="text-[10px] text-error">{formErrors.name}</span>}
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setFormErrors(p => ({ ...p, email: '' })); }}
                    placeholder="olof@seasontravels.se"
                    className={inputCls(!!formErrors.email)}
                  />
                  {formErrors.email && <span className="text-[10px] text-error">{formErrors.email}</span>}
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                    Password {editingUserId && <span className="font-normal normal-case opacity-60">(leave blank to keep)</span>}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)] pointer-events-none" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setFormErrors(p => ({ ...p, password: '' })); }}
                      placeholder={editingUserId ? '••••••••' : 'Set password...'}
                      className={pwdInputCls(!!formErrors.password)}
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]">
                      {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {formErrors.password && <span className="text-[10px] text-error">{formErrors.password}</span>}
                </div>

                {/* Role */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Security Role</label>
                  <select value={role} onChange={e => setRole(e.target.value as any)} className={inputCls()}>
                    <option value="Staff">Staff (Operations)</option>
                    <option value="Admin">Admin (Full Access)</option>
                  </select>
                </div>

                {/* Timezone */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Duty Zone</label>
                  <select value={timezone} onChange={e => setTimezone(e.target.value)} className={inputCls()}>
                    <option value="Europe/Stockholm">Sweden (Europe/Stockholm)</option>
                    <option value="Asia/Colombo">Sri Lanka (Asia/Colombo)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[var(--card-border)] pt-3">
                <button type="button" onClick={resetForm}
                  className="flex items-center gap-1 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--card-border)] text-xs font-bold text-[var(--foreground)] px-3.5 py-2 rounded-xl transition-all">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button type="submit"
                  className="flex items-center gap-1 bg-success hover:opacity-90 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all">
                  <Check className="w-3.5 h-3.5" /> {editingUserId ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          {/* Staff table */}
          <div className="glass rounded-2xl overflow-hidden border border-[var(--card-border)] shadow-sm">
            
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--card-border)] text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-4 py-3.5">Email</th>
                    <th className="px-4 py-3.5">Duty Zone</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--surface-hover)] transition-colors text-xs">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-premium text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                            {user.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-[var(--foreground)]">{user.name}</span>
                          {user.id === currentUser?.id && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-accent/10 text-accent rounded font-bold border border-accent/20">You</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[var(--muted)]">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[var(--muted)]">
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-accent flex-shrink-0" />
                          {user.timezone.split('/')[1]}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          user.role === 'Admin'
                            ? 'bg-primary/10 text-primary border-primary/20 dark:bg-accent/15 dark:text-accent dark:border-accent/30'
                            : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--card-border)]'
                        }`}>
                          {user.role === 'Admin' && <ShieldCheck className="w-2.5 h-2.5" />}
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleEditSelect(user)}
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(user.id)} disabled={user.id === currentUser?.id}
                            className={`p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[var(--muted)] hover:text-rose-600 transition-colors ${user.id === currentUser?.id ? 'opacity-30 cursor-not-allowed' : ''}`} title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD VIEW */}
            <div className="md:hidden flex flex-col divide-y divide-[var(--card-border)]">
              {users.map(user => (
                <div key={user.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-premium text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm flex-shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-[var(--foreground)] truncate">{user.name}</span>
                          {user.id === currentUser?.id && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-accent/10 text-accent rounded font-bold border border-accent/20 flex-shrink-0">You</span>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--muted)] flex items-center gap-1 mt-0.5">
                          <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => handleEditSelect(user)}
                        className="p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} disabled={user.id === currentUser?.id}
                        className={`p-2 rounded-lg bg-[var(--surface)] hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[var(--muted)] hover:text-rose-600 transition-colors ${user.id === currentUser?.id ? 'opacity-30 cursor-not-allowed' : ''}`} title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1 text-[var(--muted)]">
                      <Globe className="w-3 h-3 text-accent flex-shrink-0" />
                      {user.timezone.split('/')[1]}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      user.role === 'Admin'
                        ? 'bg-primary/10 text-primary border-primary/20 dark:bg-accent/15 dark:text-accent dark:border-accent/30'
                        : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--card-border)]'
                    }`}>
                      {user.role === 'Admin' && <ShieldCheck className="w-2.5 h-2.5" />}
                      {user.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>


      <ConfirmDialog
        open={!!confirmDeleteUserId}
        title="Delete Staff Account"
        message="Are you sure you want to delete this staff account? This action is permanent and will be logged."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteUserId) deleteUser(confirmDeleteUserId);
          setConfirmDeleteUserId(null);
        }}
        onCancel={() => setConfirmDeleteUserId(null)}
      />

      <ConfirmDialog
        open={!!deniedMessage}
        title="Unable to Delete"
        message={deniedMessage || ''}
        confirmLabel="OK"
        variant="warning"
        onConfirm={() => setDeniedMessage(null)}
        onCancel={() => setDeniedMessage(null)}
      />

    </div>
  );
}
