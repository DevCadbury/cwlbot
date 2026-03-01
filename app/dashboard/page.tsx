'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Swords, Activity } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiGetDashboard, apiGetMyGroup } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface DashboardData {
  totalUsers: number;
  totalGroups: number;
  totalClans: number;
  activeSessions: number;
  recentAuditLogs: any[];
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

// ── MyGroupCard: shows the linked WA group for non-superadmin users ──────────
function MyGroupCard() {
  const [grp, setGrp] = useState<{
    chatID: string; displayTitle?: string; botChatName?: string; title?: string;
    isVerified?: boolean; totalParticipants: number; resolvedMembers: any[];
  } | null>(null);
  const [load, setLoad] = useState(true);

  useEffect(() => {
    apiGetMyGroup()
      .then((res: any) => setGrp((res.groups ?? [])[0] ?? null))
      .catch(() => {})
      .finally(() => setLoad(false));
  }, []);

  if (load) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-pulse">
        <div className="h-3 w-28 bg-slate-200 rounded mb-3" />
        <div className="h-6 w-52 bg-slate-200 rounded mb-2" />
        <div className="h-3 w-36 bg-slate-100 rounded mb-4" />
        <div className="flex gap-4 pt-4 border-t border-slate-100">
          {[0, 1, 2].map(i => <div key={i} className="h-8 flex-1 bg-slate-100 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!grp) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-900 font-semibold mb-1">No Group Linked</p>
        <p className="text-xs text-amber-700">
          Use <code className="bg-amber-100 px-1 rounded">!cwlotp</code> in your WhatsApp group, then verify it on{' '}
          <a href="/dashboard/my-group" className="underline font-medium">My Group</a>.
        </p>
      </div>
    );
  }

  const title = grp.displayTitle || grp.botChatName || grp.title || grp.chatID;
  const linked = (grp.resolvedMembers || []).filter((m: any) => (m.enrichedPlayers || []).length > 0).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      className="rounded-xl overflow-hidden shadow-sm"
    >
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-5 py-4">
        <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">Your WhatsApp Group</p>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-xl text-white leading-tight truncate">{title}</h3>
            <code className="text-indigo-300 text-[11px] font-mono select-all mt-0.5 block">{grp.chatID}</code>
          </div>
          <span className={`flex-shrink-0 self-start px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            grp.isVerified
              ? 'bg-green-400/20 text-green-200 border-green-400/40'
              : 'bg-amber-400/20 text-amber-200 border-amber-400/40'
          }`}>
            {grp.isVerified ? '✓ Verified' : '⚠ Unverified'}
          </span>
        </div>
      </div>
      {/* Stats strip */}
      <div className="flex bg-white border border-t-0 border-slate-200 rounded-b-xl divide-x divide-slate-100">
        {[
          { label: 'WA Members', value: grp.totalParticipants },
          { label: 'Tracked',    value: grp.resolvedMembers?.length ?? 0 },
          { label: 'CoC Linked', value: linked },
        ].map(({ label, value }) => (
          <div key={label} className="flex-1 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
        <a
          href="/dashboard/my-group"
          className="flex items-center justify-center px-4 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          View →
        </a>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isSuperadmin = user?.roles?.includes('superadmin');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGetDashboard();
        setData({
          totalUsers: res.stats?.totalUsers ?? 0,
          totalGroups: res.stats?.totalGroups ?? 0,
          totalClans: res.stats?.totalClans ?? 0,
          activeSessions: res.stats?.openSessions ?? 0,
          recentAuditLogs: res.recentAudit ?? [],
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const stats = isSuperadmin
    ? [
        { title: 'Total Users',    value: data.totalUsers,     icon: Users,     color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { title: 'Total Groups',   value: data.totalGroups,    icon: Shield,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { title: 'Total Clans',    value: data.totalClans,     icon: Swords,    color: 'text-amber-600',  bg: 'bg-amber-50' },
        { title: 'Active Sessions',value: data.activeSessions, icon: Activity,  color: 'text-purple-600', bg: 'bg-purple-50' },
      ]
    : [
        { title: 'Active Sessions', value: data.activeSessions, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
        { title: 'Total Clans',     value: data.totalClans,     icon: Swords,   color: 'text-amber-600',  bg: 'bg-amber-50' },
      ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {isSuperadmin
            ? 'System-wide overview of your CWL tracking platform'
            : "Overview of your group's CWL activity"}
        </p>
      </div>

      {/* Stats grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {stats.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </motion.div>

      {/* Recent Activity (superadmin only) */}
      {isSuperadmin && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Recent Activity</h2>
          {data.recentAuditLogs.length === 0 ? (
            <p className="text-slate-400 text-sm">No activity yet</p>
          ) : (
            <div className="space-y-2">
              {data.recentAuditLogs.slice(0, 10).map((log: any, i: number) => (
                <div
                  key={log._id || i}
                  className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0"
                >
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{log.action}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {log.performedBy?.phone || log.userPhone || 'System'} &middot;{' '}
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Group Card — for non-superadmins */}
      {!isSuperadmin && <MyGroupCard />}
    </div>
  );
}

