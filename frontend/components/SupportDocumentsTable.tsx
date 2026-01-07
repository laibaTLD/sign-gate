import React from 'react';
import { Copy, Send, FileCheck } from 'lucide-react';

interface SupportDocumentsTableProps {
  docs: any[];
  onCopyLink: (doc: any) => void;
  onResendLink: (doc: any) => void;
}

const SupportDocumentsTable: React.FC<SupportDocumentsTableProps> = ({ docs, onCopyLink, onResendLink }) => {
  const buildPdfHref = (doc: any) => {
    const source = doc.signedPdfUrl;
    if (!source) return undefined;

    const value = String(source);
    if (value.startsWith('data:application/pdf')) {
      return value;
    }

    return `data:application/pdf;base64,${value}`;
  };

  return (
    <div className="bg-white shadow-sm rounded-lg border border-brand-100 overflow-hidden">
      <table className="min-w-full divide-y divide-brand-100">
        <thead className="bg-brand-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-brand-500 uppercase tracking-wider">Document</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-brand-500 uppercase tracking-wider">Client</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-brand-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-brand-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-brand-100">
          {docs.map((doc: any) => (
            <tr key={doc._id || doc.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-brand-900">{doc.title}</div>
                <div className="text-xs text-brand-500">{doc.projectName || doc?.metadata?.projectName}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-brand-900">{doc.clientName || doc?.metadata?.clientName}</div>
                <div className="text-xs text-brand-500">{doc.clientEmail || doc?.metadata?.clientEmail}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${String(doc.status).toLowerCase() === 'signed' ? 'bg-brand-800 text-yellow-300' : 'bg-yellow-100 text-yellow-800'}`}>
                  {doc.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-4">
                <button onClick={() => onCopyLink(doc)} className="text-yellow-600 hover:text-yellow-500 flex items-center gap-1">
                  <Copy size={16} /> Copy Link
                </button>
                {String(doc.status).toLowerCase() !== 'signed' && (
                  <button onClick={() => onResendLink(doc)} className="text-blue-600 hover:text-blue-900 flex items-center gap-1">
                    <Send size={16} /> Resend Link
                  </button>
                )}
                {String(doc.status).toLowerCase() === 'signed' && (
                  <a
                    href={buildPdfHref(doc)}
                    download={`${doc.title}-signed.pdf`}
                    className="text-green-600 hover:text-green-900 flex items-center gap-1"
                  >
                    <FileCheck size={16} /> Download
                  </a>
                )}
              </td>
            </tr>
          ))}
          {docs.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No documents created yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SupportDocumentsTable;
