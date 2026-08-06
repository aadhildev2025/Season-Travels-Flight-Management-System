import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import * as CredentialModel from '../models/Credential.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const credentials = await CredentialModel.findAllCredentials();
    return res.json({ credentials });
  } catch (err) {
    console.error('Get credentials error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, username, password, notes } = req.body;
    if (!title || !password) {
      return res.status(400).json({ error: 'Title and password are required' });
    }

    const credential = await CredentialModel.createCredential({
      title,
      username,
      password,
      notes,
      createdBy: req.user.userId,
    });

    return res.json({ credential, success: true });
  } catch (err) {
    console.error('Create credential error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, username, password, notes } = req.body;
    const credential = await CredentialModel.findCredentialById(req.params.id);
    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    const updated = await CredentialModel.updateCredential(req.params.id, {
      title,
      username,
      password,
      notes,
    });

    return res.json({ credential: updated, success: true });
  } catch (err) {
    console.error('Update credential error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const credential = await CredentialModel.findCredentialById(req.params.id);
    if (!credential) {
      return res.status(404).json({ error: 'Credential not found' });
    }

    await CredentialModel.deleteCredential(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete credential error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;