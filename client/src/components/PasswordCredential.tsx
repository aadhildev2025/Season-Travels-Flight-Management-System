import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFlightStore, apiFetch } from '../store/flightStore';
import ConfirmDialog from './ConfirmDialog';
import { Trash2, Plus, X, Search, ChevronLeft } from 'lucide-react';

interface Credential {
  id: string;
  _id: string;
  title: string;
  username: string;
  password: string;
  notes: string;
  folder: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const ACTIVE_ACCENT = {
  hex: '#007aff', // Apple Blue
  text: '#ffffff',
  glow: 'rgba(0,122,255,0.2)'
};

export const PasswordCredential: React.FC = () => {
  const { currentUser, showToast, theme } = useFlightStore();
  const isAdmin = currentUser?.role === 'Admin';

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile layout navigation state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<'notes' | 'editor'>('notes');

  // Custom size menu state & ref
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const sizeMenuRef = useRef<HTMLDivElement>(null);

  const [syncStatus, setSyncStatus] = useState<'Synced' | 'Saving...' | 'Sync Error'>('Synced');
  const isSelectionChange = useRef(false);
  const debouncedSaveRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Monitor screen width for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle clicking outside custom size dropdown menu
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(e.target as Node)) {
        setSizeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Load credentials from API
  const fetchCredentials = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/credentials');
      const list = data.credentials || [];
      setCredentials(list);
      
      // Auto-select first note if there's no selection
      if (list.length > 0 && !selectedId) {
        const firstId = list[0].id || list[0]._id;
        setSelectedId(firstId);
      }
    } catch {
      showToast('Failed to load notes', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, selectedId]);

  useEffect(() => {
    fetchCredentials();
  }, []);

  // Update editor innerHTML ONLY when selectedId changes (ignores typings/re-renders)
  useEffect(() => {
    if (!selectedId || !editorRef.current) return;
    const current = credentials.find(c => c.id === selectedId || c._id === selectedId);
    if (current) {
      isSelectionChange.current = true;
      
      // If the note content is empty, start with a clean paragraph structure
      const initialHtml = current.notes ? current.notes : `<div><br></div>`;
      editorRef.current.innerHTML = initialHtml;
    }
  }, [selectedId]);

  // API save helper
  const saveStateToDB = useCallback(async (id: string, updates: { title: string; notes: string; folder: string }) => {
    setSyncStatus('Saving...');
    try {
      await apiFetch(`/api/credentials/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setSyncStatus('Synced');
      
      // Silently update local store list item
      setCredentials(prev => prev.map(c => (c.id === id || c._id === id) ? { ...c, ...updates } : c));
    } catch {
      setSyncStatus('Sync Error');
    }
  }, []);

  // Queue saving with 800ms debounce
  const queueAutoSave = useCallback((id: string, updates: { title: string; notes: string; folder: string }) => {
    if (debouncedSaveRef.current) clearTimeout(debouncedSaveRef.current);
    setSyncStatus('Saving...');
    debouncedSaveRef.current = setTimeout(() => {
      saveStateToDB(id, updates);
    }, 800);
  }, [saveStateToDB]);

  // Handle typing inside contentEditable div
  const handleInput = () => {
    if (!selectedId || !editorRef.current) return;
    const htmlContent = editorRef.current.innerHTML;
    const plainText = editorRef.current.innerText || '';

    // Split text into first line (Title) and rest (Notes/Body)
    const lines = plainText.split('\n');
    const newTitle = lines[0]?.trim() || 'New Note';
    const newNotes = lines.slice(1).join('\n');

    // Instantly update sidebar item title and preview
    setCredentials(prev => prev.map(c => 
      (c.id === selectedId || c._id === selectedId) 
        ? { ...c, title: newTitle, notes: htmlContent } 
        : c
    ));

    // Queue debounced background save
    queueAutoSave(selectedId, {
      title: newTitle,
      notes: htmlContent,
      folder: 'Notes'
    });
  };

  // Focus editor when clicking anywhere on the notepad background
  const handleContainerClick = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Apple Notes style instant creation
  const handleAddNote = async () => {
    if (!isAdmin) return;
    setSyncStatus('Saving...');
    try {
      const res = await apiFetch('/api/credentials', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Note',
          username: '',
          password: 'Password',
          notes: '<div><br></div>',
          folder: 'Notes'
        }),
      });
      
      if (res.credential) {
        const newCred = res.credential;
        setCredentials(prev => [newCred, ...prev]);
        
        isSelectionChange.current = true;
        setSelectedId(newCred.id || newCred._id);
        
        if (editorRef.current) {
          editorRef.current.innerHTML = '<div><br></div>';
        }
        setSyncStatus('Synced');
        
        if (isMobile) {
          setMobileView('editor');
        }
      }
    } catch {
      showToast('Failed to create new note', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setSyncStatus('Saving...');
      await apiFetch(`/api/credentials/${deleteId}`, { method: 'DELETE' });
      showToast('Note deleted');
      
      const remaining = credentials.filter(c => c.id !== deleteId && c._id !== deleteId);
      setCredentials(remaining);

      if (remaining.length > 0) {
        const nextNote = remaining[0];
        const nextId = nextNote.id || nextNote._id;
        
        isSelectionChange.current = true;
        setSelectedId(nextId);
        
        if (editorRef.current) {
          editorRef.current.innerHTML = nextNote.notes || '<div><br></div>';
        }
        
        if (isMobile) {
          setMobileView('notes');
        }
      } else {
        setSelectedId(null);
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
        }
        if (isMobile) {
          setMobileView('notes');
        }
      }
      
      setDeleteId(null);
      setSyncStatus('Synced');
    } catch {
      showToast('Failed to delete note', 'error');
    }
  };

  const filteredCredentials = credentials.filter(cred => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (cred.title || '').toLowerCase().includes(q) ||
      (cred.notes || '').toLowerCase().includes(q)
    );
  });

  const getShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getFullDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const formattedDate = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${formattedDate} at ${formattedTime}`;
  };

  // Find active selected cred
  const activeCred = credentials.find(c => c.id === selectedId || c._id === selectedId);

  // Render Notes List Column (Column 1)
  const renderNotesColumn = () => (
    <div className="apple-notes-sidebar" style={{
      width: isMobile ? '100%' : 260,
      background: theme === 'dark' ? 'rgba(28, 28, 30, 0.95)' : 'rgba(244, 244, 247, 0.95)',
      backdropFilter: 'blur(30px)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Header toolbar */}
      <div style={{ padding: '18px 16px 8px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: ACTIVE_ACCENT.hex }}>Notes</span>
          {isAdmin && (
            <button
              onClick={handleAddNote}
              style={{
                background: 'none', border: 'none', color: ACTIVE_ACCENT.hex, cursor: 'pointer',
                display: 'flex', alignItems: 'center', padding: 4
              }}
              title="New Note"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {/* Note list search */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              border: 'none',
              borderRadius: 8,
              padding: '6px 10px 6px 26px',
              fontSize: 12.5,
              color: 'var(--text)',
              outline: 'none',
              width: '100%',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)'
              }}
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Note list cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }} className="apple-notes-sidebar">
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center' }}>
            <div className="spin" style={{ width: 16, height: 16, margin: '0 auto 8px auto', borderRadius: '50%', border: '2px solid var(--indigo)', borderTopColor: 'transparent' }} />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Loading...</span>
          </div>
        ) : filteredCredentials.length === 0 ? (
          <div style={{ padding: 35, textAlign: 'center', color: 'var(--text3)', fontSize: 11 }}>
            {searchQuery ? 'No Results' : 'No Notes'}
          </div>
        ) : (
          filteredCredentials.map(cred => {
            const id = cred.id || cred._id;
            const isSelected = selectedId === id;
            const dateText = getShortDate(cred.createdAt);
            
            // Generate plaintext snippet from the HTML notes field
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cred.notes || '';
            const plainSnippet = tempDiv.innerText || 'No additional text';

            return (
              <div
                key={id}
                className="note-item"
                onClick={() => {
                  setSelectedId(id);
                  if (isMobile) {
                    setMobileView('editor');
                  }
                }}
                style={{
                  margin: '3px 6px',
                  padding: '10px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isSelected ? ACTIVE_ACCENT.hex : 'transparent',
                  color: isSelected ? '#ffffff' : 'var(--text)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: isSelected ? '#ffffff' : 'var(--text)',
                    flex: 1
                  }}>
                    {cred.title || 'New Note'}
                  </div>
                  
                  {/* Delete button directly inside the list item card */}
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent note selection when clicking delete
                        setDeleteId(id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isSelected ? 'rgba(255,255,255,0.85)' : 'var(--red)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        marginLeft: 6
                      }}
                      title="Delete Note"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, fontSize: 11, alignItems: 'center' }}>
                  <span style={{ color: isSelected ? 'rgba(255,255,255,0.9)' : 'var(--text3)', flexShrink: 0 }}>
                    {dateText}
                  </span>
                  <span style={{
                    color: isSelected ? 'rgba(255,255,255,0.75)' : 'var(--text2)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {plainSnippet}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Counter bottom bar */}
      <div style={{ padding: 10, textAlign: 'center', fontSize: 11, color: 'var(--text3)', borderTop: '1px solid var(--border)' }}>
        {filteredCredentials.length} Note{filteredCredentials.length !== 1 ? 's' : ''}
      </div>
    </div>
  );

  // Render Note Editor Column (Column 2)
  const renderEditorColumn = () => (
    <div style={{
      flex: 1,
      background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Mobile-only toolbar header */}
      {isMobile && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: theme === 'dark' ? 'rgba(30, 30, 32, 0.35)' : 'rgba(255, 255, 255, 0.5)',
        }}>
          <button
            onClick={() => setMobileView('notes')}
            style={{
              background: 'none', border: 'none', color: ACTIVE_ACCENT.hex, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600
            }}
          >
            <ChevronLeft size={16} /> <span>Notes</span>
          </button>

          {selectedId && (
            <span style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: syncStatus === 'Sync Error' ? 'var(--red)' : syncStatus === 'Saving...' ? ACTIVE_ACCENT.hex : 'var(--green)',
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.02em'
            }}>
              {syncStatus}
            </span>
          )}
        </div>
      )}

      {/* Rich Text Format Toolbar */}
      {activeCred && isAdmin && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '8px 24px',
          borderBottom: '1px solid var(--border)',
          background: theme === 'dark' ? '#18181a' : '#f5f5f7'
        }}>
          {/* Format Styles */}
          <button
            onMouseDown={(e) => { e.preventDefault(); document.execCommand('bold', false); handleInput(); }}
            className="format-btn"
            style={{ fontWeight: 800 }}
            title="Bold"
          >
            B
          </button>
          
          <button
            onMouseDown={(e) => { e.preventDefault(); document.execCommand('italic', false); handleInput(); }}
            className="format-btn"
            style={{ fontStyle: 'italic' }}
            title="Italic"
          >
            I
          </button>

          <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

          {/* Custom Selection-Preserving Font Size Dropdown menu */}
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Size:</span>
          <div ref={sizeMenuRef} style={{ position: 'relative' }}>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setSizeMenuOpen(!sizeMenuOpen);
              }}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: theme === 'dark' ? '#2c2c2e' : '#f2f2f7',
                color: 'var(--text)',
                fontSize: 12,
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>Size</span>
              <span style={{ fontSize: 8 }}>▼</span>
            </button>
            
            {sizeMenuOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                background: theme === 'dark' ? '#2c2c2e' : '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                padding: 4,
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 130
              }}>
                {[
                  { label: 'Small (13px)', val: '2' },
                  { label: 'Normal (16px)', val: '3' },
                  { label: 'Large (18px)', val: '4' },
                  { label: 'Extra Large (24px)', val: '5' },
                  { label: 'Title (32px)', val: '6' },
                  { label: 'Huge (48px)', val: '7' }
                ].map(opt => (
                  <button
                    key={opt.val}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevents selection destruction
                      document.execCommand('fontSize', false, opt.val);
                      handleInput();
                      setSizeMenuOpen(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text)',
                      padding: '6px 10px',
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderRadius: 4
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(120, 120, 120, 0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

          {/* Bullet List */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              document.execCommand('insertUnorderedList', false);
              handleInput();
            }}
            className="format-btn"
            title="Unordered Bullet List"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span style={{ fontSize: 16 }}>•=</span>
          </button>

          <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

          {/* Font Colors */}
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Color:</span>
          {['inherit', '#007aff', '#ff3b30', '#34c759', '#ff9500', '#8e8e93'].map(color => (
            <button
              key={color}
              onMouseDown={(e) => {
                e.preventDefault();
                document.execCommand('foreColor', false, color);
                handleInput();
              }}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: color === 'inherit' 
                  ? (theme === 'dark' ? '#ffffff' : '#000000') 
                  : color,
                border: '1px solid rgba(120, 120, 120, 0.4)',
                cursor: 'pointer',
                padding: 0
              }}
              title={color === 'inherit' ? 'Default Theme Color' : color}
            />
          ))}
        </div>
      )}

      {/* Editor note sheet (clickable to focus) */}
      <div 
        onClick={handleContainerClick}
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          cursor: 'text'
        }}
      >
        {activeCred ? (
          <div style={{
            flex: 1,
            background: theme === 'dark' ? '#1c1c1e' : '#ffffff',
            padding: '24px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflow: 'hidden'
          }} className="apple-notes-editor">
            
            {/* Timestamp date & sync display header */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              color: 'var(--text3)',
              fontWeight: 500,
              marginBottom: 14
            }}>
              <span>{getFullDate(activeCred.createdAt)}</span>
              {!isMobile && (
                <>
                  <span style={{ fontSize: 9 }}>•</span>
                  <span style={{
                    fontWeight: 700,
                    color: syncStatus === 'Sync Error' ? 'var(--red)' : syncStatus === 'Saving...' ? ACTIVE_ACCENT.hex : 'var(--green)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>{syncStatus}</span>
                </>
              )}
            </div>

            {/* Click-and-Type unified contentEditable rich text area */}
            <div
              ref={editorRef}
              contentEditable={isAdmin}
              onInput={handleInput}
              data-placeholder="New Note"
              style={{
                fontSize: 16,
                lineHeight: 1.6,
                color: 'var(--text)',
                width: '100%',
                height: '100%',
                outline: 'none',
                fontFamily: 'inherit',
                overflowY: 'auto',
                caretColor: ACTIVE_ACCENT.hex
              }}
            />

          </div>
        ) : (
          /* Empty placeholder sheet when there's no note selected */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, color: 'var(--text3)', background: theme === 'dark' ? '#1c1c1e' : '#ffffff' }}>
            <Trash2 size={32} style={{ opacity: 0.25, color: ACTIVE_ACCENT.hex }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>No Note Selected</span>
            {isAdmin && (
              <button
                onClick={handleAddNote}
                className="btn btn-sm"
                style={{
                  background: ACTIVE_ACCENT.hex,
                  borderColor: ACTIVE_ACCENT.hex,
                  color: '#ffffff',
                  fontWeight: 700,
                  marginTop: 6,
                  boxShadow: `0 4px 10px ${ACTIVE_ACCENT.glow}`
                }}
              >
                Create Note
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      color: 'var(--text)',
      overflow: 'hidden',
    }} className="fade-in">
      <style dangerouslySetInnerHTML={{__html: `
        .apple-notes-sidebar::-webkit-scrollbar {
          width: 5px;
        }
        .apple-notes-sidebar::-webkit-scrollbar-thumb {
          background: rgba(120, 120, 120, 0.25);
          border-radius: 4px;
        }
        .apple-notes-editor::-webkit-scrollbar {
          width: 6px;
        }
        .apple-notes-editor::-webkit-scrollbar-thumb {
          background: rgba(120, 120, 120, 0.3);
          border-radius: 4px;
        }
        .note-item {
          transition: all 0.15s ease;
        }
        .note-item:active {
          transform: scale(0.98);
        }
        .notes-toolbar-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.15s ease;
        }
        .notes-toolbar-btn:hover {
          background: rgba(120,120,120,0.1);
        }
        .format-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          color: var(--text);
          font-size: 13px;
          font-weight: 500;
          transition: all 0.1s ease;
        }
        .format-btn:hover {
          background: rgba(120, 120, 120, 0.15);
        }
        [contenteditable=true]:empty:before {
          content: attr(data-placeholder);
          color: var(--text3);
          opacity: 0.65;
          pointer-events: none;
          display: block;
        }
        .apple-notes-editor ul {
          list-style-type: disc !important;
          margin-left: 20px !important;
          padding-left: 10px !important;
          margin-top: 8px !important;
          margin-bottom: 8px !important;
        }
        .apple-notes-editor li {
          display: list-item !important;
          list-style-type: disc !important;
          margin-bottom: 4px !important;
        }
        .apple-notes-editor font[size="1"] { font-size: 11px !important; }
        .apple-notes-editor font[size="2"] { font-size: 13px !important; }
        .apple-notes-editor font[size="3"] { font-size: 16px !important; }
        .apple-notes-editor font[size="4"] { font-size: 18px !important; }
        .apple-notes-editor font[size="5"] { font-size: 24px !important; }
        .apple-notes-editor font[size="6"] { font-size: 32px !important; }
        .apple-notes-editor font[size="7"] { font-size: 48px !important; }
      `}} />

      {/* 2-Column Split View for PC, or responsive single column for Mobile */}
      {!isMobile ? (
        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
          {renderNotesColumn()}
          {renderEditorColumn()}
        </div>
      ) : (
        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
          {mobileView === 'notes' && renderNotesColumn()}
          {mobileView === 'editor' && renderEditorColumn()}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};