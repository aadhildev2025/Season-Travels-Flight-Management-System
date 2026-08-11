import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFlightStore, apiFetch } from '../store/flightStore';
import ConfirmDialog from './ConfirmDialog';
import { Trash2, Plus, X, Search, ChevronLeft, Download, Lock, GripVertical } from 'lucide-react';
import jsPDF from 'jspdf';
import { applySeasonTravelsWatermark } from '../utils/pdfWatermark';

interface Credential {
  id: string;
  _id: string;
  title: string;
  username: string;
  password: string;
  notes: string;
  folder: string;
  position?: number;
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

  const CACHE_KEY = 'st_cached_notepad_v1';

  // Initialize state from local cache for instant 0ms load
  const [credentials, setCredentials] = useState<Credential[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const list = cached ? JSON.parse(cached) : [];
      return list.length === 0;
    } catch {
      return true;
    }
  });

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const list: Credential[] = JSON.parse(cached);
        if (list.length > 0) return list[0].id || list[0]._id;
      }
    } catch {}
    return null;
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-sync credentials state to local cache whenever modified
  useEffect(() => {
    if (credentials.length > 0) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(credentials));
      } catch {}
    }
  }, [credentials]);

  // Drag and Drop reorder state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

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

  // Load credentials from API (Background Sync pattern)
  const fetchCredentials = useCallback(async () => {
    try {
      // Only set blocking loading spinner if no cached items exist at all
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached || JSON.parse(cached).length === 0) {
        setLoading(true);
      }

      const data = await apiFetch('/api/credentials');
      const list: Credential[] = data.credentials || [];
      setCredentials(list);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(list));
      } catch {}

      // Auto-select first note if there's no selection
      setSelectedId(prev => {
        if (!prev && list.length > 0) {
          return list[0].id || list[0]._id;
        }
        return prev;
      });
    } catch {
      showToast('Failed to load notes', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

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
      let initialHtml = current.notes ? current.notes : `<div><br></div>`;

      // Auto-upgrade legacy password box elements into new premium glassmorphic card format
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = initialHtml;
      const legacyWidgets = tempDiv.querySelectorAll('.password-box-widget, input.pass-box-input');
      if (legacyWidgets.length > 0) {
        tempDiv.querySelectorAll('.password-box-widget').forEach(widget => {
          const passInput = widget.querySelector('.pass-box-input');
          const val = passInput ? (passInput.getAttribute('data-value') || (passInput as HTMLInputElement).value || passInput.getAttribute('value') || passInput.textContent || '') : '';
          const cleanVal = val.replace(/^(Set password\.\.\.|Click to set password\.\.\.)/i, '').trim();
          
          const newCard = document.createElement('div');
          newCard.className = 'password-box-widget';
          newCard.setAttribute('contenteditable', 'false');
          newCard.style.cssText = 'display: inline-flex; align-items: center; gap: 10px; background: rgba(30, 41, 59, 0.65); backdrop-filter: blur(12px); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 12px; padding: 8px 14px; margin: 8px 0; max-width: 100%; vertical-align: middle; user-select: none; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);';
          
          newCard.innerHTML = `<span class="pass-box-badge" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 4px 10px; color: #3b82f6; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>PASSWORD</span><span class="pass-box-input pass-masked" contenteditable="true" data-placeholder="Set password..." style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: #f8fafc; padding: 6px 14px; font-size: 13px; font-family: monospace; outline: none; min-width: 160px; cursor: text; display: inline-block; vertical-align: middle; text-align: left; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3); -webkit-text-security: disc; text-security: disc;">${cleanVal}</span><button class="pass-box-btn pass-verify-btn" type="button" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; color: #ffffff; border-radius: 8px; padding: 6px 14px; font-size: 11.5px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35); transition: all 0.15s ease;">Verify</button><button class="pass-box-btn pass-copy-btn" type="button" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.18); color: #cbd5e1; border-radius: 8px; padding: 6px 12px; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">Copy</button><button class="pass-box-btn pass-remove-btn" type="button" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; border-radius: 8px; padding: 6px 10px; font-size: 11.5px; font-weight: 700; cursor: pointer; transition: all 0.15s ease;" title="Remove password box">X</button>`;
          
          widget.replaceWith(newCard);
        });
        initialHtml = tempDiv.innerHTML;
      }

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

  // Save drag-and-drop reordered list to API
  const handleReorder = useCallback(async (newCredentials: Credential[]) => {
    setCredentials(newCredentials);
    const orderedIds = newCredentials.map(c => c.id || c._id);
    try {
      setSyncStatus('Saving...');
      await apiFetch('/api/credentials/reorder', {
        method: 'PUT',
        body: JSON.stringify({ orderedIds }),
      });
      setSyncStatus('Synced');
    } catch {
      setSyncStatus('Sync Error');
    }
  }, []);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    const cred = filteredCredentials[index];
    if (cred) {
      e.dataTransfer.setData('text/plain', cred.id || cred._id);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const draggedItem = filteredCredentials[draggedIdx];
    const targetItem = filteredCredentials[targetIndex];

    if (!draggedItem || !targetItem) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const masterFromIdx = credentials.findIndex(c => (c.id || c._id) === (draggedItem.id || draggedItem._id));
    const masterToIdx = credentials.findIndex(c => (c.id || c._id) === (targetItem.id || targetItem._id));

    if (masterFromIdx !== -1 && masterToIdx !== -1) {
      const updated = [...credentials];
      const [moved] = updated.splice(masterFromIdx, 1);
      updated.splice(masterToIdx, 0, moved);
      handleReorder(updated);
    }

    setDraggedIdx(null);
    setDragOverIdx(null);
  };

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
  const handleContainerClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.password-box-widget')) {
      return;
    }
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Handle inserting password box widget at current caret position
  const handleInsertPasswordBox = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const passwordBoxHtml = `<div class="password-box-widget" contenteditable="false" style="display: inline-flex; align-items: center; gap: 10px; background: rgba(30, 41, 59, 0.65); backdrop-filter: blur(12px); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 12px; padding: 8px 14px; margin: 8px 0; max-width: 100%; vertical-align: middle; user-select: none; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15);"><span class="pass-box-badge" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 4px 10px; color: #3b82f6; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>PASSWORD</span><span class="pass-box-input pass-masked" contenteditable="true" data-placeholder="Set password..." style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: #f8fafc; padding: 6px 14px; font-size: 13px; font-family: monospace; outline: none; min-width: 160px; cursor: text; display: inline-block; vertical-align: middle; text-align: left; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3); -webkit-text-security: disc; text-security: disc;"></span><button class="pass-box-btn pass-verify-btn" type="button" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; color: #ffffff; border-radius: 8px; padding: 6px 14px; font-size: 11.5px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35); transition: all 0.15s ease;">Verify</button><button class="pass-box-btn pass-copy-btn" type="button" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.18); color: #cbd5e1; border-radius: 8px; padding: 6px 12px; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">Copy</button><button class="pass-box-btn pass-remove-btn" type="button" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; border-radius: 8px; padding: 6px 10px; font-size: 11.5px; font-weight: 700; cursor: pointer; transition: all 0.15s ease;" title="Remove password box">X</button></div>&nbsp;`;

    document.execCommand('insertHTML', false, passwordBoxHtml);
    handleInput();
  }, [handleInput]);

  // Attach event delegation for Password Box interactive buttons & inputs
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // 1. Verify button click
      const verifyBtn = target.closest('.pass-verify-btn') as HTMLButtonElement | null;
      if (verifyBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (!isAdmin) {
          showToast('Only Admin can verify and view passwords', 'error');
          return;
        }
        const widget = verifyBtn.closest('.password-box-widget');
        const passInput = widget?.querySelector('.pass-box-input') as HTMLElement | null;
        if (passInput) {
          const isRevealed = passInput.classList.contains('pass-revealed');
          if (!isRevealed) {
            passInput.classList.add('pass-revealed');
            passInput.classList.remove('pass-masked');
            passInput.style.setProperty('-webkit-text-security', 'none');
            passInput.style.setProperty('text-security', 'none');
            verifyBtn.textContent = 'Hide';
            verifyBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            verifyBtn.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.35)';
            showToast('Password verified & revealed', 'success');
          } else {
            passInput.classList.remove('pass-revealed');
            passInput.classList.add('pass-masked');
            passInput.style.setProperty('-webkit-text-security', 'disc');
            passInput.style.setProperty('text-security', 'disc');
            verifyBtn.textContent = 'Verify';
            verifyBtn.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
            verifyBtn.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.35)';
          }
          handleInput();
        }
        return;
      }

      // 2. Copy button click
      const copyBtn = target.closest('.pass-copy-btn') as HTMLButtonElement | null;
      if (copyBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (!isAdmin) {
          showToast('Only Admin can copy passwords', 'error');
          return;
        }
        const widget = copyBtn.closest('.password-box-widget');
        const passInput = widget?.querySelector('.pass-box-input') as HTMLElement | null;
        if (passInput) {
          const val = passInput.innerText?.trim() || passInput.textContent?.trim() || '';
          if (!val) {
            showToast('Password box is empty', 'error');
          } else {
            navigator.clipboard.writeText(val);
            showToast('Password copied to clipboard!', 'success');
          }
        }
        return;
      }

      // 3. Remove button click
      const removeBtn = target.closest('.pass-remove-btn') as HTMLButtonElement | null;
      if (removeBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (!isAdmin) {
          showToast('Only Admin can remove password box', 'error');
          return;
        }
        const widget = removeBtn.closest('.password-box-widget');
        if (widget) {
          widget.remove();
          handleInput();
          showToast('Password box removed', 'success');
        }
        return;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains('pass-box-input')) {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
      }
    };

    const handleInputEvent = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains('pass-box-input')) {
        handleInput();
      }
    };

    editor.addEventListener('click', handleClick);
    editor.addEventListener('keydown', handleKeyDown);
    editor.addEventListener('input', handleInputEvent);

    return () => {
      editor.removeEventListener('click', handleClick);
      editor.removeEventListener('keydown', handleKeyDown);
      editor.removeEventListener('input', handleInputEvent);
    };
  }, [isAdmin, showToast, handleInput]);

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

  // Download current note as PDF with Season Travels watermark
  const handleDownloadPDF = () => {
    if (!activeCred) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginLeft = 14;
    const marginTop = 28; // below header
    const marginBottom = 18;
    const maxLineW = pageW - marginLeft * 2;

    // Strip HTML to plain text, preserving line breaks and password box values
    const tmp = document.createElement('div');
    tmp.innerHTML = activeCred.notes || '';
    tmp.querySelectorAll('.pass-box-input').forEach((input: any) => {
      const val = input.value || input.getAttribute('value') || '';
      input.replaceWith(document.createTextNode(`[Password: ${val ? '••••••••' : 'Empty'}]`));
    });
    // Replace <br>, </p>, </div> with newlines before reading innerText
    tmp.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    tmp.querySelectorAll('p,div').forEach(el => {
      if (el.nextSibling) el.insertAdjacentText('afterend', '\n');
    });
    const rawText = tmp.innerText || tmp.textContent || '';
    const lines = rawText.split(/\n/);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);

    let y = marginTop;

    for (const line of lines) {
      const wrapped = doc.splitTextToSize(line.trimEnd() || ' ', maxLineW);
      for (const wl of wrapped) {
        if (y + 6 > pageH - marginBottom) {
          doc.addPage();
          y = marginTop;
        }
        doc.text(wl, marginLeft, y);
        y += 6;
      }
    }

    applySeasonTravelsWatermark(doc, activeCred.title || 'Note');

    const safeName = (activeCred.title || 'note').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeName}.pdf`);
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
      background: theme === 'dark' ? '#05050a' : 'rgba(244, 244, 247, 0.95)',
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
          filteredCredentials.map((cred, index) => {
            const id = cred.id || cred._id;
            const isSelected = selectedId === id;
            const isDragging = draggedIdx === index;
            const isDragOver = dragOverIdx === index;
            const dateText = getShortDate(cred.createdAt);
            
            // Generate plaintext snippet from the HTML notes field
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cred.notes || '';
            const plainSnippet = tempDiv.innerText || 'No additional text';

            return (
              <div
                key={id}
                className="note-item"
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
                onClick={() => {
                  setSelectedId(id);
                  if (isMobile) {
                    setMobileView('editor');
                  }
                }}
                style={{
                  margin: '4px 6px',
                  padding: '10px 10px 10px 8px',
                  borderRadius: 8,
                  cursor: 'grab',
                  background: isSelected
                    ? ACTIVE_ACCENT.hex
                    : isDragOver
                    ? 'rgba(0, 122, 255, 0.15)'
                    : 'transparent',
                  color: isSelected ? '#ffffff' : 'var(--text)',
                  opacity: isDragging ? 0.4 : 1,
                  borderTop: isDragOver && draggedIdx !== null && index < draggedIdx ? '2px solid #007aff' : '1px solid transparent',
                  borderBottom: isDragOver && draggedIdx !== null && index > draggedIdx ? '2px solid #007aff' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {/* Drag Grip Handle */}
                <span
                  style={{
                    color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text3)',
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0
                  }}
                  title="Drag to reorder note"
                >
                  <GripVertical size={14} />
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
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
      background: theme === 'dark' ? '#05050a' : '#ffffff',
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
          background: theme === 'dark' ? '#05050a' : 'rgba(255, 255, 255, 0.5)',
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
      {activeCred && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          padding: '8px 24px',
          borderBottom: '1px solid var(--border)',
          background: theme === 'dark' ? '#05050a' : '#f5f5f7'
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

          <button
            onMouseDown={(e) => { e.preventDefault(); document.execCommand('underline', false); handleInput(); }}
            className="format-btn"
            style={{ textDecoration: 'underline' }}
            title="Underline"
          >
            U
          </button>

          <button
            onMouseDown={(e) => { e.preventDefault(); document.execCommand('strikeThrough', false); handleInput(); }}
            className="format-btn"
            style={{ textDecoration: 'line-through' }}
            title="Strikethrough"
          >
            S
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
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
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
                      e.preventDefault();
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

          {/* Alignment & Lists */}
          <button
            onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList', false); handleInput(); }}
            className="format-btn"
            title="Unordered Bullet List"
          >
            •=
          </button>
          
          <button
            onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertOrderedList', false); handleInput(); }}
            className="format-btn"
            title="Numbered List"
          >
            1.
          </button>

          <button
            onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyLeft', false); handleInput(); }}
            className="format-btn"
            title="Align Left"
          >
            ⇇
          </button>

          <button
            onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyCenter', false); handleInput(); }}
            className="format-btn"
            title="Align Center"
          >
            ≡
          </button>

          <button
            onMouseDown={(e) => { e.preventDefault(); document.execCommand('justifyRight', false); handleInput(); }}
            className="format-btn"
            title="Align Right"
          >
            ⇉
          </button>

          <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

          {/* Font Color Palette & Custom Picker */}
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Color:</span>
          {['inherit', '#007aff', '#22d3ee', '#34d399', '#f43f5e', '#fbbf24', '#a78bfa', '#9ca3af'].map(color => (
            <button
              key={color}
              onMouseDown={(e) => {
                e.preventDefault();
                const targetColor = color === 'inherit' ? (theme === 'dark' ? '#ffffff' : '#000000') : color;
                document.execCommand('foreColor', false, targetColor);
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

          <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

          {/* Password Box Button */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertPasswordBox();
            }}
            className="format-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(0, 122, 255, 0.12)',
              color: '#007aff',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: 12,
              border: '1px solid rgba(0, 122, 255, 0.25)',
              cursor: 'pointer'
            }}
            title="Insert Password Box at cursor position"
          >
            <Lock size={12} />
            <span>Password</span>
          </button>

          <div style={{ marginLeft: 'auto' }}>
            {activeCred && (
              <button
                onMouseDown={(e) => { e.preventDefault(); handleDownloadPDF(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 7,
                  background: '#007aff', border: 'none',
                  color: '#fff', fontSize: 11.5, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,122,255,0.25)',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0066d6'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#007aff'; }}
                title="Download this note as PDF with Season Travels watermark"
              >
                <Download size={12} /> PDF
              </button>
            )}
          </div>
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
            background: theme === 'dark' ? 'transparent' : '#ffffff',
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
              contentEditable={true}
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, color: 'var(--text3)', background: theme === 'dark' ? 'transparent' : '#ffffff' }}>
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
        .password-box-widget {
          user-select: auto !important;
          transition: all 0.2s ease-in-out;
        }
        .password-box-widget:hover {
          border-color: rgba(59, 130, 246, 0.6) !important;
          box-shadow: 0 6px 24px -2px rgba(0, 0, 0, 0.4), 0 0 12px rgba(59, 130, 246, 0.2) !important;
        }
        .pass-box-input {
          user-select: text !important;
          pointer-events: auto !important;
          -webkit-user-select: text !important;
          white-space: nowrap !important;
          transition: all 0.2s ease;
        }
        .pass-box-input:hover {
          border-color: rgba(59, 130, 246, 0.5) !important;
          background: rgba(15, 23, 42, 0.85) !important;
        }
        .pass-box-btn:hover {
          transform: translateY(-1px);
        }
        .pass-box-btn:active {
          transform: translateY(0);
        }
        .pass-verify-btn:hover {
          filter: brightness(1.1);
        }
        .pass-copy-btn:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          color: #ffffff !important;
        }
        .pass-remove-btn:hover {
          background: rgba(239, 68, 68, 0.28) !important;
          color: #ef4444 !important;
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
        .apple-notes-editor, .apple-notes-editor *:not(.pass-box-input) {
          font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
        }
        .apple-notes-editor ul {
          list-style-type: disc !important;
          margin-left: 20px !important;
          padding-left: 10px !important;
          margin-top: 8px !important;
          margin-bottom: 8px !important;
        }
        .apple-notes-editor ol {
          list-style-type: decimal !important;
          margin-left: 20px !important;
          padding-left: 10px !important;
          margin-top: 8px !important;
          margin-bottom: 8px !important;
        }
        .apple-notes-editor li {
          display: list-item !important;
          margin-bottom: 4px !important;
        }
        .apple-notes-editor u { text-decoration: underline !important; }
        .apple-notes-editor s, .apple-notes-editor strike { text-decoration: line-through !important; }
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