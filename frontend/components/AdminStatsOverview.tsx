import React from 'react';
import { CheckCircle, FileText, User as UserIcon } from 'lucide-react';

interface AdminStatsOverviewProps {
  usersCount: number;
  docs: any[];
}

const AdminStatsOverview: React.FC<AdminStatsOverviewProps> = ({ usersCount, docs }) => {
  const signedCount = docs.filter(d => String(d.status).toLowerCase() === 'signed').length;
  const pendingCount = docs.filter(d => String(d.status).toLowerCase() !== 'signed').length;

  return (
    <div className="mb-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-brand-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-500">Total Users</p>
              <p className="text-3xl font-bold text-brand-900">{usersCount}</p>
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
              <p className="text-3xl font-bold text-brand-900">{signedCount}</p>
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
              <p className="text-3xl font-bold text-brand-900">{pendingCount}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full text-yellow-500">
              <FileText size={24} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStatsOverview;
