import { useState } from 'react';
import { useFlightStore } from '../store/flightStore';
import { User, Mail, Lock, Save } from 'lucide-react';
import ClockSection from './ClockSection';
import type { TZ } from '../App';

interface ProfileProps {
  tz: TZ;
  clockTime: string;
  clockDate: string;
}

export default function Profile({ tz, clockTime, clockDate }: ProfileProps) {
  const { currentUser, updateProfile } = useFlightStore();

  const [name, setName]               = useState(currentUser?.name || '');
  const [email, setEmail]             = useState(currentUser?.email || '');
  const [currentPwd, setCurrentPwd]   = useState('');
  const [newPwd, setNewPwd]           = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');
  const [saving, setSaving]           = useState(false);
  const [success, setSuccess]         = useState('');
  const [error, setError]             = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (newPwd && newPwd !== confirmPwd) {
      setError('New passwords do not match.');
      return;
    }
    if (newPwd && newPwd.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name:            name.trim() !== currentUser?.name  ? name.trim() : undefined,
        email:           email.trim() !== currentUser?.email ? email.trim() : undefined,
        currentPassword: currentPwd || undefined,
        newPassword:     newPwd || undefined,
      });
      setSuccess('Profile updated successfully!');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err: any) {
      setError(err.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const initial = (currentUser?.name || 'S').charAt(0).toUpperCase();
  const label: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5, display: 'block' };

  return (
    <div className="fade-up" style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Profile Settings</h2>
          <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Update your name, email and password</p>
        </div>
        <ClockSection tz={tz} clockTime={clockTime} clockDate={clockDate} />
      </div>

      {/* Avatar block */}
      <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 16, flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #818cf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 900, color: '#fff',
          boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
        }}>
          {initial}
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{currentUser?.name}</p>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{currentUser?.email}</p>
          <span style={{
            display: 'inline-block', marginTop: 6, fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
            padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase',
            background: currentUser?.role === 'Admin' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
            color: currentUser?.role === 'Admin' ? 'var(--indigo2)' : 'var(--text2)',
          }}>
            {currentUser?.role}
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave}>
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {success && (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#4ade80', fontWeight: 500 }}>
              ✓ {success}
            </div>
          )}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#f87171', fontWeight: 500 }}>
              {error}
            </div>
          )}

          {/* Name + Email */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={label}>
                <User size={10} style={{ display: 'inline', marginRight: 4 }} />Full Name
              </label>
              <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
            </div>
            <div>
              <label style={label}>
                <Mail size={10} style={{ display: 'inline', marginRight: 4 }} />Email Address
              </label>
              <input className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 4 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={10} /> Change Password
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={label}>Current Password</label>
                <input className="field" type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="Leave blank to keep current" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={label}>New Password</label>
                  <input className="field" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 6 characters" />
                </div>
                <div>
                  <label style={label}>Confirm New Password</label>
                  <input className="field" type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repeat new password" />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ paddingTop: 4, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ gap: 6, opacity: saving ? 0.6 : 1 }}>
              {saving
                ? <><span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Saving…</>
                : <><Save size={13} /> Save Changes</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
