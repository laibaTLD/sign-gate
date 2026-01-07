import React from 'react';
import { Send } from 'lucide-react';

interface SupportResentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupportResentLinkModal: React.FC<SupportResentLinkModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 whitespace-normal">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Send size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Signing link resent</h3>
            <p className="text-xs text-gray-500 break-words">If SMTP is configured, the client will receive an email with the updated signing link.</p>
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

export default SupportResentLinkModal;
