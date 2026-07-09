import React from 'react';
import { Download, FileText } from 'lucide-react';
import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';

interface AdminDocumentsListProps {
  docs: any[];
}

const AdminDocumentsList: React.FC<AdminDocumentsListProps> = ({ docs }) => {
  const buildPdfHref = (doc: any) => {
    const source = doc.signedPdfUrl || doc.fileUrl;
    if (!source) return undefined;
    const value = String(source);
    if (value.startsWith('data:application/pdf')) return value;
    return `data:application/pdf;base64,${value}`;
  };

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="font-semibold text-brand-900">All Documents</h3>
      </div>

      {docs.length === 0 ? (
        <EmptyState icon={FileText} title="No documents" description="Documents created by support agents will appear here." />
      ) : (
        <div className="divide-y divide-brand-50 max-h-[480px] overflow-y-auto">
          {docs.map((doc: any) => (
            <div key={doc._id || doc.id} className="px-5 py-4 flex items-center justify-between gap-4 table-row-hover transition-colors">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-brand-900 truncate">{doc.title}</h4>
                <p className="text-xs text-brand-500 mt-0.5 truncate">
                  {doc.clientName || doc?.metadata?.clientName} · {doc.clientEmail || doc?.metadata?.clientEmail}
                </p>
                <p className="text-xs text-brand-400 mt-0.5 truncate">
                  Agent: {doc.agentName || doc?.metadata?.agentName || doc?.metadata?.agencyName || '—'}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {String(doc.status).toLowerCase() === 'signed' && (doc.signedPdfUrl || doc.fileUrl) ? (
                  <a href={buildPdfHref(doc)} download={`${doc.title}_signed.pdf`} className="btn btn-ghost btn-sm text-green-600 hover:bg-green-50">
                    <Download size={14} /> PDF
                  </a>
                ) : (
                  <span className="text-xs text-brand-300">—</span>
                )}
                <StatusBadge status={String(doc.status).toLowerCase() === 'signed' ? 'signed' : 'pending'} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDocumentsList;
