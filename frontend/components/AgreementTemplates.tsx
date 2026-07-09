import React from 'react';
import { FileText, Check } from 'lucide-react';

export interface AgreementTemplate {
    id: string;
    name: string;
    description: string;
    fields: TemplateField[];
}

export interface TemplateField {
    id: string;
    label: string;
    placeholder: string;
    type: 'text' | 'currency' | 'date';
    required: boolean;
    defaultValue?: string;
}

export const usBrandBoosterTemplate: AgreementTemplate = {
    id: 'us-brand-booster',
    name: 'Website Development & Marketing Services',
    description: 'Agreement between US BRAND BOOSTER LLC and client for website development, SEO, and social media services',
    fields: [
        { id: 'clientCompanyName', label: 'Client Company Name', placeholder: '[CLIENT_COMPANY_NAME]', type: 'text', required: true },
        { id: 'businessOwnerName', label: 'Business Owner Name', placeholder: '[BUSINESS_OWNER_NAME]', type: 'text', required: true },
        { id: 'clientDomain', label: 'Client Domain Name', placeholder: '[CLIENT_DOMAIN_NAME]', type: 'text', required: true },
        { id: 'upfrontPayment', label: 'Upfront Payment', placeholder: '$350', type: 'currency', required: true, defaultValue: '350' },
        { id: 'remainingPayment', label: 'Remaining Payment', placeholder: '$650', type: 'currency', required: true, defaultValue: '650' },
    ],
};

export const genericServiceTemplate: AgreementTemplate = {
    id: 'generic-service',
    name: 'Generic Service Agreement',
    description: 'Standard service agreement between US BRAND BOOSTER LLC and client',
    fields: [],
};

export const availableTemplates: AgreementTemplate[] = [
    usBrandBoosterTemplate,
    genericServiceTemplate,
];

interface Props {
    selectedTemplate: AgreementTemplate | null;
    onSelectTemplate: (template: AgreementTemplate) => void;
}

export default function AgreementTemplates({ selectedTemplate, onSelectTemplate }: Props) {
    return (
        <div className="space-y-4">
            <h4 className="text-base font-semibold text-brand-900">Select Agreement Template</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableTemplates.map((template) => {
                    const selected = selectedTemplate?.id === template.id;
                    return (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => onSelectTemplate(template)}
                            className={`relative p-4 rounded-xl text-left transition-all border-2 ${
                                selected
                                    ? 'border-yellow-400 bg-yellow-50/50 shadow-sm'
                                    : 'border-brand-100 hover:border-brand-200 hover:shadow-sm bg-white'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`p-2.5 rounded-lg ${selected ? 'bg-yellow-400 text-brand-900' : 'bg-brand-50 text-brand-500'}`}>
                                    <FileText size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h5 className="font-semibold text-brand-900 text-sm">{template.name}</h5>
                                    <p className="text-xs text-brand-500 mt-1 leading-relaxed">{template.description}</p>
                                </div>
                                {selected && (
                                    <div className="absolute top-3 right-3 bg-brand-900 text-yellow-400 rounded-full p-0.5">
                                        <Check size={14} />
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {selectedTemplate && selectedTemplate.fields.length > 0 && (
                <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                    This template includes <strong>{selectedTemplate.fields.length}</strong> additional field(s) for your agreement.
                </div>
            )}
        </div>
    );
}
