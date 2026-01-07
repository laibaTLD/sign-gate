import React from 'react';
import { Copy } from 'lucide-react';

interface SupportCopyLinkModalProps {
  isOpen: boolean;
  link: string | null;
  onClose: () => void;
}

const SupportCopyLinkModal: React.FC<SupportCopyLinkModalProps> = ({ isOpen, link, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 whitespace-normal">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="px-6 py-4 border-b flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Copy size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Signing link copied</h3>
            <p className="text-xs text-gray-500">You can paste this link into an email, chat, or message to your client.</p>
          </div>
        </div>
        <div className="px-6 py-4 text-sm text-gray-700 space-y-3">
          <div className="rounded-md bg-gray-50 px-3 py-2 border border-gray-200 text-xs break-all font-mono text-gray-700 max-w-full overflow-x-auto">
            <span className="break-all">{link}</span>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex justify-end">
          <button
            type="button"
            className="px-4 py-2 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupportCopyLinkModal;
