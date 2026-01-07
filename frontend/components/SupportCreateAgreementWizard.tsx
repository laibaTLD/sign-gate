import React from 'react';
import { FileText, User as UserIcon, Briefcase, Send } from 'lucide-react';
import AgreementTemplates, { AgreementTemplate } from './AgreementTemplates';

interface SupportCreateAgreementWizardProps {
  activeTab: 'template' | 'client' | 'project' | 'agency' | 'services';
  setActiveTab: (tab: 'template' | 'client' | 'project' | 'agency' | 'services') => void;
  selectedTemplate: AgreementTemplate | null;
  setSelectedTemplate: (t: AgreementTemplate | null) => void;
  formData: any;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  creating: boolean;
  userName: string;
}

const SupportCreateAgreementWizard: React.FC<SupportCreateAgreementWizardProps> = ({
  activeTab,
  setActiveTab,
  selectedTemplate,
  setSelectedTemplate,
  formData,
  onInputChange,
  onSubmit,
  creating,
  userName,
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Create Agreement</h3>
        <button onClick={() => setActiveTab('template')} className="text-gray-500 hover:text-gray-700">Reset</button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('template')}
            className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'template' ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <FileText size={18} /> Agreement Template
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'services' ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-100'}`}
            disabled={!selectedTemplate}
          >
            <FileText size={18} /> Service Details
          </button>
          <button
            onClick={() => setActiveTab('client')}
            className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'client' ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <UserIcon size={18} /> Client Information
          </button>
          <button
            onClick={() => setActiveTab('project')}
            className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'project' ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <FileText size={18} /> Project Details
          </button>
          <button
            onClick={() => setActiveTab('agency')}
            className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'agency' ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Briefcase size={18} /> Agency Info
          </button>
        </div>

        <div className="flex-1 p-6">
          <form onSubmit={onSubmit} className="space-y-6">
            {activeTab === 'template' && (
              <div className="space-y-4 animate-fadeIn">
                <AgreementTemplates
                  selectedTemplate={selectedTemplate}
                  onSelectTemplate={(template) => {
                    setSelectedTemplate(template);
                    if (template && !formData.title) {
                      
                    }
                  }}
                />
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default SupportCreateAgreementWizard;
