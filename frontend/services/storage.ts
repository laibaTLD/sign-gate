
import { User, UserRole, Agent, DocumentData, DocumentStatus } from '../types';

const USERS_KEY = 'signflow_users';
const DOCS_KEY = 'signflow_docs';
const SESSION_KEY = 'signflow_session';

// Initialize mock data if empty
const initData = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    console.log('[storage] initializing default users in localStorage');
    const admin: User = {
      id: 'admin-1',
      email: 'admin@signflow.com',
      role: UserRole.ADMIN,
      name: 'Super Admin'
    };
    const agents: Agent[] = [
      {
        id: 'agent-1',
        email: 'agent@signflow.com',
        role: UserRole.AGENT,
        name: 'John Agent',
        createdBy: 'admin-1',
        active: true,
      }
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify([admin, ...agents]));
    console.log('[storage] default users written', { count: 1 + agents.length });
  }
  if (!localStorage.getItem(DOCS_KEY)) {
    localStorage.setItem(DOCS_KEY, JSON.stringify([]));
    console.log('[storage] default docs array initialized');
  }
};

initData();

// --- Auth ---

export const loginUser = async (email: string, password: string): Promise<User> => {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 500));
  
  // Hardcoded password check for demo purposes
  if (password !== 'password') {
    throw new Error('Invalid password (use "password")');
  }

  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const user = users.find((u: User) => u.email === email);

  if (!user) throw new Error('User not found');
  
  if (user.role === UserRole.AGENT && !(user as Agent).active) {
    throw new Error('Account disabled');
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
};

export const getSession = (): User | null => {
  const session = localStorage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

// --- Agent Management ---

export const getAgents = (): Agent[] => {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const agents = users.filter(
    (u: User) => u.role === UserRole.AGENT || u.role === UserRole.ADMIN
  );
  console.log('[storage] getAgents()', { totalUsers: users.length, agents: agents.length });
  return agents;
};

export const createAgent = (agent: Omit<Agent, 'id' | 'role'>) => {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const newAgent: Agent = {
    ...agent,
    id: `agent-${Date.now()}`,
    role: UserRole.AGENT,
  };
  users.push(newAgent);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  console.log('[storage] createAgent()', { email: newAgent.email, id: newAgent.id });
  return newAgent;
};

export const createAdminUser = (admin: Omit<Agent, 'id' | 'role'>) => {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const newAdmin: Agent = {
    ...admin,
    id: `admin-${Date.now()}`,
    role: UserRole.ADMIN,
  };
  users.push(newAdmin);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  console.log('[storage] createAdminUser()', { email: newAdmin.email, id: newAdmin.id });
  return newAdmin;
};

export const toggleAgentStatus = (id: string) => {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const index = users.findIndex((u: User) => u.id === id);
  if (
    index > -1 &&
    (users[index].role === UserRole.AGENT || users[index].role === UserRole.ADMIN)
  ) {
    users[index].active = !users[index].active;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
};

export const deleteAgent = (id: string) => {
  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const next = users.filter(
    u =>
      !(
        u.id === id &&
        (u.role === UserRole.AGENT || u.role === UserRole.ADMIN)
      )
  );
  localStorage.setItem(USERS_KEY, JSON.stringify(next));
};

// --- Document Management ---

export const getDocuments = (): DocumentData[] => {
  return JSON.parse(localStorage.getItem(DOCS_KEY) || '[]');
};

export const getDocumentById = (id: string): DocumentData | undefined => {
  const docs = getDocuments();
  return docs.find(d => d.id === id);
};

export const createDocument = (docData: Omit<DocumentData, 'id' | 'status' | 'createdAt'>) => {
  const docs = getDocuments();
  const newDoc: DocumentData = {
    ...docData,
    id: `doc-${Date.now()}`, // Functions as the token
    status: DocumentStatus.PENDING,
    createdAt: Date.now(),
  };
  docs.push(newDoc);
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  return newDoc;
};

export const signDocument = (id: string, signedPdfUrl: string, signerGmail: string) => {
  const docs = getDocuments();
  const index = docs.findIndex(d => d.id === id);
  if (index > -1) {
    docs[index].status = DocumentStatus.SIGNED;
    docs[index].signedPdfUrl = signedPdfUrl;
    docs[index].signedAt = Date.now();
    docs[index].signerIP = '192.168.1.1 (Simulated)'; // Mock IP
    docs[index].signerGmail = signerGmail; // Ensure we record who actually signed if it differs (though we validate)
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
    return docs[index];
  }
  throw new Error('Document not found');
};
