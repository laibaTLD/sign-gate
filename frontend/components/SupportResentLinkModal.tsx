import React from 'react';
import { Send } from 'lucide-react';
import { COMPANY_NAME } from '../constants';
import Modal from './ui/Modal';

interface SupportResentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupportResentLinkModal: React.FC<SupportResentLinkModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Signing link resent"
      description={`The client will receive an email from ${COMPANY_NAME} with the updated signing link.`}
      icon={<Send size={20} />}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
      }
    />
  );
};

export default SupportResentLinkModal;
