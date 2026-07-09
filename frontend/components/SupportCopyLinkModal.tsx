import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, X } from 'lucide-react';

interface SupportCopyLinkModalProps {
  isOpen: boolean;
  link: string | null;
  onClose: () => void;
}

const SupportCopyLinkModal: React.FC<SupportCopyLinkModalProps> = ({ isOpen, link, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) setCopied(false);
  }, [isOpen]);

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="copy-link-title">
      <div
        className="modal-panel !max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-brand-400 hover:text-brand-700 hover:bg-brand-50 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="px-6 pt-8 pb-2 text-center">
          <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
            <Check size={26} className="text-green-600" strokeWidth={2.5} />
          </div>
          <h3 id="copy-link-title" className="text-lg font-semibold text-brand-900">
            Signing link copied
          </h3>
          <p className="text-sm text-brand-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
            Share this link with your client so they can review and sign the document.
          </p>
        </div>

        <div className="px-6 py-5">
          <label htmlFor="signing-link" className="label">Signing link</label>
          <div className="flex gap-2">
            <input
              id="signing-link"
              readOnly
              value={link || ''}
              onFocus={(e) => e.target.select()}
              className="input-field font-mono text-[13px] flex-1 min-w-0 !py-2.5"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`btn shrink-0 ${copied ? 'btn-secondary !text-green-700 !border-green-200 !bg-green-50' : 'btn-secondary'}`}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-brand-100 flex justify-end">
          <button type="button" className="btn btn-primary px-6" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SupportCopyLinkModal;
