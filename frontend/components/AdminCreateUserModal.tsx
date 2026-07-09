import React from 'react';
import Modal from './ui/Modal';

interface AdminCreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newAgentName: string;
  setNewAgentName: (v: string) => void;
  newAgentEmail: string;
  setNewAgentEmail: (v: string) => void;
  newAgentPassword: string;
  setNewAgentPassword: (v: string) => void;
  newUserRole: 'Support' | 'Admin';
  setNewUserRole: (v: 'Support' | 'Admin') => void;
}

const AdminCreateUserModal: React.FC<AdminCreateUserModalProps> = ({
  open, onClose, onSubmit,
  newAgentName, setNewAgentName,
  newAgentEmail, setNewAgentEmail,
  newAgentPassword, setNewAgentPassword,
  newUserRole, setNewUserRole,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create New User"
      description="Add a support agent or admin to the system."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="create-user-form" className="btn btn-primary">Create User</button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input type="text" required className="input-field" value={newAgentName} onChange={e => setNewAgentName(e.target.value)} placeholder="Enter full name" />
        </div>
        <div>
          <label className="label">Email Address</label>
          <input type="email" required className="input-field" value={newAgentEmail} onChange={e => setNewAgentEmail(e.target.value)} placeholder="name@example.com" />
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" required className="input-field" value={newAgentPassword} onChange={e => setNewAgentPassword(e.target.value)} placeholder="Set a secure password" />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input-field" value={newUserRole} onChange={e => setNewUserRole(e.target.value as 'Support' | 'Admin')}>
            <option value="Support">Support</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
      </form>
    </Modal>
  );
};

export default AdminCreateUserModal;
