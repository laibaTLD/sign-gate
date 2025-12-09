import React, { useState } from 'react';
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

// US Brand Booster Template
export const usBrandBoosterTemplate: AgreementTemplate = {
    id: 'us-brand-booster',
    name: 'Website Development & Marketing Services',
    description: 'Agreement for website development, SEO, and social media services',
    fields: [
        {
            id: 'clientCompanyName',
            label: 'Client Company Name',
            placeholder: '[CLIENT_COMPANY_NAME]',
            type: 'text',
            required: true,
        },
        {
            id: 'businessOwnerName',
            label: 'Business Owner Name',
            placeholder: '[BUSINESS_OWNER_NAME]',
            type: 'text',
            required: true,
        },
        {
            id: 'clientDomain',
            label: 'Client Domain Name',
            placeholder: '[CLIENT_DOMAIN_NAME]',
            type: 'text',
            required: true,
        },
        {
            id: 'upfrontPayment',
            label: 'Upfront Payment',
            placeholder: '$350',
            type: 'currency',
            required: true,
            defaultValue: '350',
        },
        {
            id: 'remainingPayment',
            label: 'Remaining Payment',
            placeholder: '$650',
            type: 'currency',
            required: true,
            defaultValue: '650',
        },
    ],
};

// Generic Service Agreement Template
export const genericServiceTemplate: AgreementTemplate = {
    id: 'generic-service',
    name: 'Generic Service Agreement',
    description: 'Standard service agreement for general projects',
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
            <h4 className="text-lg font-medium border-b pb-2 mb-4">Select Agreement Template</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableTemplates.map((template) => (
                    <button
                        key={template.id}
                        type="button"
                        onClick={() => onSelectTemplate(template)}
                        className={`relative p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${selectedTemplate?.id === template.id
                                ? 'border-brand-600 bg-brand-50'
                                : 'border-gray-200 hover:border-brand-300'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${selectedTemplate?.id === template.id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
                                }`}>
                                <FileText size={20} />
                            </div>

                            <div className="flex-1">
                                <h5 className="font-semibold text-gray-900">{template.name}</h5>
                                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                            </div>

                            {selectedTemplate?.id === template.id && (
                                <div className="absolute top-3 right-3 bg-brand-600 text-white rounded-full p-1">
                                    <Check size={16} />
                                </div>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {selectedTemplate && selectedTemplate.fields.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">Template-Specific Fields</h5>
                    <p className="text-sm text-blue-700">
                        This template includes {selectedTemplate.fields.length} additional field(s) that will be added to your agreement.
                    </p>
                </div>
            )}
        </div>
    );
}
