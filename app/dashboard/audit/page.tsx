'use client';

import { useEffect, useState } from 'react';
import { Search, ScrollText } from 'lucide-react';
import AnimatedPanel from '@/components/ui/AnimatedPanel';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import DataTable from '@/components/ui/DataTable';
import { apiListAuditLogs } from '@/lib/api';
// apiListAuditLogs now accepts object params and auto-injects token

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 30 };
      if (actionFilter) params.action = actionFilter;
      const res = await apiListAuditLogs(params);
      setLogs(res.logs || res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const columns = [
    {
      key: 'action',
      header: 'Action',
      render: (log: any) => (
        <span className="text-sm font-medium">{log.action}</span>
      ),
    },
    {
      key: 'performedBy',
      header: 'Performed By',
      render: (log: any) => (
        <span className="text-sm font-mono text-slate-500">
          {log.performedBy?.phone || log.performedByPhone || 'System'}
        </span>
      ),
    },
    {
      key: 'target',
      header: 'Target',
      render: (log: any) => (
        <span className="text-sm text-slate-500 truncate max-w-[200px] block">
          {log.targetId || log.details?.targetId || '—'}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (log: any) => (
        <span className="text-xs text-slate-500 truncate max-w-[250px] block">
          {log.details
            ? typeof log.details === 'string'
              ? log.details
              : JSON.stringify(log.details).slice(0, 80)
            : '—'}
        </span>
      ),
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (log: any) => (
        <span className="text-sm text-slate-500">
          {new Date(log.timestamp || log.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  const actionOptions = [
    '',
    'USER_REGISTERED',
    'OTP_SENT',
    'OTP_VERIFIED',
    'PASSWORD_CHANGED',
    'CWL_STARTED',
    'CWL_JOINED',
    'CWL_ASSIGNED',
    'CWL_CLOSED',
    'CLAN_ADDED',
    'CLAN_DELETED',
    'USER_ROLES_UPDATED',
    'USER_DELETED',
    'EXPORT_GENERATED',
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Track all system actions and changes
        </p>
      </div>

      <div className="flex items-center gap-4">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        >
          <option value="">All Actions</option>
          {actionOptions
            .filter((a) => a)
            .map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
        </select>
      </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <ScrollText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No audit logs found</p>
          </div>
        ) : (
          <DataTable data={logs} columns={columns} />
        )}

      {total > 30 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {page} of {Math.ceil(total / 30)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= Math.ceil(total / 30)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
