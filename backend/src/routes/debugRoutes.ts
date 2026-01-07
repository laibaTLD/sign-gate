import express from 'express';
import { docsCollection, mongoUri } from '../config';
import { mongoose } from '../db';
import { sendAgreementEmail } from '../emailService';

const router = express.Router();

router.get('/api/debug/mongo', async (_req, res) => {
  if (!mongoUri) return res.json({ configured: false });
  try {
    const connected = mongoose.connection.readyState === 1;
    if (!connected) return res.json({ configured: true, connected: false });
    const Model = mongoose.connection.collection(docsCollection);
    const count = await Model.countDocuments({});
    const sample = await Model.find({}).limit(5).toArray();
    res.json({ configured: true, connected: true, count, sample: sample.map(s => ({ id: String(s._id || s.id), title: s.title || s.name })) });
  } catch (e: any) {
    res.status(500).json({ configured: true, error: e?.message || String(e) });
  }
});

router.post('/api/debug/test-email', async (req, res) => {
  const { recipient } = req.body;
  if (!recipient) return res.status(400).json({ message: 'Recipient required' });

  const dummyPdf = 'JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXwKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCj4+CmVuZG9iagoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAgCjAwMDAwMDAxNTcgMDAwMDAgbiAgCnRyYWlsZXIKPDwKICAvU2l6ZSA0CiAgL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjIxMwolJUVPRgo=';

  try {
    await sendAgreementEmail(
      recipient,
      'test-agent@example.com',
      'Test Agent',
      'Test Client',
      'SMTP Test Document',
      dummyPdf
    );
    res.json({ message: 'Test email queued/sent' });
  } catch (err: any) {
    console.error('Test email failed:', err);
    res.status(500).json({ message: 'Failed to send test email', error: err.message });
  }
});

export default router;
