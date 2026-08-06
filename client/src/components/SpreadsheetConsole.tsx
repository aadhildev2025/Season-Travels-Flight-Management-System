import { useState, useEffect } from 'react';
import { useSpreadsheetStore, SpreadsheetData } from '../store/spreadsheetStore';
import { SpreadsheetEditor } from './SpreadsheetEditor';
import { Plus, Search, Grid, Calendar, FileText, Trash2, ArrowRight, Loader } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

export function SpreadsheetConsole() {
  const { 
    spreadsheets, fetchSpreadsheets, createSpreadsheet, deleteSpreadsheet, 
    activeSpreadsheet, setActiveSpreadsheet, fetchSpreadsheetById, loading 
  } = useSpreadsheetStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchSpreadsheets();
  }, [fetchSpreadsheets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const created = await createSpreadsheet(newTitle.trim());
      if (created) {
        setShowCreateModal(false);
        setNewTitle('');
      }
    } catch (err) {
      console.error('Error creating spreadsheet:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    await deleteSpreadsheet(deleteTargetId);
    setDeleteTargetId(null);
  };

  // Filter spreadsheets
  const filtered = spreadsheets.filter(sheet => 
    sheet.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If a spreadsheet is selected and active, render the Editor
  if (activeSpreadsheet) {
    return <SpreadsheetEditor onBack={() => setActiveSpreadsheet(null)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 20 }} className="fade-in">
      
      {/* Upper header action controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        {/* Search */}
        <div style={{ position: 'relative', width: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input 
            type="text" 
            placeholder="Search spreadsheets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '7px 12px 7px 30px', fontSize: 13, color: 'var(--text)',
              outline: 'none', width: '100%'
            }}
          />
        </div>

        {/* Create new spreadsheet button */}
        <button 
          onClick={() => setShowCreateModal(true)} 
          className="btn btn-primary btn-sm" 
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} /> New Spreadsheet
        </button>
      </div>

      {/* Grid or Table listing sheets */}
      {loading && spreadsheets.length === 0 ? (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <div className="spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--indigo)', borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
          border: '1.5px dashed var(--border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center', gap: 12
        }}>
          <Grid size={32} style={{ color: 'var(--text3)' }} />
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>No Spreadsheets Found</h3>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
              {searchQuery ? 'Try adjusting your search terms.' : 'Create a new excel sheet to store custom travel booking records.'}
            </p>
          </div>
          {!searchQuery && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
              <Plus size={14} /> Create One Now
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(sheet => {
            const dateStr = sheet.updatedAt 
              ? new Date(sheet.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Unknown';

            return (
              <div 
                key={sheet.id}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                  padding: 18, display: 'flex', flexDirection: 'column', gap: 14,
                  transition: 'transform 0.15s, border-color 0.15s', cursor: 'pointer'
                }}
                className="hover-card"
                onClick={() => fetchSpreadsheetById(sheet.id)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {/* Title and Icon */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ 
                      width: 36, height: 36, borderRadius: 8, background: 'rgba(99, 102, 241, 0.1)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--indigo)' 
                    }}>
                      <Grid size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', wordBreak: 'break-word' }}>
                        {sheet.title}
                      </h4>
                      <span style={{ fontSize: 10, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <FileText size={10} /> {sheet.sheets?.length || 1} sheet(s)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border2)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={11} /> {dateStr}
                  </span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => setDeleteTargetId(sheet.id)}
                      className="btn btn-ghost btn-icon btn-sm text-red"
                      style={{ color: 'var(--red)', padding: 6 }}
                      title="Delete Spreadsheet"
                    >
                      <Trash2 size={13} />
                    </button>
                    <button 
                      onClick={() => fetchSpreadsheetById(sheet.id)}
                      className="btn btn-ghost btn-icon btn-sm text-indigo"
                      style={{ padding: 6 }}
                      title="Open Sheet"
                    >
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════ CREATE MODAL ════════════════════ */}
      {showCreateModal && (
        <div style={{ 
          position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)'
        }}>
          <form 
            onSubmit={handleCreate}
            style={{ 
              background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 16, 
              padding: 24, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16,
              boxShadow: '0 12px 36px rgba(0,0,0,0.5)'
            }}
          >
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Create Spreadsheet</h3>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                Name your new excel replica workbook to get started.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Workbook Title
              </label>
              <input 
                type="text" 
                required
                placeholder="e.g. Flight Booking Records, Daily Expenses"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{ 
                  background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', 
                  borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none'
                }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button 
                type="button" 
                onClick={() => { setShowCreateModal(false); setNewTitle(''); }}
                className="btn btn-ghost btn-sm"
                disabled={creating}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary btn-sm"
                disabled={creating || !newTitle.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {creating ? <Loader size={12} className="spin" /> : null} Create Workbook
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ════════════════════ DELETE CONFIRMATION ════════════════════ */}
      <ConfirmDialog 
        open={deleteTargetId !== null}
        title="Delete Spreadsheet"
        message="Are you sure you want to delete this spreadsheet? This action is permanent and will delete all sheets inside it."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />

    </div>
  );
}
