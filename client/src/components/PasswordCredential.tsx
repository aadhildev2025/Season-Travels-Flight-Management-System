import React, { useState, useEffect, useCallback } from 'react';
import { useFlightStore, apiFetch } from '../store/flightStore';
import ConfirmDialog from './ConfirmDialog';
import { Lock, Copy, Check, Trash2, Edit3, Plus, X, Eye, EyeOff, Save, RefreshCw, Search } from 'lucide-react';

interface Credential {
  id: string;
  _id: string;
  title: string;
  username: string;
  password: string;
  notes: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const PasswordCredential: React.FC = () => {
  const { currentUser, showToast } = useFlightStore();
  const isAdmin = currentUser?.role === 'Admin';

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const [formTitle, setFormTitle] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchCredentials = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/credentials');
      setCredentials(data.credentials || []);
    } catch {
      showToast('Failed to load credentials', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetForm = () => {
    setFormTitle('');
    setFormUsername('');
    setFormPassword('');
    setFormNotes('');
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (cred: Credential) => {
    setFormTitle(cred.title);
    setFormUsername(cred.username);
    setFormPassword(cred.password);
    setFormNotes(cred.notes);
    setEditingId(cred.id);
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formPassword.trim()) {
      showToast('Title and password are required', 'error');
      return;
    }

    try {
      if (editingId) {
        await apiFetch(`/api/credentials/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: formTitle.trim(),
            username: formUsername.trim(),
            password: formPassword,
            notes: formNotes.trim(),
          }),
        });
        showToast('Credential updated');
      } else {
        await apiFetch('/api/credentials', {
          method: 'POST',
          body: JSON.stringify({
            title: formTitle.trim(),
            username: formUsername.trim(),
            password: formPassword,
            notes: formNotes.trim(),
          }),
        });
        showToast('Credential added');
      }
      setShowAddModal(false);
      setShowEditModal(false);
      resetForm();
      fetchCredentials();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save credential', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/credentials/${deleteId}`, { method: 'DELETE' });
      showToast('Credential deleted');
      setDeleteId(null);
      fetchCredentials();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete credential', 'error');
    }
  };

  const maskPassword = (pw: string) => {
    if (pw.length <= 4) return '••••';
    return '••••' + pw.slice(-4);
  };

  const filteredCredentials = credentials.filter(cred => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (cred.title || '').toLowerCase().includes(q) ||
      (cred.username || '').toLowerCase().includes(q) ||
      (cred.notes || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto', color: 'var(--text)' }} className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)'
          }}>
            <Lock size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', margin: 0, color: 'var(--text)' }}>
              Password Credential
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, marginTop: 2 }}>
              {isAdmin ? 'Manage and store credentials securely' : 'View and copy credentials'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={fetchCredentials} className="btn btn-ghost btn-sm" style={{ gap: 6 }} title="Refresh credentials">
            <RefreshCw size={13} /> Refresh
          </button>
          {isAdmin && (
            <button onClick={openAddModal} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
              <Plus size={13} /> Add Credential
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: 20, width: '100%', maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Search credentials..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: searchQuery ? '9px 32px 9px 34px' : '9px 12px 9px 34px',
            fontSize: 13, color: 'var(--text)', outline: 'none',
            width: '100%', transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            title="Clear search"
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 2, borderRadius: 4, transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div className="spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--indigo)', borderTopColor: 'transparent' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Loading credentials…</p>
        </div>
      ) : credentials.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Lock size={30} style={{ color: 'var(--text3)', transform: 'rotate(45deg)' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>
            {isAdmin ? 'No credentials stored yet' : 'No credentials available'}
          </p>
          {isAdmin && (
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              Click "Add Credential" to store your first credential
            </p>
          )}
        </div>
      ) : filteredCredentials.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Search size={30} style={{ color: 'var(--text3)' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>
            No results for "{searchQuery}"
          </p>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            Try a different search query
          </p>
        </div>
      ) : (
        /* Credential cards */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredCredentials.map(cred => {
            const isRevealed = revealedIds.has(cred.id);
            const isCopied = copiedId === cred.id;
            const displayPassword = isRevealed ? cred.password : maskPassword(cred.password);

            return (
              <div key={cred.id} className="card" style={{ padding: 18, background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Title and actions */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <Lock size={16} style={{ color: 'var(--indigo)', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cred.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => openEditModal(cred)}
                          className="btn btn-ghost btn-icon"
                          style={{ padding: '4px 6px', color: 'var(--cyan)' }}
                          title="Edit credential"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(cred.id)}
                          className="btn btn-ghost btn-icon"
                          style={{ padding: '4px 6px', color: 'var(--red)' }}
                          title="Delete credential"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Username */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', width: 55, flexShrink: 0 }}>User</span>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace", flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cred.username || '—'}
                  </span>
                  {cred.username && (
                    <button
                      onClick={() => handleCopy(cred.username, cred.id + '-user')}
                      className="btn btn-ghost btn-icon"
                      style={{ padding: '2px 6px', flexShrink: 0 }}
                      title="Copy username"
                    >
                      {isCopied && copiedId === cred.id + '-user' ? <Check size={12} style={{ color: 'var(--green)' }} /> : <Copy size={12} />}
                    </button>
                  )}
                </div>

                {/* Password */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', width: 55, flexShrink: 0 }}>Pass</span>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace", flex: 1, letterSpacing: '0.05em' }}>
                    {displayPassword}
                  </span>
                  <button
                    onClick={() => toggleReveal(cred.id)}
                    className="btn btn-ghost btn-icon"
                    style={{ padding: '2px 6px', flexShrink: 0 }}
                    title={isRevealed ? 'Hide password' : 'Reveal password'}
                  >
                    {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button
                    onClick={() => handleCopy(isRevealed ? cred.password : displayPassword, cred.id + '-pass')}
                    className="btn btn-ghost btn-icon"
                    style={{ padding: '2px 6px', flexShrink: 0 }}
                    title="Copy password"
                  >
                    {isCopied && copiedId === cred.id + '-pass' ? <Check size={12} style={{ color: 'var(--green)' }} /> : <Copy size={12} />}
                  </button>
                </div>

                {/* Notes */}
                {cred.notes && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', width: 55, flexShrink: 0 }}>Notes</span>
                    <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{cred.notes}</span>
                  </div>
                )}

                {/* Timestamp */}
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  {new Date(cred.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <CredentialModal
          title="Add Credential"
          onClose={() => { setShowAddModal(false); resetForm(); }}
          onSave={handleSave}
          formTitle={formTitle}
          setFormTitle={setFormTitle}
          formUsername={formUsername}
          setFormUsername={setFormUsername}
          formPassword={formPassword}
          setFormPassword={setFormPassword}
          formNotes={formNotes}
          setFormNotes={setFormNotes}
          saveLabel="Add"
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <CredentialModal
          title="Edit Credential"
          onClose={() => { setShowEditModal(false); resetForm(); }}
          onSave={handleSave}
          formTitle={formTitle}
          setFormTitle={setFormTitle}
          formUsername={formUsername}
          setFormUsername={setFormUsername}
          formPassword={formPassword}
          setFormPassword={setFormPassword}
          formNotes={formNotes}
          setFormNotes={setFormNotes}
          saveLabel="Save"
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Credential"
        message="Are you sure you want to delete this credential? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

interface CredentialModalProps {
  title: string;
  onClose: () => void;
  onSave: () => void;
  formTitle: string;
  setFormTitle: (v: string) => void;
  formUsername: string;
  setFormUsername: (v: string) => void;
  formPassword: string;
  setFormPassword: (v: string) => void;
  formNotes: string;
  setFormNotes: (v: string) => void;
  saveLabel: string;
}

function CredentialModal({ title, onClose, onSave, formTitle, setFormTitle, formUsername, setFormUsername, formPassword, setFormPassword, formNotes, setFormNotes, saveLabel }: CredentialModalProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', cursor: 'pointer' }}
        onClick={onClose}
      />
      <div
        className="card fade-up"
        style={{ position: 'relative', width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ padding: '4px 6px' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Title <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g. Admin Panel, Email Account"
              autoFocus
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg2)',
                color: 'var(--text)', fontSize: 13, outline: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Username
            </label>
            <input
              type="text"
              value={formUsername}
              onChange={e => setFormUsername(e.target.value)}
              placeholder="Optional username or email"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg2)',
                color: 'var(--text)', fontSize: 13, outline: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Password <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              type="password"
              value={formPassword}
              onChange={e => setFormPassword(e.target.value)}
              placeholder="Enter password"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg2)',
                color: 'var(--text)', fontSize: 13, outline: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Notes
            </label>
            <textarea
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="Optional notes"
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg2)',
                color: 'var(--text)', fontSize: 13, outline: 'none',
                fontFamily: 'inherit', resize: 'vertical',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 13 }}>Cancel</button>
          <button onClick={onSave} className="btn btn-primary" style={{ gap: 6, fontSize: 13 }}>
            <Save size={13} /> {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}