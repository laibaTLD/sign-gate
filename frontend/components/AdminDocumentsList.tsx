import React from 'react';

interface AdminDocumentsListProps {
  docs: any[];
}

const AdminDocumentsList: React.FC<AdminDocumentsListProps> = ({ docs }) => {
  const buildPdfHref = (doc: any) => {
    const source = doc.signedPdfUrl || doc.fileUrl;
    if (!source) return undefined;

    const value = String(source);
    if (value.startsWith('data:application/pdf')) {
      return value;
    }

    return `data:application/pdf;base64,${value}`;
  };

  return (
    <div className="mb-4">
      <div className="bg-white rounded-lg shadow-sm border border-brand-100 flex flex-col">
        <div className="p-4 border-b border-brand-100 bg-brand-50">
          <h3 className="font-semibold text-brand-800">All Documents</h3>
        </div>
        <div className="divide-y divide-brand-100 max-h-[500px] overflow-y-auto">
          {docs.map((doc: any) => (
            <div
              key={doc._id || doc.id}
              className="px-4 py-3 grid grid-cols-3 gap-4 items-center text-sm hover:bg-brand-50"
            >
              <div className="space-y-1">
                <h4 className="font-medium text-brand-900 truncate">{doc.title}</h4>
                <p className="text-brand-600 truncate">
                  Client: {doc.clientName || doc?.metadata?.clientName} (
                  {doc.clientEmail || doc?.metadata?.clientEmail})
                </p>
                <p className="text-gray-600 truncate">
                  Agent: {doc.agentName || doc?.metadata?.agencyName}
                </p>
              </div>

              <div className="flex items-center">
                {String(doc.status).toLowerCase() === 'signed' &&
                  (doc.signedPdfUrl || doc.fileUrl) ? (
                    <a
                      href={buildPdfHref(doc)}
                      download={`${doc.title}_signed.pdf`}
                      className="text-xs text-yellow-600 hover:underline"
                    >
                      Download PDF
                    </a>
                  ) : (
                    <span className="text-xs text-brand-400">No file available</span>
                  )}
              </div>

              <div className="flex justify-end">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${String(doc.status).toLowerCase() === 'signed' ? 'bg-brand-800 text-yellow-300' : 'bg-yellow-100 text-yellow-800'}`}
                >
                  {String(doc.status).toUpperCase()}
                </span>
              </div>
            </div>
          ))}
          {docs.length === 0 && (
            <p className="p-4 text-brand-500 text-center">No documents in system.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDocumentsList;
