import React from 'react';

type Status = 'signed' | 'pending' | 'active' | 'disabled' | string;

const statusMap: Record<string, { className: string; label?: string }> = {
  signed: { className: 'badge-signed' },
  pending: { className: 'badge-pending' },
  active: { className: 'badge-active' },
  disabled: { className: 'badge-disabled' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const key = String(status).toLowerCase();
  const mapped = statusMap[key] || statusMap.pending;
  return <span className={`badge ${mapped.className}`}>{status}</span>;
}
