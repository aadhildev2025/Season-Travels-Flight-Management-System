import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as SpreadsheetModel from '../models/Spreadsheet.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const spreadsheets = await SpreadsheetModel.findAllSpreadsheets();
    return res.json({ spreadsheets });
  } catch (err) {
    console.error('Get spreadsheets error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const spreadsheet = await SpreadsheetModel.findSpreadsheetById(req.params.id);
    if (!spreadsheet) {
      return res.status(404).json({ error: 'Spreadsheet not found' });
    }
    return res.json({ spreadsheet });
  } catch (err) {
    console.error('Get spreadsheet error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, sheets } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const spreadsheet = await SpreadsheetModel.createSpreadsheet({
      title,
      sheets,
      createdBy: req.user.userId,
    });

    return res.json({ spreadsheet, success: true });
  } catch (err) {
    console.error('Create spreadsheet error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, sheets } = req.body;
    const spreadsheet = await SpreadsheetModel.findSpreadsheetById(req.params.id);
    if (!spreadsheet) {
      return res.status(404).json({ error: 'Spreadsheet not found' });
    }

    const updated = await SpreadsheetModel.updateSpreadsheet(req.params.id, {
      title,
      sheets,
    });

    return res.json({ spreadsheet: updated, success: true });
  } catch (err) {
    console.error('Update spreadsheet error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const spreadsheet = await SpreadsheetModel.findSpreadsheetById(req.params.id);
    if (!spreadsheet) {
      return res.status(404).json({ error: 'Spreadsheet not found' });
    }

    await SpreadsheetModel.deleteSpreadsheet(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete spreadsheet error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;