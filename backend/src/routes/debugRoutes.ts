import express from 'express';
import { docsCollection, mongoUri, buildSigningLink, COMPANY_EMAIL } from '../config';
import { mongoose } from '../db';
import { mapAnyToDoc } from '../models/doc';
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
  const { recipient, documentId } = req.body;
  if (!recipient) return res.status(400).json({ message: 'Recipient required' });
  if (!documentId) return res.status(400).json({ message: 'Document ID required' });

  try {
    const Model = mongoose.connection.collection(docsCollection);
    const or: any[] = [{ id: documentId }];
    try { or.unshift({ _id: new mongoose.Types.ObjectId(documentId) }); } catch { }
    const mongoDoc = await Model.findOne({ $or: or });
    if (!mongoDoc) return res.status(404).json({ message: 'Document not found' });

    const doc = mapAnyToDoc(mongoDoc);
    if (!doc.signToken) return res.status(400).json({ message: 'Document has no signing token' });

    const link = buildSigningLink(doc.id, doc.signToken);

    await sendAgreementEmail(
      recipient,
      doc.metadata?.agencyEmail || COMPANY_EMAIL,
      doc.agentName || 'Test Agent',
      doc.metadata?.clientName || 'Test Client',
      doc.title,
      link
    );
    res.json({ message: 'Test email sent successfully', link });
  } catch (err: any) {
    console.error('Test email failed:', err);
    const smtpError = err?.response || err?.message || String(err);
    res.status(500).json({
      message: 'Failed to send test email. Check SMTP credentials.',
      error: smtpError,
    });
  }
});

export default router;
