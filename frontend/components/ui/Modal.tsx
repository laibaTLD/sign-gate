import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({ open, onClose, title, description, icon, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-brand-100 flex items-start gap-3">
          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-50 text-yellow-600">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 id="modal-title" className="text-lg font-semibold text-brand-900">{title}</h3>
            {description && <p className="text-sm text-brand-500 mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-brand-400 hover:text-brand-700 hover:bg-brand-50 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children && <div className="px-6 py-4">{children}</div>}
        {footer && <div className="px-6 py-4 bg-brand-50 border-t border-brand-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
