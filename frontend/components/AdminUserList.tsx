import React from 'react';
import { CheckCircle, XCircle, Trash, UserPlus } from 'lucide-react';
import { Agent } from '../types';
import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';

interface AdminUserListProps {
  agents: Agent[];
  onToggleAgent: (id: string) => void;
  onDeleteAgent: (id: string) => void;
  onClickNewUser: () => void;
}

const AdminUserList: React.FC<AdminUserListProps> = ({ agents, onToggleAgent, onDeleteAgent, onClickNewUser }) => {
  return (
    <div className="mb-8">
      <div className="card overflow-hidden">
        <div className="card-header flex justify-between items-center">
          <h3 className="font-semibold text-brand-900">User Management</h3>
          <button onClick={onClickNewUser} className="btn btn-primary btn-sm">
            <UserPlus size={15} /> New User
          </button>
        </div>

        {agents.length === 0 ? (
          <EmptyState icon={UserPlus} title="No users yet" description="Create your first support or admin user." />
        ) : (
          <div className="divide-y divide-brand-50">
            <div className="px-5 py-2.5 grid grid-cols-4 text-xs font-semibold text-brand-500 uppercase tracking-wider bg-brand-50/50">
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Status</span>
            </div>
            {agents.map(agent => (
              <div key={agent.id} className="px-5 py-3.5 grid grid-cols-4 items-center text-sm table-row-hover transition-colors">
                <span className="font-medium text-brand-900 truncate">{agent.name}</span>
                <span className="text-brand-500 truncate">{agent.email}</span>
                <span className="text-brand-600 capitalize">{(agent as any).role}</span>
                <span className="flex items-center gap-2">
                  <StatusBadge status={agent.active ? 'active' : 'disabled'} />
                  <button
                    onClick={() => onToggleAgent(agent.id)}
                    className="p-1 rounded-md text-brand-400 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                    title={agent.active ? 'Disable Account' : 'Activate Account'}
                  >
                    {agent.active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                  </button>
                  {!agent.active && (
                    <button
                      onClick={() => onDeleteAgent(agent.id)}
                      className="p-1 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete User"
                    >
                      <Trash size={15} />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserList;
