import React from 'react';
import { Copy, Send, FileCheck, FileText, Loader2 } from 'lucide-react';
import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';

interface SupportDocumentsTableProps {
  docs: any[];
  onCopyLink: (doc: any) => void;
  onResendLink: (doc: any) => void;
  resendingId?: string | null;
}

const SupportDocumentsTable: React.FC<SupportDocumentsTableProps> = ({ docs, onCopyLink, onResendLink, resendingId }) => {
  const buildPdfHref = (doc: any) => {
    const source = doc.signedPdfUrl;
    if (!source) return undefined;
    const value = String(source);
    if (value.startsWith('data:application/pdf')) return value;
    return `data:application/pdf;base64,${value}`;
  };

  if (docs.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Create your first agreement to send a signing link to your client."
        />
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-brand-100 bg-brand-50/80">
              <th className="px-5 py-3 text-left text-xs font-semibold text-brand-500 uppercase tracking-wider">Document</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-brand-500 uppercase tracking-wider">Client</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-brand-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-brand-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {docs.map((doc: any) => (
              <tr key={doc._id || doc.id} className="table-row-hover transition-colors">
                <td className="px-5 py-4">
                  <div className="text-sm font-medium text-brand-900">{doc.title}</div>
                  <div className="text-xs text-brand-400 mt-0.5">{doc.projectName || doc?.metadata?.projectName}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="text-sm text-brand-800">{doc.clientName || doc?.metadata?.clientName}</div>
                  <div className="text-xs text-brand-400 mt-0.5">{doc.clientEmail || doc?.metadata?.clientEmail}</div>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={String(doc.status).toLowerCase() === 'signed' ? 'signed' : 'pending'} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onCopyLink(doc)} className="btn btn-ghost btn-sm text-yellow-700 hover:text-yellow-800 hover:bg-yellow-50">
                      <Copy size={14} /> Copy
                    </button>
                    {String(doc.status).toLowerCase() !== 'signed' && (
                      <button
                        onClick={() => onResendLink(doc)}
                        disabled={resendingId === String(doc._id || doc.id)}
                        className="btn btn-ghost btn-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resendingId === String(doc._id || doc.id) ? (
                          <><Loader2 size={14} className="animate-spin" /> Sending...</>
                        ) : (
                          <><Send size={14} /> Resend</>
                        )}
                      </button>
                    )}
                    {String(doc.status).toLowerCase() === 'signed' && (
                      <a href={buildPdfHref(doc)} download={`${doc.title}-signed.pdf`} className="btn btn-ghost btn-sm text-green-600 hover:bg-green-50">
                        <FileCheck size={14} /> Download
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupportDocumentsTable;
