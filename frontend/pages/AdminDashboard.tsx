import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { User, Agent } from '../types';
import { DocumentsAPI, AuthAPI, UsersAPI } from '../services/api';
import AdminStatsOverview from '../components/AdminStatsOverview';
import AdminUserList from '../components/AdminUserList';
import AdminDocumentsList from '../components/AdminDocumentsList';
import AdminCreateUserModal from '../components/AdminCreateUserModal';

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
      <AdminStatsOverview usersCount={agents.length} docs={docs} />

      <AdminUserList
        agents={agents}
        onToggleAgent={handleToggleAgent}
        onDeleteAgent={handleDeleteAgent}
        onClickNewUser={() => setShowAddAgent(true)}
      />

      <AdminDocumentsList docs={docs} />

      <AdminCreateUserModal
        open={showAddAgent}
        onClose={() => setShowAddAgent(false)}
        onSubmit={handleCreateAgent}
        newAgentName={newAgentName}
        setNewAgentName={setNewAgentName}
        newAgentEmail={newAgentEmail}
        setNewAgentEmail={setNewAgentEmail}
        newAgentPassword={newAgentPassword}
        setNewAgentPassword={setNewAgentPassword}
        newUserRole={newUserRole}
        setNewUserRole={setNewUserRole}
      />

    </Layout>
  );
}
