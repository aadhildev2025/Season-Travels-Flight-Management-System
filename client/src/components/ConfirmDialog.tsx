import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm, onCancel,
}: ConfirmDialogProps) {

  const handleKey = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); }, [onCancel]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [open, handleKey]);

  if (!open) return null;

  const iconBg   = variant === 'danger' ? 'rgba(239,68,68,0.12)'   : variant === 'warning' ? 'rgba(245,158,11,0.12)'  : 'rgba(99,102,241,0.12)';
  const iconColor= variant === 'danger' ? '#f87171'                 : variant === 'warning' ? '#fbbf24'                : 'var(--indigo2)';
  const btnBg    = variant === 'danger' ? 'var(--red)'              : variant === 'warning' ? 'var(--amber)'           : 'var(--indigo)';

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div 
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', cursor: 'pointer' }} 
        onClick={onCancel}
      />
      <div
        className="card fade-up"
        style={{ position: 'relative', width: '100%', maxWidth: 360, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + text */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {variant === 'danger' ? (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke={iconColor}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            ) : variant === 'warning' ? (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke={iconColor}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
            ) : (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke={iconColor}><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
            )}
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{title}</h3>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{message}</p>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button onClick={onCancel} className="btn btn-ghost" style={{ fontSize: 12 }}>{cancelLabel}</button>
          <button onClick={onConfirm} className="btn" style={{ background: btnBg, color: '#fff', fontSize: 12, padding: '8px 20px' }}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
