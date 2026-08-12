import { useState, useEffect } from 'react';
import { useSpreadsheetStore, SpreadsheetData } from '../store/spreadsheetStore';
import { SpreadsheetEditor } from './SpreadsheetEditor';
import { apiFetch } from '../store/flightStore';

export function SpreadsheetConsole() {
  const { 
    createSpreadsheet, activeSpreadsheet, fetchSpreadsheetById, loading 
  } = useSpreadsheetStore();

  const [initializing, setInitializing] = useState(!activeSpreadsheet);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      // If we don't have any cached spreadsheet, show loading state
      if (!useSpreadsheetStore.getState().activeSpreadsheet) {
        setInitializing(true);
      }

      try {
        const data = await apiFetch('/api/spreadsheets');
        const list: SpreadsheetData[] = data.spreadsheets || [];
        useSpreadsheetStore.setState({ spreadsheets: list });

        const currentActive = useSpreadsheetStore.getState().activeSpreadsheet;

        if (list.length > 0) {
          const targetId = currentActive?.id || list[0].id;
          const foundInList = list.find(s => s.id === targetId);

          // If spreadsheet already has populated sheet data from list response, use directly (0 extra network calls!)
          if (foundInList && foundInList.sheets && foundInList.sheets.length > 0) {
            useSpreadsheetStore.getState().setActiveSpreadsheet(foundInList);
          } else {
            await fetchSpreadsheetById(targetId);
          }
        } else {
          // If no spreadsheets exist at all, auto-create "BOOKING" and open directly
          await createSpreadsheet('BOOKING');
        }
      } catch (err) {
        console.error('Failed to initialize spreadsheet:', err);
      } finally {
        if (isMounted) setInitializing(false);
      }
    };

    init();
    return () => { isMounted = false; };
  }, []);

  // Show loading spinner ONLY if there is no active/cached spreadsheet yet
  if (initializing && !activeSpreadsheet) {
    return (
      <div style={{ display: 'flex', flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', minHeight: 350 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div className="spin" style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--indigo)', borderTopColor: 'transparent' }} />
          <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>Opening Spreadsheet...</span>
        </div>
      </div>
    );
  }

  // Render SpreadsheetEditor directly
  if (activeSpreadsheet) {
    return <SpreadsheetEditor />;
  }

  return null;
}
