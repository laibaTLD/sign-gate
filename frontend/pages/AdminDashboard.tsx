import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { User, Agent } from '../types';
import { DocumentsAPI, AuthAPI, UsersAPI } from '../services/api';
import { Plus, CheckCircle, XCircle, FileText, User as UserIcon, Trash } from 'lucide-react';

interface Props {
  user: User;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: Props) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPassword, setNewAgentPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Support' | 'Admin'>('Support');

  const refreshData = async () => {
    try {
      const resp = await UsersAPI.list();
      const loadedAgents: Agent[] = (resp.users || []).map((u: any) => ({
        id: String(u.id || u._id),
        email: u.email,
        name: u.name,
        role: u.role,
        createdBy: u.createdBy || user.id,
        active: u.active !== false,
      }));
      console.log('[AdminDashboard] refreshData()', { count: loadedAgents.length, agents: loadedAgents });
      setAgents(loadedAgents);
    } catch (err) {
      console.error('[AdminDashboard] refreshData() failed', err);
      setAgents([]);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Load documents from backend and poll
  const loadDocs = async () => {
    try {
      const resp = await DocumentsAPI.list();
      console.log('[AdminDashboard] loadDocs()', { count: resp.documents?.length || 0 });
      setDocs(resp.documents || []);
    } catch (err) {
      console.error('[AdminDashboard] loadDocs() failed', err);
      // leave docs as-is if backend unreachable
    }
  };

  useEffect(() => {
    loadDocs();
    const onFocus = () => loadDocs();
    window.addEventListener('focus', onFocus);
    const interval = setInterval(loadDocs, 10000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, []);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    // Try backend first to persist a real agent account with password
    try {
      console.log('[AdminDashboard] handleCreateAgent() submit', { email: newAgentEmail, role: newUserRole });
      if (!newAgentPassword) throw new Error('Password is required');
      const backendRole = newUserRole === 'Admin' ? 'admin' : 'agent';
      const resp = await AuthAPI.register({
        name: newAgentName,
        email: newAgentEmail,
        password: newAgentPassword,
        role: backendRole,
      } as any);
      console.log('[AdminDashboard] backend register success', { user: resp?.user });
      await refreshData();
    } catch (err: any) {
      console.error('[AdminDashboard] handleCreateAgent() failed', err);
      alert(err?.message || 'Failed to create user on server. Please try again.');
    } finally {
      setShowAddAgent(false);
      setNewAgentEmail('');
      setNewAgentName('');
      setNewAgentPassword('');
      setNewUserRole('Support');
    }
  };

  const handleToggleAgent = async (id: string) => {
    try {
      await UsersAPI.toggle(id);
      await refreshData();
    } catch (err) {
      console.error('[AdminDashboard] handleToggleAgent() failed', err);
      alert('Failed to update user status');
    }
  };

  const handleDeleteAgent = async (id: string) => {
    try {
      await UsersAPI.delete(id);
      await refreshData();
    } catch (err: any) {
      console.error('[AdminDashboard] handleDeleteAgent() failed', err);
      alert(err?.message || 'Failed to delete user');
    }
  };

  return (
    <Layout user={user} onLogout={onLogout} title="System Overview">
      {/* System Overview Section */}
      <div className="mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-brand-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-500">Total Users</p>
                <p className="text-3xl font-bold text-brand-900">{agents.length}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-full text-yellow-500">
                <UserIcon size={24} />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-500">Documents Signed</p>
                <p className="text-3xl font-bold text-brand-900">
                  {docs.filter(d => String(d.status).toLowerCase() === 'signed').length}
                </p>
              </div>
              <div className="p-3 bg-brand-50 rounded-full text-brand-700">
                <CheckCircle size={24} />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-brand-500">Pending Docs</p>
                <p className="text-3xl font-bold text-brand-900">
                  {docs.filter(d => String(d.status).toLowerCase() !== 'signed').length}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-full text-yellow-500">
                <FileText size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="mb-10">
        <div className="bg-white rounded-lg shadow-sm border border-brand-100 flex flex-col">
          <div className="p-4 border-b border-brand-100 flex justify-between items-center bg-brand-50">
            <h3 className="font-semibold text-brand-800">User Management</h3>
            <button
              onClick={() => setShowAddAgent(!showAddAgent)}
              className="text-sm bg-yellow-400 text-brand-900 px-3 py-1.5 rounded hover:bg-yellow-300 flex items-center gap-1"
            >
              <Plus size={16} /> New User
            </button>
          </div>

          <div className="divide-y divide-brand-100">
            {/* Header row */}
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
                    onClick={() => handleToggleAgent(agent.id)}
                    className="text-brand-400 hover:text-brand-600"
                    title={agent.active ? 'Disable Account' : 'Activate Account'}
                  >
                    {agent.active ? <XCircle size={18} /> : <CheckCircle size={18} />}
                  </button>
                  {!agent.active && (
                    <button
                      onClick={() => handleDeleteAgent(agent.id)}
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

      {/* Documents Section */}
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
                {/* Document details */}
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

                {/* Download PDF */}
                <div className="flex items-center">
                  {String(doc.status).toLowerCase() === 'signed' &&
                    (doc.signedPdfUrl || doc.fileUrl) ? (
                      <a
                        href={
                          doc.signedPdfUrl
                            ? `data:application/pdf;base64,${doc.signedPdfUrl}`
                            : doc.fileUrl?.startsWith('data:application/pdf')
                            ? doc.fileUrl
                            : `data:application/pdf;base64,${doc.fileUrl}`
                        }
                        download={`${doc.title}_signed.pdf`}
                        className="text-xs text-yellow-600 hover:underline"
                      >
                        Download PDF
                      </a>
                    ) : (
                      <span className="text-xs text-brand-400">No file available</span>
                    )}
                </div>

                {/* Status */}
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

      {showAddAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-brand-100">
            <div className="px-6 py-4 border-b border-brand-100 flex items-center justify-between bg-brand-50">
              <h3 className="text-lg font-semibold text-brand-900">Create New User</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowAddAgent(false)}
              >
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateAgent} className="px-6 py-4 space-y-4">
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
                  onChange={e => setNewUserRole(e.target.value as any)}
                >
                  <option value="Support">Support</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 text-sm rounded-md border border-brand-200 text-brand-700 hover:bg-brand-50"
                  onClick={() => setShowAddAgent(false)}
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
      )}

    </Layout>
  );
}
