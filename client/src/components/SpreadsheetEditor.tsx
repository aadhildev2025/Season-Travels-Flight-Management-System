import React, { useState, useEffect, useRef } from 'react';
import { useSpreadsheetStore, SpreadsheetData, SheetData, CellData, RowData } from '../store/spreadsheetStore';
import { 
  ArrowLeft, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  Plus, Trash2, Download, RefreshCw, Type, Save, Grid
} from 'lucide-react';

interface SpreadsheetEditorProps {
  onBack: () => void;
}

export function SpreadsheetEditor({ onBack }: SpreadsheetEditorProps) {
  const { activeSpreadsheet, updateSpreadsheet, setActiveSpreadsheet, saveStatus } = useSpreadsheetStore();
  
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  
  // Font Color & Highlight pickers
  const [showColorPicker, setShowColorPicker] = useState<'font' | 'bg' | null>(null);

  // Resize State variables
  const [resizingColIdx, setResizingColIdx] = useState<number | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const [resizingRowIdx, setResizingRowIdx] = useState<number | null>(null);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);

  // Tab Rename State
  const [editingTabIdx, setEditingTabIdx] = useState<number | null>(null);
  const [editTabName, setEditTabName] = useState('');

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  
  // Debounce saving
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutosave = (updatedSpreadsheet = activeSpreadsheet) => {
    if (!updatedSpreadsheet) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateSpreadsheet(updatedSpreadsheet.id, {
        title: updatedSpreadsheet.title,
        sheets: updatedSpreadsheet.sheets,
      });
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  if (!activeSpreadsheet) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <p className="text-red-500 font-semibold">No spreadsheet selected.</p>
        <button onClick={onBack} className="btn btn-ghost flex items-center gap-2">
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    );
  }

  const currentSheet = activeSpreadsheet.sheets[activeSheetIdx] || activeSpreadsheet.sheets[0];
  if (!currentSheet) return null;

  // ════════════════════ FORMULA ENGINE ════════════════════

  // Converts 'A' -> 0, 'B' -> 1, 'AA' -> 26
  function colLabelToIndex(label: string): number {
    let idx = 0;
    for (let i = 0; i < label.length; i++) {
      idx = idx * 26 + (label.charCodeAt(i) - 64);
    }
    return idx - 1;
  }

  // Converts 0 -> 'A', 1 -> 'B', 26 -> 'AA'
  function indexToColLabel(index: number): string {
    let label = '';
    let temp = index;
    while (temp >= 0) {
      label = String.fromCharCode((temp % 26) + 65) + label;
      temp = Math.floor(temp / 26) - 1;
    }
    return label;
  }

  function getCellValueByRef(ref: string, sheet: SheetData): string {
    const colLabel = ref.match(/[A-Z]+/)?.[0] || 'A';
    const rowIdx = parseInt(ref.match(/\d+/)?.[0] || '1', 10) - 1;
    const colIdx = colLabelToIndex(colLabel);
    return sheet.rows[rowIdx]?.cells[colIdx]?.value || '';
  }

  function evaluateCell(value: string, sheet: SheetData, visited: Set<string> = new Set()): string {
    if (!value.startsWith('=')) return value;
    
    const formulaStr = value.substring(1).toUpperCase().trim();
    if (visited.has(formulaStr)) return '#CIRCULAR!'; // Simple circular reference detection
    visited.add(formulaStr);
    
    try {
      // 1. Math functions: SUM, AVERAGE, COUNT, MIN, MAX
      const match = formulaStr.match(/^([A-Z]+)\((.+)\)$/);
      if (match) {
        const funcName = match[1];
        const argsStr = match[2];
        let cells: CellData[] = [];
        
        if (argsStr.includes(':')) {
          const parts = argsStr.split(':');
          const start = parts[0].trim();
          const end = parts[1].trim();
          
          const startCol = start.match(/[A-Z]+/)?.[0] || 'A';
          const startRow = parseInt(start.match(/\d+/)?.[0] || '1', 10) - 1;
          const endCol = end.match(/[A-Z]+/)?.[0] || 'A';
          const endRow = parseInt(end.match(/\d+/)?.[0] || '1', 10) - 1;
          
          const startColIdx = colLabelToIndex(startCol);
          const endColIdx = colLabelToIndex(endCol);
          
          const minCol = Math.min(startColIdx, endColIdx);
          const maxCol = Math.max(startColIdx, endColIdx);
          const minRow = Math.min(startRow, endRow);
          const maxRow = Math.max(startRow, endRow);
          
          for (let r = minRow; r <= maxRow; r++) {
            const row = sheet.rows[r];
            if (!row) continue;
            for (let c = minCol; c <= maxCol; c++) {
              const cell = row.cells[c];
              if (cell) cells.push(cell);
            }
          }
        } else {
          const refs = argsStr.split(',');
          for (const ref of refs) {
            const trimmedRef = ref.trim();
            const colLabel = trimmedRef.match(/[A-Z]+/)?.[0] || 'A';
            const rowIdx = parseInt(trimmedRef.match(/\d+/)?.[0] || '1', 10) - 1;
            const colIdx = colLabelToIndex(colLabel);
            const cell = sheet.rows[rowIdx]?.cells[colIdx];
            if (cell) cells.push(cell);
          }
        }
        
        const values = cells.map(c => {
          const val = c.value.startsWith('=') ? evaluateCell(c.value, sheet, new Set(visited)) : c.value;
          return parseFloat(val);
        }).filter(v => !isNaN(v));
        
        if (funcName === 'SUM') {
          return values.reduce((sum, v) => sum + v, 0).toString();
        } else if (funcName === 'AVERAGE') {
          return values.length > 0 ? (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2) : '0';
        } else if (funcName === 'COUNT') {
          return values.length.toString();
        } else if (funcName === 'MIN') {
          return values.length > 0 ? Math.min(...values).toString() : '0';
        } else if (funcName === 'MAX') {
          return values.length > 0 ? Math.max(...values).toString() : '0';
        }
      }
      
      // 2. Simple arithmetic like A1+B1, A1-B1, etc.
      const arithmeticMatch = formulaStr.match(/^([A-Z]+\d+)\s*([\+\-\*\/])\s*([A-Z]+\d+)$/);
      if (arithmeticMatch) {
        const cellRef1 = arithmeticMatch[1];
        const op = arithmeticMatch[2];
        const cellRef2 = arithmeticMatch[3];
        
        const val1Str = getCellValueByRef(cellRef1, sheet);
        const val2Str = getCellValueByRef(cellRef2, sheet);
        
        const v1 = parseFloat(val1Str.startsWith('=') ? evaluateCell(val1Str, sheet, new Set(visited)) : val1Str);
        const v2 = parseFloat(val2Str.startsWith('=') ? evaluateCell(val2Str, sheet, new Set(visited)) : val2Str);
        
        if (isNaN(v1) || isNaN(v2)) return '#VALUE!';
        
        if (op === '+') return (v1 + v2).toString();
        if (op === '-') return (v1 - v2).toString();
        if (op === '*') return (v1 * v2).toString();
        if (op === '/') return v2 !== 0 ? (v1 / v2).toString() : '#DIV/0!';
      }
      
      // 3. Single cell reference like =A1
      const singleRefMatch = formulaStr.match(/^([A-Z]+\d+)$/);
      if (singleRefMatch) {
        const ref = singleRefMatch[1];
        const valStr = getCellValueByRef(ref, sheet);
        return valStr.startsWith('=') ? evaluateCell(valStr, sheet, new Set(visited)) : valStr;
      }
      
      // 4. Raw number evaluate
      const num = parseFloat(formulaStr);
      if (!isNaN(num)) return num.toString();

      return '#ERROR!';
    } catch (e) {
      return '#ERROR!';
    }
  }

  const getDisplayValue = (cell: CellData) => {
    if (!cell) return '';
    if (cell.value.startsWith('=')) {
      return evaluateCell(cell.value, currentSheet);
    }
    return cell.value;
  };

  // ════════════════════ ACTIONS & EDITING ════════════════════

  const handleCellSelect = (rowIdx: number, colIdx: number) => {
    if (isEditing) {
      saveCellEdit();
    }
    setSelectedCell({ row: rowIdx, col: colIdx });
    const cell = currentSheet.rows[rowIdx]?.cells[colIdx];
    setEditValue(cell ? cell.value : '');
    setIsEditing(false);
  };

  const handleCellDoubleClick = (rowIdx: number, colIdx: number) => {
    setSelectedCell({ row: rowIdx, col: colIdx });
    const cell = currentSheet.rows[rowIdx]?.cells[colIdx];
    setEditValue(cell ? cell.value : '');
    setIsEditing(true);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const saveCellEdit = () => {
    if (!selectedCell) return;
    // Deep-clone so we never mutate the store's live object references
    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx];

    if (!sheet.rows[selectedCell.row]) {
      sheet.rows[selectedCell.row] = { cells: [], height: 30 };
    }
    if (!sheet.rows[selectedCell.row].cells[selectedCell.col]) {
      sheet.rows[selectedCell.row].cells[selectedCell.col] = {
        value: '', bold: false, italic: false, underline: false,
        fontSize: 14, fontFamily: 'sans-serif', backgroundColor: '', fontColor: '', align: 'left'
      };
    }

    sheet.rows[selectedCell.row].cells[selectedCell.col].value = editValue;

    setActiveSpreadsheet(updated);
    setIsEditing(false);
    triggerAutosave(updated);
  };

  const updateCellFormatting = (formatter: (cell: CellData) => CellData) => {
    if (!selectedCell) return;
    // Deep-clone to avoid mutating shared nested arrays in the store
    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx];

    const row = sheet.rows[selectedCell.row];
    if (row) {
      const cell = row.cells[selectedCell.col] || {
        value: '', bold: false, italic: false, underline: false,
        fontSize: 14, fontFamily: 'sans-serif', backgroundColor: '', fontColor: '', align: 'left'
      };
      row.cells[selectedCell.col] = formatter(cell);
    }

    setActiveSpreadsheet(updated);
    triggerAutosave(updated);
  };

  // Cell Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return;
    
    if (isEditing) {
      if (e.key === 'Enter') {
        saveCellEdit();
        // Move selection down
        if (selectedCell.row < currentSheet.rows.length - 1) {
          setSelectedCell({ ...selectedCell, row: selectedCell.row + 1 });
        }
      } else if (e.key === 'Escape') {
        const cell = currentSheet.rows[selectedCell.row]?.cells[selectedCell.col];
        setEditValue(cell ? cell.value : '');
        setIsEditing(false);
      }
      return;
    }

    let nextRow = selectedCell.row;
    let nextCol = selectedCell.col;
    let handled = false;

    switch (e.key) {
      case 'ArrowUp':
        if (nextRow > 0) nextRow--;
        handled = true;
        break;
      case 'ArrowDown':
        if (nextRow < currentSheet.rows.length - 1) nextRow++;
        handled = true;
        break;
      case 'ArrowLeft':
        if (nextCol > 0) nextCol--;
        handled = true;
        break;
      case 'ArrowRight':
        if (nextCol < (currentSheet.rows[0]?.cells.length || 0) - 1) nextCol++;
        handled = true;
        break;
      case 'Tab':
        e.preventDefault();
        if (nextCol < (currentSheet.rows[0]?.cells.length || 0) - 1) {
          nextCol++;
        } else if (nextRow < currentSheet.rows.length - 1) {
          nextRow++;
          nextCol = 0;
        }
        handled = true;
        break;
      case 'Enter':
        e.preventDefault();
        setIsEditing(true);
        setTimeout(() => editInputRef.current?.focus(), 50);
        handled = true;
        break;
      default:
        // If user starts typing without double clicking
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          setEditValue(e.key);
          setIsEditing(true);
          setTimeout(() => editInputRef.current?.focus(), 50);
          handled = true;
        }
        break;
    }

    if (handled) {
      setSelectedCell({ row: nextRow, col: nextCol });
      const cell = currentSheet.rows[nextRow]?.cells[nextCol];
      setEditValue(cell ? cell.value : '');
    }
  };

  // Active cell properties
  const activeCell = selectedCell ? currentSheet.rows[selectedCell.row]?.cells[selectedCell.col] : null;

  // ════════════════════ DRAG RESIZE LIFECYCLE ════════════════════

  // Columns
  const handleColResizeStart = (e: React.MouseEvent, colIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColIdx(colIdx);
    setStartX(e.clientX);
    const w = currentSheet.colWidths?.[colIdx] || 120;
    setStartWidth(w);
  };

  useEffect(() => {
    if (resizingColIdx === null) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(60, startWidth + deltaX);
      const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
      const sheet = updated.sheets[activeSheetIdx];
      const widths = [...(sheet.colWidths || [])];
      widths[resizingColIdx] = newWidth;
      sheet.colWidths = widths;
      setActiveSpreadsheet(updated);
    };

    const handleMouseUp = () => {
      setResizingColIdx(null);
      triggerAutosave();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColIdx, startX, startWidth]);

  // Rows
  const handleRowResizeStart = (e: React.MouseEvent, rowIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingRowIdx(rowIdx);
    setStartY(e.clientY);
    const h = currentSheet.rows[rowIdx]?.height || 30;
    setStartHeight(h);
  };

  useEffect(() => {
    if (resizingRowIdx === null) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startY;
      const newHeight = Math.max(20, startHeight + deltaY);
      const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
      const sheet = updated.sheets[activeSheetIdx];
      if (sheet.rows[resizingRowIdx]) {
        sheet.rows[resizingRowIdx].height = newHeight;
      }
      setActiveSpreadsheet(updated);
    };

    const handleMouseUp = () => {
      setResizingRowIdx(null);
      triggerAutosave();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingRowIdx, startY, startHeight]);

  // ════════════════════ MULTI-SHEET TABS ════════════════════

  const handleAddSheet = () => {
    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const num = updated.sheets.length + 1;
    
    const newSheet: SheetData = {
      name: `Sheet ${num}`,
      rows: Array.from({ length: 30 }, () => ({
        cells: Array.from({ length: 15 }, () => ({
          value: '', bold: false, italic: false, underline: false,
          fontSize: 14, fontFamily: 'sans-serif', backgroundColor: '', fontColor: '', align: 'left'
        })),
        height: 30,
      })),
      colWidths: Array.from({ length: 15 }, () => 120),
    };

    updated.sheets.push(newSheet);
    setActiveSpreadsheet(updated);
    setActiveSheetIdx(updated.sheets.length - 1);
    setSelectedCell(null);
    triggerAutosave(updated);
  };

  const handleDeleteSheet = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeSpreadsheet.sheets.length <= 1) return;

    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    updated.sheets.splice(idx, 1);
    
    setActiveSpreadsheet(updated);
    setActiveSheetIdx(Math.max(0, idx - 1));
    setSelectedCell(null);
    triggerAutosave(updated);
  };

  const handleStartRenameSheet = (idx: number) => {
    setEditingTabIdx(idx);
    setEditTabName(activeSpreadsheet.sheets[idx].name);
  };

  const handleSaveRenameSheet = () => {
    if (editingTabIdx === null || !editTabName.trim()) return;
    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    updated.sheets[editingTabIdx].name = editTabName.trim();
    setActiveSpreadsheet(updated);
    setEditingTabIdx(null);
    triggerAutosave(updated);
  };

  // ════════════════════ INSERT/DELETE ROWS & COLS ════════════════════

  const insertRow = (above = true) => {
    if (!selectedCell) return;
    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx];
    const targetIdx = above ? selectedCell.row : selectedCell.row + 1;
    
    const numCols = sheet.rows[0]?.cells.length || 15;
    const newRow: RowData = {
      cells: Array.from({ length: numCols }, () => ({
        value: '', bold: false, italic: false, underline: false,
        fontSize: 14, fontFamily: 'sans-serif', backgroundColor: '', fontColor: '', align: 'left'
      })),
      height: 30
    };

    sheet.rows.splice(targetIdx, 0, newRow);
    setActiveSpreadsheet(updated);
    setSelectedCell({ row: targetIdx, col: selectedCell.col });
    triggerAutosave(updated);
  };

  const deleteRow = () => {
    if (!selectedCell) return;
    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx];
    if (sheet.rows.length <= 1) return;

    sheet.rows.splice(selectedCell.row, 1);
    setActiveSpreadsheet(updated);
    setSelectedCell({
      row: Math.min(selectedCell.row, sheet.rows.length - 1),
      col: selectedCell.col
    });
    triggerAutosave(updated);
  };

  const insertColumn = (left = true) => {
    if (!selectedCell) return;
    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx];
    const targetIdx = left ? selectedCell.col : selectedCell.col + 1;

    sheet.rows.forEach(row => {
      row.cells.splice(targetIdx, 0, {
        value: '', bold: false, italic: false, underline: false,
        fontSize: 14, fontFamily: 'sans-serif', backgroundColor: '', fontColor: '', align: 'left'
      });
    });

    if (sheet.colWidths) {
      sheet.colWidths.splice(targetIdx, 0, 120);
    }

    setActiveSpreadsheet(updated);
    setSelectedCell({ row: selectedCell.row, col: targetIdx });
    triggerAutosave(updated);
  };

  const deleteColumn = () => {
    if (!selectedCell) return;
    const updated: SpreadsheetData = JSON.parse(JSON.stringify(activeSpreadsheet));
    const sheet = updated.sheets[activeSheetIdx];
    const numCols = sheet.rows[0]?.cells.length || 0;
    if (numCols <= 1) return;

    sheet.rows.forEach(row => {
      row.cells.splice(selectedCell.col, 1);
    });

    if (sheet.colWidths) {
      sheet.colWidths.splice(selectedCell.col, 1);
    }

    setActiveSpreadsheet(updated);
    setSelectedCell({
      row: selectedCell.row,
      col: Math.min(selectedCell.col, numCols - 2)
    });
    triggerAutosave(updated);
  };

  // ════════════════════ CSV EXPORT ════════════════════

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    currentSheet.rows.forEach((row) => {
      const rowData = row.cells.map((cell) => {
        const val = getDisplayValue(cell);
        // Escape quotes
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvContent += rowData.join(",") + "\r\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeSpreadsheet.title}_${currentSheet.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
      
      {/* ════════════════════ TOOLBAR ════════════════════ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        
        <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}>
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

        {/* Font Family Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Type size={14} style={{ color: 'var(--text2)' }} />
          <select 
            value={activeCell?.fontFamily || 'sans-serif'} 
            onChange={(e) => updateCellFormatting(c => ({ ...c, fontFamily: e.target.value }))}
            disabled={!selectedCell}
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', fontSize: 12, outline: 'none' }}
          >
            <option value="sans-serif">System Sans</option>
            <option value="Inter">Inter</option>
            <option value="monospace">JetBrains Mono</option>
            <option value="serif">Georgia Serif</option>
            <option value="cursive">Cursive</option>
          </select>
        </div>

        {/* Font Size Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button 
            disabled={!selectedCell || (activeCell?.fontSize || 14) <= 8}
            onClick={() => updateCellFormatting(c => ({ ...c, fontSize: Math.max(8, (c.fontSize || 14) - 1) }))}
            className="btn btn-ghost btn-sm"
            style={{ padding: 4, minWidth: 24, height: 24 }}
            title="Decrease Font Size"
          >
            A-
          </button>
          <span style={{ fontSize: 12, width: 20, textAlign: 'center', fontWeight: 600 }}>{activeCell?.fontSize || 14}</span>
          <button 
            disabled={!selectedCell || (activeCell?.fontSize || 14) >= 36}
            onClick={() => updateCellFormatting(c => ({ ...c, fontSize: Math.min(36, (c.fontSize || 14) + 1) }))}
            className="btn btn-ghost btn-sm"
            style={{ padding: 4, minWidth: 24, height: 24 }}
            title="Increase Font Size"
          >
            A+
          </button>
        </div>

        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

        {/* Styling Toggles */}
        <div style={{ display: 'flex', gap: 2 }}>
          <button 
            disabled={!selectedCell}
            onClick={() => updateCellFormatting(c => ({ ...c, bold: !c.bold }))}
            className="btn btn-sm"
            style={{ 
              padding: '4px 8px', minWidth: 28, height: 28,
              background: activeCell?.bold ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              color: activeCell?.bold ? 'var(--indigo)' : 'var(--text)',
              border: activeCell?.bold ? '1px solid var(--indigo)' : '1px solid transparent'
            }}
            title="Bold"
          >
            <Bold size={13} />
          </button>
          <button 
            disabled={!selectedCell}
            onClick={() => updateCellFormatting(c => ({ ...c, italic: !c.italic }))}
            className="btn btn-sm"
            style={{ 
              padding: '4px 8px', minWidth: 28, height: 28,
              background: activeCell?.italic ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              color: activeCell?.italic ? 'var(--indigo)' : 'var(--text)',
              border: activeCell?.italic ? '1px solid var(--indigo)' : '1px solid transparent'
            }}
            title="Italic"
          >
            <Italic size={13} />
          </button>
          <button 
            disabled={!selectedCell}
            onClick={() => updateCellFormatting(c => ({ ...c, underline: !c.underline }))}
            className="btn btn-sm"
            style={{ 
              padding: '4px 8px', minWidth: 28, height: 28,
              background: activeCell?.underline ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              color: activeCell?.underline ? 'var(--indigo)' : 'var(--text)',
              border: activeCell?.underline ? '1px solid var(--indigo)' : '1px solid transparent'
            }}
            title="Underline"
          >
            <Underline size={13} />
          </button>
        </div>

        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

        {/* Alignment */}
        <div style={{ display: 'flex', gap: 2 }}>
          {(['left', 'center', 'right'] as const).map(alignMode => (
            <button 
              key={alignMode}
              disabled={!selectedCell}
              onClick={() => updateCellFormatting(c => ({ ...c, align: alignMode }))}
              className="btn btn-sm"
              style={{ 
                padding: '4px 8px', minWidth: 28, height: 28,
                background: (activeCell?.align || 'left') === alignMode ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: (activeCell?.align || 'left') === alignMode ? 'var(--indigo)' : 'var(--text)',
                border: (activeCell?.align || 'left') === alignMode ? '1px solid var(--indigo)' : '1px solid transparent'
              }}
              title={`Align ${alignMode}`}
            >
              {alignMode === 'left' && <AlignLeft size={13} />}
              {alignMode === 'center' && <AlignCenter size={13} />}
              {alignMode === 'right' && <AlignRight size={13} />}
            </button>
          ))}
        </div>

        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

        {/* Color Pickers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          {/* Text Color */}
          <button 
            disabled={!selectedCell}
            onClick={() => setShowColorPicker(showColorPicker === 'font' ? null : 'font')}
            className="btn btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}
            title="Font Color"
          >
            <span style={{ borderBottom: `3px solid ${activeCell?.fontColor || 'var(--text)'}`, fontSize: 11, fontWeight: 700 }}>A</span>
          </button>

          {/* Highlight Fill Color */}
          <button 
            disabled={!selectedCell}
            onClick={() => setShowColorPicker(showColorPicker === 'bg' ? null : 'bg')}
            className="btn btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}
            title="Cell Highlight (Fill)"
          >
            <div style={{ width: 12, height: 12, borderRadius: 3, background: activeCell?.backgroundColor || 'transparent', border: '1px solid var(--text2)' }} />
          </button>

          {/* Popover */}
          {showColorPicker && (
            <div style={{ 
              position: 'absolute', top: 32, left: 0, zIndex: 100, 
              background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4
            }}>
              {[
                '', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', 
                '#6366f1', '#8b5cf6', '#ec4899', '#f3f4f6', '#111827'
              ].map(color => (
                <button
                  key={color}
                  onClick={() => {
                    updateCellFormatting(c => {
                      if (showColorPicker === 'font') {
                        return { ...c, fontColor: color };
                      } else {
                        return { ...c, backgroundColor: color };
                      }
                    });
                    setShowColorPicker(null);
                  }}
                  style={{
                    width: 20, height: 20, borderRadius: 4, background: color || (showColorPicker === 'font' ? 'var(--text)' : 'transparent'),
                    border: '1px solid var(--border)', cursor: 'pointer'
                  }}
                  title={color || 'Clear'}
                />
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />

        {/* Row/Col Modifiers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button 
            disabled={!selectedCell}
            onClick={() => insertRow(true)}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, gap: 3 }}
            title="Insert Row Above"
          >
            +Row
          </button>
          <button 
            disabled={!selectedCell}
            onClick={() => deleteRow()}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, gap: 3, color: 'var(--red)' }}
            title="Delete Row"
          >
            -Row
          </button>
          <button 
            disabled={!selectedCell}
            onClick={() => insertColumn(true)}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, gap: 3 }}
            title="Insert Column Left"
          >
            +Col
          </button>
          <button 
            disabled={!selectedCell}
            onClick={() => deleteColumn()}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, gap: 3, color: 'var(--red)' }}
            title="Delete Column"
          >
            -Col
          </button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Export CSV */}
          <button onClick={handleExportCSV} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
            <Download size={13} /> Export CSV
          </button>

          {/* Save Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>
            {saveStatus === 'Saving...' ? (
              <RefreshCw size={11} className="spin" style={{ color: 'var(--indigo)' }} />
            ) : (
              <Save size={11} style={{ color: 'var(--green)' }} />
            )}
            <span>{saveStatus}</span>
          </div>
        </div>

      </div>

      {/* ════════════════════ FORMULA BAR ════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', gap: 8 }}>
        <div style={{ 
          fontSize: 11, fontWeight: 700, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, 
          padding: '2px 8px', minWidth: 46, textAlign: 'center', color: 'var(--indigo)' 
        }}>
          {selectedCell ? `${indexToColLabel(selectedCell.col)}${selectedCell.row + 1}` : '—'}
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', fontFamily: 'monospace' }}>fx</div>
        <input 
          ref={formulaInputRef}
          type="text" 
          disabled={!selectedCell}
          value={isEditing ? editValue : (activeCell?.value || '')}
          onChange={(e) => {
            // Only update local edit state — the actual cell write + save
            // happens once on blur/Enter via saveCellEdit, not per keystroke.
            setEditValue(e.target.value);
            setIsEditing(true);
          }}
          placeholder="Enter values, text or formulas (e.g. =SUM(A1:B3), =A1+B1)"
          style={{ 
            flex: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', 
            borderRadius: 6, padding: '4px 10px', fontSize: 13, outline: 'none', transition: 'border-color 0.15s' 
          }}
          onFocus={() => setIsEditing(true)}
          onBlur={() => saveCellEdit()}
        />
      </div>

      {/* ════════════════════ EXCEL GRID ════════════════════ */}
      <div 
        ref={gridContainerRef}
        style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content' }}>
          
          {/* Header Row (Column Labels) */}
          <thead>
            <tr>
              {/* Top-Left Corner intersection */}
              <th style={{ 
                width: 45, height: 26, background: 'var(--surface)', borderRight: '1px solid var(--border)', 
                borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, left: 0, zIndex: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Grid size={12} style={{ color: 'var(--text3)' }} />
              </th>
              
              {currentSheet.rows[0]?.cells.map((_, colIdx) => {
                const colWidth = currentSheet.colWidths?.[colIdx] || 120;
                const isColActive = selectedCell?.col === colIdx;
                
                return (
                  <th 
                    key={colIdx} 
                    style={{ 
                      width: colWidth, height: 26, background: isColActive ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)', 
                      color: isColActive ? 'var(--indigo)' : 'var(--text2)', fontWeight: isColActive ? 800 : 500, fontSize: 11,
                      borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                      position: 'sticky', top: 0, zIndex: 5, userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'relative' }}>
                      {indexToColLabel(colIdx)}
                      
                      {/* Resize Handle on Right border */}
                      <div 
                        onMouseDown={(e) => handleColResizeStart(e, colIdx)}
                        style={{ 
                          position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize',
                          background: resizingColIdx === colIdx ? 'var(--indigo)' : 'transparent',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--indigo)'}
                        onMouseLeave={(e) => {
                          if (resizingColIdx !== colIdx) e.currentTarget.style.background = 'transparent';
                        }}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Grid Rows */}
          <tbody>
            {currentSheet.rows.map((row, rowIdx) => {
              const isRowActive = selectedCell?.row === rowIdx;
              const rowHeight = row.height || 30;

              return (
                <tr key={rowIdx}>
                  
                  {/* Row Index Header */}
                  <td style={{ 
                    width: 45, height: rowHeight, background: isRowActive ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)', 
                    color: isRowActive ? 'var(--indigo)' : 'var(--text2)', fontWeight: isRowActive ? 800 : 500, fontSize: 11,
                    borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                    position: 'sticky', left: 0, zIndex: 5, userSelect: 'none', display: 'table-cell', verticalAlign: 'middle', textAlign: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', position: 'relative' }}>
                      {rowIdx + 1}
                      
                      {/* Resize Handle on Bottom border */}
                      <div 
                        onMouseDown={(e) => handleRowResizeStart(e, rowIdx)}
                        style={{ 
                          position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, cursor: 'row-resize',
                          background: resizingRowIdx === rowIdx ? 'var(--indigo)' : 'transparent',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--indigo)'}
                        onMouseLeave={(e) => {
                          if (resizingRowIdx !== rowIdx) e.currentTarget.style.background = 'transparent';
                        }}
                      />
                    </div>
                  </td>

                  {/* Grid Cells */}
                  {row.cells.map((cell, colIdx) => {
                    const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                    const colWidth = currentSheet.colWidths?.[colIdx] || 120;
                    
                    const cellStyle: React.CSSProperties = {
                      width: colWidth,
                      height: rowHeight,
                      borderRight: '1px solid var(--border)',
                      borderBottom: '1px solid var(--border)',
                      padding: '4px 8px',
                      fontSize: `${cell.fontSize || 14}px`,
                      fontFamily: cell.fontFamily || 'sans-serif',
                      fontWeight: cell.bold ? 'bold' : 'normal',
                      fontStyle: cell.italic ? 'italic' : 'normal',
                      textDecoration: cell.underline ? 'underline' : 'none',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.05)' : (cell.backgroundColor || 'transparent'),
                      color: cell.fontColor || 'var(--text)',
                      textAlign: cell.align || 'left',
                      verticalAlign: 'middle',
                      outline: isSelected ? '2px solid var(--indigo)' : 'none',
                      outlineOffset: -2,
                      cursor: 'cell',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      position: isSelected ? 'relative' : 'static',
                      zIndex: isSelected ? 4 : 'auto'
                    };

                    return (
                      <td 
                        key={colIdx} 
                        style={cellStyle}
                        onClick={() => handleCellSelect(rowIdx, colIdx)}
                        onDoubleClick={() => handleCellDoubleClick(rowIdx, colIdx)}
                      >
                        {isSelected && isEditing ? (
                          <input 
                            ref={editInputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveCellEdit}
                            style={{ 
                              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                              background: 'var(--bg)', color: 'var(--text)', border: 'none', 
                              outline: 'none', padding: '4px 8px', fontSize: `${cell.fontSize || 14}px`,
                              fontFamily: cell.fontFamily || 'sans-serif',
                              fontWeight: cell.bold ? 'bold' : 'normal',
                              fontStyle: cell.italic ? 'italic' : 'normal',
                            }}
                          />
                        ) : (
                          getDisplayValue(cell)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>

        </table>
      </div>

      {/* ════════════════════ BOTTOM TABS / SHEETS ════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '4px 16px', gap: 6, overflowX: 'auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 8 }}>
          {activeSpreadsheet.sheets.map((sheet, idx) => {
            const isActive = activeSheetIdx === idx;
            const isEditingName = editingTabIdx === idx;

            return (
              <div 
                key={idx}
                onClick={() => {
                  setActiveSheetIdx(idx);
                  setSelectedCell(null);
                  setIsEditing(false);
                }}
                onDoubleClick={() => handleStartRenameSheet(idx)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', 
                  background: isActive ? 'var(--bg2)' : 'rgba(255,255,255,0.02)',
                  color: isActive ? 'var(--indigo)' : 'var(--text2)', 
                  fontWeight: isActive ? 700 : 500, fontSize: 12,
                  borderTopLeftRadius: 6, borderTopRightRadius: 6, 
                  border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                  borderBottom: 'none', cursor: 'pointer', userSelect: 'none', height: 32
                }}
              >
                {isEditingName ? (
                  <input
                    type="text"
                    value={editTabName}
                    onChange={(e) => setEditTabName(e.target.value)}
                    onBlur={handleSaveRenameSheet}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRenameSheet();
                      if (e.key === 'Escape') setEditingTabIdx(null);
                    }}
                    autoFocus
                    style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--indigo)', borderRadius: 3, padding: '0 4px', fontSize: 11, width: 70, outline: 'none' }}
                  />
                ) : (
                  <span>{sheet.name}</span>
                )}

                {/* Close sheet tab button (Only if > 1 sheet) */}
                {activeSpreadsheet.sheets.length > 1 && (
                  <button 
                    onClick={(e) => handleDeleteSheet(idx, e)}
                    style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 10, cursor: 'pointer', padding: 2, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Sheet */}
        <button 
          onClick={handleAddSheet}
          className="btn btn-ghost btn-sm"
          style={{ padding: '4px 8px', borderRadius: 4, height: 26, width: 26, minWidth: 26 }}
          title="Add New Sheet"
        >
          <Plus size={14} />
        </button>

        <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>
          Double-click tab to rename • Double-click cell to edit
        </div>

      </div>

    </div>
  );
}
