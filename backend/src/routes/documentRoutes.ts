import express from 'express';
import { authRequired, requireRole } from '../middleware/auth';
import { docsCollection, frontendUrl } from '../config';
import { mongoose } from '../db';
import { Doc, mapAnyToDoc, uid } from '../models/doc';
import { embedSignatureInPdf, generateBasePdf } from '../pdfService';
import { sendAgreementEmail } from '../emailService';

const router = express.Router();

// List documents (optionally filter by status/agentId/clientId) - Mongo only
router.get('/api/documents', authRequired, async (req, res) => {
  try {
    const { status, agentId, clientId } = req.query as any;
    const currentUser = (req as any).user;
    const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';

    const Model = mongoose.connection.collection(docsCollection);
    const query: any = {};
    if (status) query.status = new RegExp(`^${String(status)}$`, 'i');

    const effectiveAgentId = isAdmin ? agentId : currentUser?.id;
    if (effectiveAgentId) {
      query.$or = [
        { agentId: String(effectiveAgentId) },
        { 'metadata.agentId': String(effectiveAgentId) }
      ];
    }
    if (clientId) query['metadata.clientId'] = String(clientId);

    const mongoDocs = await Model.find(query).limit(1000).toArray();
    let mapped = mongoDocs.map(mapAnyToDoc);

    if (!isAdmin) {
      const ownerId = String(currentUser?.id || '');
      mapped = mapped.filter(d => {
        const docAgentId = String(d.agentId || '');
        const metaAgentId = String(d.metadata?.agentId || '');
        return ownerId && (docAgentId === ownerId || metaAgentId === ownerId);
      });
    }

    res.json({ documents: mapped });
  } catch (e) {
    console.error('[documents] list failed', e);
    res.status(500).json({ message: 'Failed to list documents' });
  }
});

// Get by id (auth) - Mongo only
router.get('/api/documents/:id', authRequired, async (req, res) => {
  try {
    const Model = mongoose.connection.collection(docsCollection);
    const or: any[] = [{ id: req.params.id }];
    try { or.unshift({ _id: new mongoose.Types.ObjectId(req.params.id) }); } catch { }
    const mongoDoc = await Model.findOne({ $or: or });
    if (!mongoDoc) return res.status(404).json({ message: 'Not found' });

    const doc = mapAnyToDoc(mongoDoc);
    const currentUser = (req as any).user;
    const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
    if (!isAdmin) {
      const ownerId = String(currentUser?.id || '');
      const docAgentId = String(doc.agentId || '');
      const metaAgentId = String(doc.metadata?.agentId || '');
      if (ownerId && docAgentId !== ownerId && metaAgentId !== ownerId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    res.json({ document: doc });
  } catch (e) {
    console.error('[documents] get failed', e);
    res.status(500).json({ message: 'Failed to fetch document' });
  }
});

// Public get (by token) - Mongo only
router.get('/api/documents/:id/public', async (req, res) => {
  const { token } = req.query as any;
  try {
    const Model = mongoose.connection.collection(docsCollection);
    const or: any[] = [{ id: req.params.id }];
    try { or.unshift({ _id: new mongoose.Types.ObjectId(req.params.id) }); } catch { }
    const mongoDoc = await Model.findOne({ $or: or });
    if (!mongoDoc) return res.status(404).json({ message: 'Not found' });

    const mapped = mapAnyToDoc(mongoDoc);
    if (!token || token !== mapped.signToken) return res.status(401).json({ message: 'Invalid token' });
    res.json({ document: mapped });
  } catch (e) {
    console.error('[documents] public get failed', e);
    res.status(500).json({ message: 'Failed to load document' });
  }
});

// Create document - Mongo only
router.post('/api/documents', authRequired, requireRole('admin', 'agent'), async (req, res) => {
  const body = req.body || {};
  const currentUser = (req as any).user;
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
  const id = uid('doc');
  const signToken = uid('sign');

  const doc: Doc = {
    id,
    title: body.title || 'Untitled',
    status: 'PENDING',
    createdAt: Date.now(),
    fileUrl: body.fileUrl,
    agentId: isAdmin ? (body.metadata?.agentId || String(currentUser?.id || '')) : String(currentUser?.id || ''),
    agentName: isAdmin ? (body.metadata?.agentName || currentUser?.name) : currentUser?.name,
    metadata: {
      ...(body.metadata || {}),
      agentId: isAdmin ? (body.metadata?.agentId || String(currentUser?.id || '')) : String(currentUser?.id || ''),
    },
    signToken,
  };

  try {
    const Model = mongoose.connection.collection(docsCollection);
    await Model.insertOne({
      id: doc.id,
      title: doc.title,
      status: doc.status,
      createdAt: new Date(doc.createdAt),
      signedAt: doc.signedAt ? new Date(doc.signedAt) : undefined,
      signerIP: doc.signerIP,
      signerGmail: doc.signerGmail,
      fileUrl: doc.fileUrl,
      signedPdfUrl: doc.signedPdfUrl,
      agentId: doc.agentId,
      agentName: doc.agentName,
      metadata: doc.metadata,
      signToken: doc.signToken,
    } as any);

    if (doc.metadata?.clientEmail) {
      const agentEmail = doc.metadata.agencyEmail || 'info@usbrandbooster.com';
      const link = `${frontendUrl.replace(/\/$/, '')}/#/sign/${encodeURIComponent(doc.id)}?token=${encodeURIComponent(doc.signToken || '')}`;
      await sendAgreementEmail(
        doc.metadata.clientEmail,
        agentEmail,
        doc.agentName || 'Agent',
        doc.metadata.clientName || 'Client',
        doc.title,
        link
      );
    }

    res.status(201).json({ document: doc });
  } catch (e) {
    console.error('[documents] create failed', e);
    res.status(500).json({ message: 'Failed to create document' });
  }
});

// Resend (regenerates token and sends email) - Mongo only
router.post('/api/documents/:id/resend', authRequired, requireRole('admin', 'agent'), async (req, res) => {
  const currentUser = (req as any).user;
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';

  try {
    const Model = mongoose.connection.collection(docsCollection);
    const or: any[] = [{ id: req.params.id }];
    try { or.unshift({ _id: new mongoose.Types.ObjectId(req.params.id) }); } catch { }
    const mongoDoc = await Model.findOne({ $or: or });
    if (!mongoDoc) return res.status(404).json({ message: 'Not found' });

    const doc = mapAnyToDoc(mongoDoc);

    if (!isAdmin) {
      const ownerId = String(currentUser?.id || '');
      const docAgentId = String(doc.agentId || '');
      const metaAgentId = String(doc.metadata?.agentId || '');
      if (ownerId && docAgentId !== ownerId && metaAgentId !== ownerId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const newToken = uid('sign');
    await Model.updateOne({ $or: or }, { $set: { signToken: newToken } } as any);
    doc.signToken = newToken;

    if (doc.metadata?.clientEmail) {
      const agentEmail = doc.metadata.agencyEmail || 'info@usbrandbooster.com';
      const link = `${frontendUrl.replace(/\/$/, '')}/#/sign/${encodeURIComponent(doc.id)}?token=${encodeURIComponent(doc.signToken || '')}`;
      await sendAgreementEmail(
        doc.metadata.clientEmail,
        agentEmail,
        doc.agentName || 'Agent',
        doc.metadata.clientName || 'Client',
        doc.title,
        link
      );
    }

    res.status(201).json({ document: doc });
  } catch (e) {
    console.error('[documents] resend failed', e);
    res.status(500).json({ message: 'Failed to resend document' });
  }
});

// Delete - Mongo only
router.delete('/api/documents/:id', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const Model = mongoose.connection.collection(docsCollection);
    const or: any[] = [{ id: req.params.id }];
    try { or.unshift({ _id: new mongoose.Types.ObjectId(req.params.id) }); } catch { }
    const result = await Model.deleteOne({ $or: or });
    if (!result.deletedCount) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[documents] delete failed', e);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

// Bulk import (merge) documents - Mongo only
router.post('/api/documents/import', authRequired, requireRole('admin'), async (req, res) => {
  const incoming: Partial<Doc>[] = Array.isArray(req.body) ? req.body : (req.body?.documents || []);
  if (!Array.isArray(incoming)) return res.status(400).json({ message: 'Invalid payload' });

  try {
    const Model = mongoose.connection.collection(docsCollection);
    let added = 0;

    for (const item of incoming) {
      if (!item) continue;
      const id = String(item.id || uid('doc'));
      const status = (String(item.status || 'PENDING').toUpperCase() === 'SIGNED' ? 'SIGNED' : 'PENDING') as Doc['status'];

      const doc: Doc = {
        id,
        title: String(item.title || 'Untitled'),
        status,
        createdAt: Number(item.createdAt || Date.now()),
        signedAt: item.signedAt ? Number(item.signedAt) : undefined,
        signerIP: item.signerIP as any,
        signerGmail: item.signerGmail as any,
        fileUrl: (item as any).fileUrl || (item as any).pdfUrl,
        signedPdfUrl: item.signedPdfUrl as any,
        agentId: (item as any).agentId,
        agentName: (item as any).agentName,
        metadata: (item as any).metadata || {
          clientName: (item as any).clientName,
          clientEmail: (item as any).clientEmail,
          projectName: (item as any).projectName,
          agencyName: (item as any).agencyName,
          agencyEmail: (item as any).agencyEmail,
        },
        signToken: (item as any).signToken || uid('sign'),
      };

      const or: any[] = [{ id: doc.id }];
      try { or.unshift({ _id: new mongoose.Types.ObjectId(doc.id) }); } catch { }

      const result = await Model.updateOne(
        { $or: or },
        {
          $set: {
            title: doc.title,
            status: doc.status,
            createdAt: new Date(doc.createdAt),
            signedAt: doc.signedAt ? new Date(doc.signedAt) : undefined,
            signerIP: doc.signerIP,
            signerGmail: doc.signerGmail,
            fileUrl: doc.fileUrl,
            signedPdfUrl: doc.signedPdfUrl,
            agentId: doc.agentId,
            agentName: doc.agentName,
            metadata: doc.metadata,
            signToken: doc.signToken,
          },
        } as any,
        { upsert: true } as any,
      );

      if (result.upsertedCount || result.matchedCount === 0) {
        added++;
      }
    }

    const total = await Model.countDocuments({});
    res.json({ ok: true, added, total });
  } catch (e) {
    console.error('[documents] import failed', e);
    res.status(500).json({ message: 'Failed to import documents' });
  }
});

// Sign - Mongo only
router.post('/api/documents/:id/sign', async (req, res) => {
  const { dataUrl, token, signerEmail } = req.body || {};

  try {
    const Model = mongoose.connection.collection(docsCollection);
    const or: any[] = [{ id: req.params.id }];
    try { or.unshift({ _id: new mongoose.Types.ObjectId(req.params.id) }); } catch { }
    const mongoDoc = await Model.findOne({ $or: or });
    if (!mongoDoc) return res.status(404).json({ message: 'Not found' });

    let doc = mapAnyToDoc(mongoDoc);

    if (token && doc.signToken && token !== doc.signToken) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    let basePdf: string;
    let lastY: number | undefined;

    if (doc.fileUrl && doc.fileUrl.startsWith('data:application/pdf')) {
      basePdf = doc.fileUrl;
    } else {
      const result = await generateBasePdf(doc.metadata || doc);
      basePdf = result.pdf;
      lastY = result.lastY;
    }

    const signerInfo = {
      email: signerEmail || doc.metadata?.clientEmail,
      signedAt: Date.now(),
      clientCompanyName: doc.metadata?.clientCompanyName || doc.metadata?.clientCompany,
      businessOwnerName: doc.metadata?.businessOwnerName || doc.metadata?.clientName
    };

    const signedPdfUrl = await embedSignatureInPdf(basePdf, dataUrl, signerInfo, lastY);

    doc.status = 'SIGNED';
    doc.signedPdfUrl = signedPdfUrl;
    doc.signedAt = signerInfo.signedAt;
    doc.signerGmail = signerInfo.email;

    await Model.updateOne(
      { $or: or },
      {
        $set: {
          status: doc.status,
          signedAt: new Date(doc.signedAt || Date.now()),
          signerGmail: doc.signerGmail,
          signedPdfUrl: doc.signedPdfUrl,
        }
      } as any
    );

    res.json({ document: doc });
  } catch (error) {
    console.error('Error signing document:', error);
    res.status(500).json({ message: 'Failed to sign document' });
  }
});

export default router;
