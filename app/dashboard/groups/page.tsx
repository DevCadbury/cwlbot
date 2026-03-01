'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  CheckCircle,
  XCircle,
  Users,
  Shield,
  Tag,
  Swords,
  RefreshCw,
  ArrowLeft,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  X,
  Copy,
  Crown,
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import {
  apiListGroups,
  apiGetGroupDetail,
  apiReopenSession,
  apiAdminAssignPlayer,
  apiAdminAssignMultiple,
} from '@/lib/api';

// ─── Shared micro-components ─────────────────────────────────────────────────

function TagPill({
  tag,
  color = 'indigo',
}: {
  tag: string;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet';
}) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-mono font-medium ${colors[color]}`}
    >
      {tag}
    </span>
  );
}

function THIcon({ level }: { level: number }) {
  const th = Math.min(Math.max(level || 1, 1), 18);
  return (
    <img
      src={`/townhalls/th-${th}.png`}
      alt={`TH${th}`}
      title={`Town Hall ${th}`}
      className="w-9 h-9 object-contain flex-shrink-0"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    closed: 'bg-amber-100 text-amber-700 border-amber-200',
    archived: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
        map[status] || map.archived
      }`}
    >
      {status === 'open' ? (
        <Unlock className="w-3 h-3" />
      ) : status === 'closed' ? (
        <Lock className="w-3 h-3" />
      ) : null}
      {status}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
      title="Copy"
    >
      {copied ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

// ─── Assign Panel ─────────────────────────────────────────────────────────────

function AssignPanel({
  sessionId,
  clanList,
  registration,
  existingAssignment,
  onDone,
  onClose,
}: {
  sessionId: string;
  clanList: string[];
  registration: any;
  existingAssignment?: string;
  onDone: (clanTag: string) => void;
  onClose: () => void;
}) {
  const [selectedClan, setSelectedClan] = useState(existingAssignment || clanList[0] || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSave() {
    if (!selectedClan) return;
    setSaving(true);
    setErr('');
    try {
      await apiAdminAssignPlayer(
        sessionId,
        registration.userPhone,
        selectedClan,
        registration.playerTag
      );
      onDone(selectedClan);
    } catch (e: any) {
      setErr(e.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center gap-3">
      <span className="text-xs font-medium text-slate-600">Assign clan:</span>
      <select
        value={selectedClan}
        onChange={(e) => setSelectedClan(e.target.value)}
        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {clanList.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        onClick={handleSave}
        disabled={saving || !selectedClan}
        className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
      >
        {saving ? (
          <RefreshCw className="w-3 h-3 animate-spin" />
        ) : (
          <CheckCircle2 className="w-3 h-3" />
        )}
        Save
      </button>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
        <X className="w-3.5 h-3.5" />
      </button>
      {err && <span className="text-xs text-red-500">{err}</span>}
    </div>
  );
}

// ─── Session Registration Row ─────────────────────────────────────────────────

function SessionRegRow({
  reg,
  assignment,
  sessionId,
  clanList,
  isOpen,
  onAssigned,
}: {
  reg: any;
  assignment?: string;
  sessionId: string;
  clanList: string[];
  isOpen: boolean;
  onAssigned: (playerTag: string, clanTag: string) => void;
}) {
  const [assigning, setAssigning] = useState(false);
  const pd = reg.playerData;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
        {pd?.townHallLevel ? (
          <THIcon level={pd.townHallLevel} />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-400">
            TH?
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 text-sm">{pd?.name || reg.playerTag}</p>
            <TagPill tag={reg.playerTag} color="indigo" />
            {pd?.expLevel && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                Lvl {pd.expLevel}
              </span>
            )}
            {pd?.trophies !== undefined && (
              <span className="text-xs text-amber-600 font-medium">
                🏆 {pd.trophies.toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {pd?.clan && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                {pd.clan.badgeUrl && (
                  <img src={pd.clan.badgeUrl} alt="" className="w-4 h-4" />
                )}
                {pd.clan.name}
              </span>
            )}
            {pd?.league && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                {pd.leagueIconUrl && (
                  <img src={pd.leagueIconUrl} alt={pd.league} className="w-4 h-4" />
                )}
                {pd.league}
              </span>
            )}
            <span className="text-xs text-slate-400">{reg.displayName || reg.userPhone}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {assignment ? (
            <TagPill tag={assignment} color="emerald" />
          ) : (
            <span className="text-xs text-slate-400 italic">Unassigned</span>
          )}
          {isOpen && clanList.length > 0 && (
            <button
              onClick={() => setAssigning((v) => !v)}
              className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              {assignment ? 'Reassign' : 'Assign'}
            </button>
          )}
        </div>
      </div>
      {assigning && (
        <AssignPanel
          sessionId={sessionId}
          clanList={clanList}
          registration={reg}
          existingAssignment={assignment}
          onDone={(clanTag) => {
            setAssigning(false);
            onAssigned(reg.playerTag, clanTag);
          }}
          onClose={() => setAssigning(false)}
        />
      )}
    </div>
  );
}

// ─── Bulk Assign Panel ────────────────────────────────────────────────────────

function BulkAssignPanel({
  sessionId,
  clanList,
  registrations,
  assignmentMap,
  onDone,
  onClose,
}: {
  sessionId: string;
  clanList: string[];
  registrations: any[];
  assignmentMap: Map<string, string>;
  onDone: (updates: Array<{ userPhone: string; playerTag?: string; clanTag: string }>) => void;
  onClose: () => void;
}) {
  const [selectedClan, setSelectedClan] = useState(clanList[0] || '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function handleSave() {
    if (!selectedClan || selected.size === 0) return;
    setSaving(true);
    setErr('');
    try {
      const assignments = registrations
        .filter((r) => selected.has(r.playerTag || r.userPhone))
        .map((r) => ({
          userPhone: r.userPhone,
          playerTag: r.playerTag || undefined,
          clanTag: selectedClan,
        }));
      await apiAdminAssignMultiple(sessionId, assignments);
      onDone(assignments);
    } catch (e: any) {
      setErr(e.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border-2 border-indigo-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-800 text-sm">Bulk Assign</p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-600 font-medium">Assign to clan:</span>
        <select
          value={selectedClan}
          onChange={(e) => setSelectedClan(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {clanList.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {registrations.map((r) => {
          const key = r.playerTag || r.userPhone;
          const pd = r.playerData;
          return (
            <label
              key={key}
              className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(key)}
                onChange={() => toggle(key)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
              />
              {pd?.townHallLevel ? (
                <img
                  src={`/townhalls/th-${Math.min(pd.townHallLevel, 18)}.png`}
                  alt=""
                  className="w-7 h-7 object-contain"
                />
              ) : (
                <div className="w-7 h-7" />
              )}
              <span className="text-sm text-slate-700 flex-1">
                {pd?.name || r.playerTag}
                {pd?.townHallLevel && (
                  <span className="text-xs text-slate-400 ml-1">TH{pd.townHallLevel}</span>
                )}
              </span>
              {assignmentMap.get(key) && (
                <TagPill tag={assignmentMap.get(key)!} color="emerald" />
              )}
            </label>
          );
        })}
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || selected.size === 0 || !selectedClan}
          className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Assign {selected.size > 0 ? `(${selected.size})` : ''}
        </button>
        {err && <span className="text-xs text-red-500">{err}</span>}
      </div>
    </div>
  );
}

// ─── Group Detail View ────────────────────────────────────────────────────────

function GroupDetail({
  chatID,
  isSuperadmin,
  onBack,
}: {
  chatID: string;
  isSuperadmin: boolean;
  onBack: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [assignmentMap, setAssignmentMap] = useState<Map<string, string>>(new Map());
  const [showBulk, setShowBulk] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberExpanded, setMemberExpanded] = useState(false);
  const [sessionTab, setSessionTab] = useState<'registrations' | 'history'>('registrations');

  const [reopening, setReopening] = useState(false);
  const [reopenErr, setReopenErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGetGroupDetail(chatID);
      setData(res);
      const map = new Map<string, string>();
      for (const a of res.activeSession?.assignments || []) {
        map.set(a.playerTag || a.userPhone, a.clanTag);
      }
      setAssignmentMap(map);
    } catch (e: any) {
      setError(e.message || 'Failed to load group detail');
    } finally {
      setLoading(false);
    }
  }, [chatID]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReopen(sessionId: string) {
    setReopening(true);
    setReopenErr('');
    try {
      await apiReopenSession(sessionId);
      await load();
    } catch (e: any) {
      setReopenErr(e.message || 'Failed to reopen');
    } finally {
      setReopening(false);
    }
  }

  function handleAssigned(playerTag: string, clanTag: string) {
    setAssignmentMap((prev) => new Map(prev).set(playerTag, clanTag));
  }

  function handleBulkDone(
    updates: Array<{ userPhone: string; playerTag?: string; clanTag: string }>
  ) {
    setAssignmentMap((prev) => {
      const next = new Map(prev);
      updates.forEach((u) => next.set(u.playerTag || u.userPhone, u.clanTag));
      return next;
    });
    setShowBulk(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
        {error}
      </div>
    );
  }

  const { group, members, linkedUsers, activeSession, sessions } = data || {};
  const clanList: string[] = activeSession?.clanList || [];
  const regs: any[] = activeSession?.registrations || [];
  const isSessionOpen = activeSession?.status === 'open';

  const dashboardAdmins = (linkedUsers || []).filter((u: any) =>
    u.roles?.some((r: string) => r === 'admin' || r === 'superadmin')
  );

  const filteredMembers = (members || []).filter((m: any) => {
    if (!memberSearch) return true;
    const s = memberSearch.toLowerCase();
    return (
      m.waId?.toLowerCase().includes(s) ||
      m.phone?.toLowerCase().includes(s) ||
      m.displayName?.toLowerCase().includes(s) ||
      (m.linkedPlayers || []).some((p: any) => p.playerTag?.toLowerCase().includes(s))
    );
  });

  const sessionIdStr = activeSession?._id?.toString?.() || '';

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 truncate">
              {group?.title || chatID.split('@')[0]}
            </h2>
            {group?.isVerified ? (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium">
                <CheckCircle className="w-3 h-3" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-medium">
                <XCircle className="w-3 h-3" /> Unverified
              </span>
            )}
            {activeSession && <StatusBadge status={activeSession.status} />}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-slate-400 font-mono">{chatID}</span>
            <CopyButton text={chatID} />
          </div>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Members',
            value: members?.length ?? '—',
            icon: Users,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
          },
          {
            label: 'Linked to Dashboard',
            value: members?.filter((m: any) => m.isLinked).length ?? '—',
            icon: Shield,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Session Registrations',
            value: regs.length,
            icon: Swords,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            label: 'Dashboard Admins',
            value: dashboardAdmins.length,
            icon: Crown,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"
          >
            <div
              className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}
            >
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Dashboard admins */}
      {dashboardAdmins.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-rose-400" /> Dashboard Admins in this group
          </p>
          <div className="flex flex-wrap gap-3">
            {dashboardAdmins.map((u: any) => (
              <div
                key={u.phone}
                className="flex items-center gap-2 bg-rose-50 rounded-lg px-3 py-2 border border-rose-100"
              >
                <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-xs font-bold text-rose-600">
                  {(u.displayName || u.phone).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {u.displayName || u.phone}
                  </p>
                  <div className="flex gap-1 mt-0.5">
                    {(u.roles || [])
                      .filter((r: string) => r !== 'user')
                      .map((r: string) => (
                        <span
                          key={r}
                          className="text-xs px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-medium"
                        >
                          {r}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members panel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setMemberExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 text-left"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-800">
              Members ({members?.length ?? 0})
            </span>
            <span className="text-xs text-slate-400">
              — {members?.filter((m: any) => m.isLinked).length ?? 0} linked to dashboard
            </span>
          </div>
          {memberExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {memberExpanded && (
          <div className="border-t border-slate-100">
            <div className="px-5 py-3 border-b border-slate-100">
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  placeholder="Search members…"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">
                  No members found
                </div>
              ) : (
                filteredMembers.map((m: any) => (
                  <div key={m.waId} className="px-5 py-3 flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                        m.isLinked
                          ? 'bg-indigo-100 text-indigo-600'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {m.isLinked
                        ? (m.displayName || m.phone).charAt(0).toUpperCase()
                        : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {m.displayName && (
                          <span className="text-sm font-semibold text-slate-800">
                            {m.displayName}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-mono">{m.phone}</span>
                        {m.roles?.some(
                          (r: string) => r === 'admin' || r === 'superadmin'
                        ) && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-medium flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5" /> Admin
                          </span>
                        )}
                        {!m.isLinked && (
                          <span className="text-xs text-slate-400 italic">
                            not on dashboard
                          </span>
                        )}
                      </div>
                      {m.linkedPlayers?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.linkedPlayers.map((p: any) => (
                            <TagPill key={p.playerTag} tag={p.playerTag} color="indigo" />
                          ))}
                          {m.userClans?.map((c: any) => (
                            <TagPill key={c.clanTag} tag={c.clanTag} color="amber" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* CWL Session panel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Swords className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-800">CWL Session</span>
            {activeSession ? (
              <>
                <StatusBadge status={activeSession.status} />
                <span className="text-xs text-slate-400 font-mono">{sessionIdStr}</span>
                <CopyButton text={sessionIdStr} />
              </>
            ) : (
              <span className="text-xs text-slate-400 italic">No session yet</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeSession?.status === 'closed' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReopen(sessionIdStr)}
                  disabled={reopening}
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {reopening ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Unlock className="w-3 h-3" />
                  )}
                  Reopen Session
                </button>
                {reopenErr && <span className="text-xs text-red-500">{reopenErr}</span>}
              </div>
            )}

            {isSessionOpen && clanList.length > 0 && regs.length > 0 && (
              <button
                onClick={() => setShowBulk((v) => !v)}
                className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium flex items-center gap-1"
              >
                <Shield className="w-3.5 h-3.5" />
                Bulk Assign
              </button>
            )}

            {(sessions?.length ?? 0) > 0 && (
              <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                {(['registrations', 'history'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSessionTab(t)}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition capitalize ${
                      sessionTab === t
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {sessionTab === 'registrations' ? (
            <>
              {clanList.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center pb-1">
                  <span className="text-xs text-slate-500 font-medium">CWL Clans:</span>
                  {clanList.map((c) => (
                    <TagPill key={c} tag={c} color="amber" />
                  ))}
                </div>
              )}

              <AnimatePresence>
                {showBulk && isSessionOpen && (
                  <motion.div
                    key="bulk"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <BulkAssignPanel
                      sessionId={sessionIdStr}
                      clanList={clanList}
                      registrations={regs}
                      assignmentMap={assignmentMap}
                      onDone={handleBulkDone}
                      onClose={() => setShowBulk(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {activeSession?.status === 'closed' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      Session locked — reopenable by dashboard admins only
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Users cannot run{' '}
                      <code className="bg-amber-100 px-1 rounded">!cwljoin</code> until an admin
                      reopens this session.
                    </p>
                  </div>
                </div>
              )}

              {!activeSession ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <Swords className="w-8 h-8 mb-2 text-slate-300" />
                  <p className="font-medium">No active session</p>
                  <p className="text-sm mt-1">
                    Bot admin can run{' '}
                    <code className="bg-slate-100 px-1 rounded">!cwlstart</code> in the group
                  </p>
                </div>
              ) : regs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <Users className="w-7 h-7 mb-2 text-slate-300" />
                  <p className="font-medium">No registrations yet</p>
                  <p className="text-sm mt-1">Members use !cwljoin to register</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {regs.map((r: any) => {
                    const key = r.playerTag || r.userPhone;
                    return (
                      <SessionRegRow
                        key={key}
                        reg={r}
                        assignment={assignmentMap.get(key)}
                        sessionId={sessionIdStr}
                        clanList={clanList}
                        isOpen={isSessionOpen}
                        onAssigned={handleAssigned}
                      />
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              {(sessions || []).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No session history</p>
              ) : (
                (sessions || []).map((s: any) => {
                  const sid = s._id?.toString?.() || '';
                  return (
                    <div
                      key={sid}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <StatusBadge status={s.status} />
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-mono text-slate-500">{sid}</p>
                            <CopyButton text={sid} />
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'} ·{' '}
                            {s.registrationCount} registrations
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.clanList?.length > 0 && (
                          <div className="flex gap-1">
                            {s.clanList.slice(0, 2).map((c: string) => (
                              <TagPill key={c} tag={c} color="amber" />
                            ))}
                            {s.clanList.length > 2 && (
                              <span className="text-xs text-slate-400">
                                +{s.clanList.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                        {s.status === 'closed' && (
                          <button
                            onClick={() => handleReopen(sid)}
                            disabled={reopening}
                            className="text-xs px-2 py-1 rounded border border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-medium flex items-center gap-1"
                          >
                            <Unlock className="w-3 h-3" /> Reopen
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Group Card (list view) ───────────────────────────────────────────────────

function GroupCard({
  group,
  session,
  onClick,
}: {
  group: any;
  session?: any;
  onClick: () => void;
}) {
  const chatID: string = group.chatID || group.chatId || '';
  const title: string = group.title || group.chatName || chatID.split('@')[0];
  const memberCount: number = group.members?.length || 0;

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 truncate">{title}</p>
            <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{chatID}</p>
          </div>
        </div>
        {group.isVerified ? (
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-1" />
        ) : (
          <XCircle className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4">
        {memberCount > 0 && (
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {memberCount} members
          </span>
        )}
        {session ? (
          <span className="flex items-center gap-1">
            <StatusBadge status={session.status} />
            <span className="text-xs text-slate-400">
              · {session.registrationCount} reg{session.registrationCount !== 1 ? 's' : ''}
            </span>
          </span>
        ) : (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Swords className="w-3.5 h-3.5" /> No session
          </span>
        )}
        {session?.clanList?.length > 0 && (
          <div className="flex gap-1">
            {session.clanList.slice(0, 2).map((c: string) => (
              <TagPill key={c} tag={c} color="amber" />
            ))}
            {session.clanList.length > 2 && (
              <span className="text-xs text-slate-400">+{session.clanList.length - 2}</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <button className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1 group">
          View details{' '}
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </button>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const { user } = useAuth();
  const isSuperadmin = user?.roles?.includes('superadmin') ?? false;

  const [groups, setGroups] = useState<any[]>([]);
  const [sessionMap, setSessionMap] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedChatID, setSelectedChatID] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiListGroups({ page: 1, limit: 100 });
        const allGroups: any[] = (res as any).groups || (res as any).data || [];
        setGroups(allGroups);

        // Load session summaries for each group in parallel (capped at 20)
        await Promise.all(
          allGroups.slice(0, 20).map(async (g) => {
            const cid = g.chatID || g.chatId;
            try {
              const detail = await apiGetGroupDetail(cid);
              const summary = detail.sessions?.[0] ?? null;
              if (summary) {
                setSessionMap((prev) => new Map(prev).set(cid, summary));
              }
            } catch (_) {}
          })
        );
      } catch (e: any) {
        setError(e.message || 'Failed to load groups');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = groups.filter((g) => {
    const s = search.toLowerCase();
    if (!s) return true;
    const chatID = g.chatID || g.chatId || '';
    const title = g.title || g.chatName || '';
    return chatID.toLowerCase().includes(s) || title.toLowerCase().includes(s);
  });

  if (selectedChatID) {
    return (
      <div className="max-w-5xl mx-auto py-2">
        <GroupDetail
          chatID={selectedChatID}
          isSuperadmin={isSuperadmin}
          onBack={() => setSelectedChatID(null)}
        />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Groups</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            WhatsApp groups linked through the bot
          </p>
        </div>
        {!loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <MessageSquare className="w-4 h-4" />
            {groups.length} group{groups.length !== 1 ? 's' : ''}
            {groups.filter((g) => g.isVerified).length > 0 && (
              <span className="text-emerald-600">
                ({groups.filter((g) => g.isVerified).length} verified)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search groups by name or chat ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center py-20 text-slate-400">
          <MessageSquare className="w-10 h-10 mb-3 text-slate-300" />
          <p className="font-medium">
            {search ? 'No groups match your search' : 'No groups found'}
          </p>
          <p className="text-sm mt-1">
            {search
              ? 'Try a different search term'
              : 'Groups appear here once the bot joins and verifies them'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g) => {
            const chatID = g.chatID || g.chatId;
            return (
              <GroupCard
                key={chatID}
                group={g}
                session={sessionMap.get(chatID)}
                onClick={() => setSelectedChatID(chatID)}
              />
            );
          })}
        </div>
      )}
    </motion.div>
  );
}


