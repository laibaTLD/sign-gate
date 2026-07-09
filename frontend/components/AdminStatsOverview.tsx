import React from 'react';
import { CheckCircle, FileText, User as UserIcon } from 'lucide-react';

interface AdminStatsOverviewProps {
  usersCount: number;
  docs: any[];
}

const StatCard = ({ label, value, icon: Icon, accent }: { label: string; value: number; icon: typeof UserIcon; accent: string }) => (
  <div className="card p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-brand-500 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-bold text-brand-900 mt-1 tabular-nums">{value}</p>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon size={22} />
      </div>
    </div>
  </div>
);

const AdminStatsOverview: React.FC<AdminStatsOverviewProps> = ({ usersCount, docs }) => {
  const signedCount = docs.filter(d => String(d.status).toLowerCase() === 'signed').length;
  const pendingCount = docs.filter(d => String(d.status).toLowerCase() !== 'signed').length;

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Users" value={usersCount} icon={UserIcon} accent="bg-yellow-50 text-yellow-600" />
        <StatCard label="Signed" value={signedCount} icon={CheckCircle} accent="bg-green-50 text-green-600" />
        <StatCard label="Pending" value={pendingCount} icon={FileText} accent="bg-orange-50 text-orange-500" />
      </div>
    </div>
  );
};

export default AdminStatsOverview;
