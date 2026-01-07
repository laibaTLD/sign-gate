export type Doc = {
  id: string;
  title: string;
  status: 'PENDING' | 'SIGNED';
  createdAt: number;
  signedAt?: number;
  signerIP?: string;
  signerGmail?: string;
  fileUrl?: string;
  signedPdfUrl?: string;
  agentId?: string;
  agentName?: string;
  metadata?: any;
  signToken?: string;
};

export function uid(prefix = 'doc') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function asMillis(v: any): number | undefined {
  if (!v) return undefined;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  const n = Date.parse(String(v));
  return isNaN(n) ? undefined : n;
}

export function mapAnyToDoc(x: any): Doc {
  const id = String(x._id || x.id);
  const statusRaw = String(x.status || 'PENDING');
  const status = statusRaw.toUpperCase() === 'SIGNED' ? 'SIGNED' : 'PENDING';
  return {
    id,
    title: String(x.title || x.name || x.documentTitle || 'Untitled'),
    status,
    createdAt: asMillis(x.createdAt) ?? asMillis(x.created_at) ?? Date.now(),
    signedAt: asMillis(x.signedAt),
    signerIP: x.signerIP,
    signerGmail: x.signerGmail,
    fileUrl: x.fileUrl || x.pdfUrl || x.base64 || x.file || undefined,
    signedPdfUrl: x.signedPdfUrl || undefined,
    agentId: String(x.agentId || x?.metadata?.agentId || ''),
    agentName: String(x.agentName || ''),
    metadata: x.metadata || {
      clientName: x.clientName,
      clientEmail: x.clientEmail,
      projectName: x.projectName,
      agencyName: x.agencyName,
      agencyEmail: x.agencyEmail,
    },
    signToken: x.signToken,
  };
}
