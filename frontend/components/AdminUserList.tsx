import React from 'react';
import { CheckCircle, XCircle, Trash } from 'lucide-react';
import { Agent } from '../types';

interface AdminUserListProps {
  agents: Agent[];
  onToggleAgent: (id: string) => void;
  onDeleteAgent: (id: string) => void;
  onClickNewUser: () => void;
}

const AdminUserList: React.FC<AdminUserListProps> = ({ agents, onToggleAgent, onDeleteAgent, onClickNewUser }) => {
  return (
    <div className="mb-10">
      <div className="bg-white rounded-lg shadow-sm border border-brand-100 flex flex-col">
        <div className="p-4 border-b border-brand-100 flex justify-between items-center bg-brand-50">
          <h3 className="font-semibold text-brand-800">User Management</h3>
          <button
            onClick={onClickNewUser}
            className="text-sm bg-yellow-400 text-brand-900 px-3 py-1.5 rounded hover:bg-yellow-300 flex items-center gap-1"
          >
            <span className="text-base leading-none">+</span> New User
          </button>
        </div>

        <div className="divide-y divide-brand-100">
          <div className="px-4 py-2 grid grid-cols-4 text-xs font-semibold text-brand-500 bg-brand-50">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Status</span>
          </div>
          {agents.map(agent => (
            <div
              key={agent.id}
              className="px-4 py-3 grid grid-cols-4 items-center text-sm hover:bg-brand-50"
            >
              <span className="font-medium text-brand-900 truncate">{agent.name}</span>
              <span className="text-brand-600 truncate">{agent.email}</span>
              <span className="text-brand-600 capitalize">{(agent as any).role}</span>
              <span className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${agent.active ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}
                >
                  {agent.active ? 'Active' : 'Disabled'}
                </span>
                <button
                  onClick={() => onToggleAgent(agent.id)}
                  className="text-brand-400 hover:text-brand-600"
                  title={agent.active ? 'Disable Account' : 'Activate Account'}
                >
                  {agent.active ? <XCircle size={18} /> : <CheckCircle size={18} />}
                </button>
                {!agent.active && (
                  <button
                    onClick={() => onDeleteAgent(agent.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete User"
                  >
                    <Trash size={16} />
                  </button>
                )}
              </span>
            </div>
          ))}
          {agents.length === 0 && (
            <p className="p-4 text-brand-500 text-center">No users found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserList;
