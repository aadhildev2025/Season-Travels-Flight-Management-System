import { useState, useEffect, useCallback } from 'react';
import { useFlightStore } from '../store/flightStore';
import { Plus, Trash2, Users } from 'lucide-react';
import ClockSection from './ClockSection';
import type { TZ } from '../App';

interface StaffUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  timezone?: string;
}

interface StaffProps {
  tz: TZ;
  clockTime: string;
  clockDate: string;
}

export default function Staff({ tz, clockTime, clockDate }: StaffProps) {
  const { fetchStaff, createStaff, deleteStaff, currentUser } = useFlightStore();

  const [list, setList]         = useState<StaffUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  // New user form
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('Staff');
  const [adding, setAdding]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const users = await fetchStaff();
      setList(users as unknown as StaffUser[]);
    } catch (e: any) {
      setError(e.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [fetchStaff]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError('Name and email are required'); return; }
    setAdding(true); setError(''); setSuccess('');
    try {
      await createStaff({ name: name.trim(), email: email.trim(), password: password || 'staff123', role });
      setName(''); setEmail(''); setPassword(''); setRole('Staff');
      setSuccess(`User "${name.trim()}" added successfully.`);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to add user');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (user: StaffUser) => {
    const uid = user._id || user.id || '';
    if (!uid || uid === currentUser?.id) return;
    if (!confirm(`Delete "${user.name}"? This cannot be undone.`)) return;
    setError(''); setSuccess('');
    try {
      await deleteStaff(uid);
      setSuccess(`"${user.name}" removed.`);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to delete user');
    }
  };

  const label: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5, display: 'block' };

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 860, margin: '0 auto' }}>

      {/* Page header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} style={{ color: 'var(--indigo2)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Staff Management</h2>
            <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Add, view and remove system users · Admin only</p>
          </div>
        </div>
        <ClockSection tz={tz} clockTime={clockTime} clockDate={clockDate} />
      </div>

      {/* Feedback */}
      {success && (
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#4ade80', fontWeight: 500 }}>
          ✓ {success}
        </div>
      )}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#f87171', fontWeight: 500 }}>
          {error}
        </div>
      )}

      <div className="responsive-grid-staff">

        {/* ── Add staff form ─────────────────── */}
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Plus size={14} style={{ color: 'var(--indigo2)' }} /> Add New User
          </p>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={label}>Full Name *</label>
              <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Anura Perera" required />
            </div>
            <div>
              <label style={label}>Email Address *</label>
              <input className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@seasontravels.com" required />
            </div>
            <div>
              <label style={label}>Password</label>
              <input className="field" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Default: staff123" />
            </div>
            <div>
              <label style={label}>Role</label>
              <select className="field" value={role} onChange={e => setRole(e.target.value)}>
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <button type="submit" disabled={adding} className="btn btn-primary" style={{ width: '100%', marginTop: 4 }}>
              {adding
                ? <><span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Adding…</>
                : <><Plus size={13} /> Add User</>}
            </button>
          </form>
        </div>

        {/* ── Staff list ─────────────────────── */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              Current Users
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: 'var(--surface2)', color: 'var(--text2)', padding: '2px 7px', borderRadius: 10 }}>{list.length}</span>
            </p>
            <button onClick={load} className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 10px' }}>↻ Refresh</button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', border: '3px solid var(--indigo)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : list.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text2)', fontSize: 12 }}>No users found</div>
          ) : (
            <div>
              {list.map((u, i) => {
                const uid = u._id || u.id || '';
                const isSelf = uid === currentUser?.id;
                return (
                  <div key={uid || i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '13px 18px',
                    borderBottom: i < list.length - 1 ? '1px solid var(--border2)' : 'none',
                    transition: 'background 0.12s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Avatar + info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                        background: u.role === 'Admin' ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'var(--surface2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800, color: u.role === 'Admin' ? '#fff' : 'var(--text2)',
                        border: '1px solid var(--border)',
                      }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{u.name}</p>
                          {isSelf && <span style={{ fontSize: 8, fontWeight: 800, color: 'var(--amber)', background: 'rgba(245,158,11,0.1)', padding: '1px 5px', borderRadius: 3 }}>YOU</span>}
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>{u.email}</p>
                      </div>
                    </div>

                    {/* Role + Delete */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={u.role === 'Admin' ? 'role-admin' : 'role-staff'}>{u.role}</span>
                      {!isSelf && (
                        <button onClick={() => handleDelete(u)} className="btn btn-icon btn-ghost"
                          style={{ color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}
                          title={`Remove ${u.name}`}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
