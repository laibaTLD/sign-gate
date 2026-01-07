import React from 'react';
import { XCircle } from 'lucide-react';

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
  open,
  onClose,
  onSubmit,
  newAgentName,
  setNewAgentName,
  newAgentEmail,
  setNewAgentEmail,
  newAgentPassword,
  setNewAgentPassword,
  newUserRole,
  setNewUserRole,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-brand-100">
        <div className="px-6 py-4 border-b border-brand-100 flex items-center justify-between bg-brand-50">
          <h3 className="text-lg font-semibold text-brand-900">Create New User</h3>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            <XCircle size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-700">Full Name</label>
            <input
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md text-sm border-brand-200 focus:outline-none focus:ring-yellow-400 focus:border-yellow-400"
              value={newAgentName}
              onChange={e => setNewAgentName(e.target.value)}
              placeholder="Enter full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-700">Email Address</label>
            <input
              type="email"
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
              value={newAgentEmail}
              onChange={e => setNewAgentEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-700">Password</label>
            <input
              type="password"
              required
              className="mt-1 block w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
              value={newAgentPassword}
              onChange={e => setNewAgentPassword(e.target.value)}
              placeholder="Set a secure password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-700">Role</label>
            <select
              className="mt-1 block w-full px-3 py-2 border rounded-md text-sm bg-white border-brand-200 focus:outline-none focus:ring-yellow-400 focus:border-yellow-400"
              value={newUserRole}
              onChange={e => setNewUserRole(e.target.value as 'Support' | 'Admin')}
            >
              <option value="Support">Support</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="px-4 py-2 text-sm rounded-md border border-brand-200 text-brand-700 hover:bg-brand-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-md bg-yellow-400 text-brand-900 hover:bg-yellow-300"
            >
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminCreateUserModal;
