'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, Shield, MessageSquare, Tag, ChevronDown, ChevronUp,
  Swords, RefreshCw, CheckCircle2, X, ChevronRight,
  Lock, Unlock, Crown, ClipboardPaste, AlertCircle, XCircle,
} from 'lucide-react';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import {
  apiGetRegistrations,
  apiListSessions,
  apiGetSessionDetail,
  apiAdminAssignPlayer,
  apiAdminAssignMultiple,
  apiAdminUnassignPlayer,
  apiCloseSession,
  apiReopenSession,
  apiGetMyGroup,
  apiGetClanInfo,
} from '@/lib/api';

// ─── Shared Helpers ──────────────────────────────────────────────────────────

function TagPill({ tag, color = 'indigo' }: { tag: string; color?: 'indigo' | 'emerald' | 'amber' | 'rose' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-mono font-medium ${colors[color]}`}>
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
      className="w-10 h-10 object-contain flex-shrink-0"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

function LeagueBadge({ name, iconUrl }: { name?: string; iconUrl?: string }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      {iconUrl && <img src={iconUrl} alt={name} className="w-4 h-4" />}
      {name}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    closed: 'bg-slate-100 text-slate-600 border-slate-200',
    archived: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[status] || map.closed}`}>
      {status}
    </span>
  );
}

// ─── Users Tab ──────────────────────────────────────────────────────────────

function RegistrationRow({ user }: { user: any }) {
  const [expanded, setExpanded] = useState(false);

  const legacyPlayer = user.linkedPlayer?.playerTag;
  const players: any[] = user.linkedPlayers || [];
  const userClans: any[] = user.userClans || [];
  const verifiedChats: string[] = user.verifiedChatIDs || [];

  const allPlayerTags = [
    ...players.map((p: any) => p),
    ...(legacyPlayer && !players.find((p: any) => p.playerTag === legacyPlayer)
      ? [{ playerTag: legacyPlayer, clanTag: user.linkedPlayer?.clanTag }]
      : []),
  ];

  return (
    <motion.div layout className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate">{user.displayName || user.phone}</p>
            <p className="text-xs text-slate-400">{user.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
            {allPlayerTags.length > 0 && (
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                {allPlayerTags.length} player{allPlayerTags.length !== 1 ? 's' : ''}
              </span>
            )}
            {verifiedChats.length > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                {verifiedChats.length} group{verifiedChats.length !== 1 ? 's' : ''}
              </span>
            )}
            {userClans.length > 0 && (
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                {userClans.length} clan{userClans.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span className="hidden md:block text-xs text-slate-400">
            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-slate-100 px-5 py-4 space-y-4"
        >
          {allPlayerTags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Linked Players</p>
              <div className="space-y-2">
                {allPlayerTags.map((p: any) => (
                  <div key={p.playerTag} className="flex flex-wrap items-center gap-2">
                    <TagPill tag={p.playerTag} color="indigo" />
                    {p.clanTag && <span className="text-xs text-slate-400">clan: <TagPill tag={p.clanTag} color="emerald" /></span>}
                    {p.assignedClanTag && <span className="text-xs text-slate-400">assigned: <TagPill tag={p.assignedClanTag} color="amber" /></span>}
                    {p.note && <span className="text-xs text-slate-400 italic">"{p.note}"</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {verifiedChats.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Verified WhatsApp Groups</p>
              <div className="flex flex-wrap gap-2">
                {verifiedChats.map((id) => <TagPill key={id} tag={id} color="emerald" />)}
              </div>
            </div>
          )}
          {userClans.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Dashboard Clans</p>
              <div className="flex flex-wrap gap-2">
                {userClans.map((c: any) => (
                  <div key={c.clanTag} className="flex items-center gap-1">
                    <TagPill tag={c.clanTag} color="amber" />
                    <span className="text-xs text-slate-400">{new Date(c.addedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Roles</p>
            <div className="flex gap-2">
              {(user.roles || ['user']).map((r: string) => (
                <span key={r} className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">{r}</span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function UsersTab() {
  const { user } = useAuth();
  const isSuperadmin = user?.roles?.includes('superadmin');

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [myChatIDs, setMyChatIDs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiGetRegistrations(),
      apiGetMyGroup().catch(() => null),
    ])
      .then(([regRes, groupRes]) => {
        setRegistrations((regRes as any).registrations || []);
        const chatIDs = ((groupRes as any)?.groups || []).map((g: any) => g.chatID).filter(Boolean);
        setMyChatIDs(chatIDs);
      })
      .catch((e) => setError(e.message || 'Failed to load registrations'))
      .finally(() => setLoading(false));
  }, []);

  // Role-based filtering: superadmin sees everyone, admin sees only own group
  const scopedRegistrations = isSuperadmin
    ? registrations
    : myChatIDs.length > 0
    ? registrations.filter((u) =>
        (u.verifiedChatIDs || []).some((id: string) => myChatIDs.includes(id))
      )
    : [];

  const filtered = scopedRegistrations.filter((u) => {
    const s = search.toLowerCase();
    if (!s) return true;
    return (
      u.phone?.toLowerCase().includes(s) ||
      u.displayName?.toLowerCase().includes(s) ||
      u.linkedPlayer?.playerTag?.toLowerCase().includes(s) ||
      (u.linkedPlayers || []).some((p: any) => p.playerTag?.toLowerCase().includes(s) || p.clanTag?.toLowerCase().includes(s)) ||
      (u.verifiedChatIDs || []).some((id: string) => id.toLowerCase().includes(s))
    );
  });

  const showNoGroupWarning = !isSuperadmin && myChatIDs.length === 0 && !loading;

  return (
    <div className="space-y-4">
      {!isSuperadmin && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm ${
          myChatIDs.length > 0
            ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
            : 'bg-amber-50 border border-amber-200 text-amber-700'
        }`}>
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {myChatIDs.length > 0
            ? `Showing registrations for your verified group${myChatIDs.length > 1 ? 's' : ''} only.`
            : 'You have no verified WhatsApp group. Verify a group to see its registrations.'}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <Input placeholder="Search by phone, name, tag…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {!loading && scopedRegistrations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Registered Users', value: scopedRegistrations.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Verified Groups', value: scopedRegistrations.reduce((s, u) => s + (u.verifiedChatIDs?.length || 0), 0), icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Player Tags', value: scopedRegistrations.reduce((s, u) => s + (u.linkedPlayers?.length || 0), 0), icon: Tag, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Dashboard Clans', value: scopedRegistrations.reduce((s, u) => s + (u.userClans?.length || 0), 0), icon: Shield, color: 'text-rose-600', bg: 'bg-rose-50' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48"><LoadingSpinner /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{error}</div>
      ) : showNoGroupWarning ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center py-20 text-slate-400">
          <Users className="w-10 h-10 mb-3 text-slate-300" />
          <p className="font-medium">No verified group found</p>
          <p className="text-sm mt-1">Verify your WhatsApp group to see its registrations</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center py-20 text-slate-400">
          <Users className="w-10 h-10 mb-3 text-slate-300" />
          <p className="font-medium">{search ? 'No matches found' : 'No registrations yet'}</p>
          <p className="text-sm mt-1">{search ? 'Try a different search term' : 'Users who run !cwlregister will appear here'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => <RegistrationRow key={user._id || user.phone} user={user} />)}
        </div>
      )}
    </div>
  );
}

// ─── CWL Sessions Tab ────────────────────────────────────────────────────────

/** Per-row assign panel — opens inline under the row */
function AssignPanel({
  sessionId,
  clanList,
  clanInfoMap,
  registration,
  existingAssignment,
  onDone,
  onUnassign,
  onClose,
}: {
  sessionId: string;
  clanList: string[];
  clanInfoMap: Map<string, any>;
  registration: any;
  existingAssignment?: string;
  onDone: (clanTag: string) => void;
  onUnassign?: () => void;
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
      await apiAdminAssignPlayer(sessionId, registration.userPhone, selectedClan, registration.playerTag);
      onDone(selectedClan);
    } catch (e: any) {
      setErr(e.message || 'Failed to assign');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">Assign to clan:</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex flex-wrap gap-2">
        {clanList.map((tag) => {
          const info = clanInfoMap.get(tag);
          const isActive = selectedClan === tag;
          return (
            <button
              key={tag}
              onClick={() => setSelectedClan(tag)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                isActive
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
              }`}
            >
              {info?.badgeUrl ? (
                <img src={info.badgeUrl} alt="" className="w-5 h-5 object-contain" />
              ) : (
                <Shield className={`w-4 h-4 ${isActive ? 'text-white/80' : 'text-slate-400'}`} />
              )}
              <span className="font-medium">{info?.name || tag}</span>
              {info?.clanLevel && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'
                }`}>Lv.{info.clanLevel}</span>
              )}
            </button>
          );
        })}
      </div>
      {selectedClan && (
        <p className="text-[11px] text-slate-400 font-mono">{selectedClan}</p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || !selectedClan}
          className="text-xs px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          {saving ? 'Saving…' : 'Save'}
        </button>
        {existingAssignment && onUnassign && (
          <button
            onClick={onUnassign}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            <XCircle className="w-3 h-3" /> Unassign
          </button>
        )}
        {err && <span className="text-xs text-red-500">{err}</span>}
      </div>
    </div>
  );
}

function SessionRegistrationRow({
  reg,
  assignment,
  sessionId,
  sessionStatus,
  clanList,
  clanInfoMap,
  onAssigned,
  onUnassigned,
}: {
  reg: any;
  assignment?: string;
  sessionId: string;
  sessionStatus: string;
  clanList: string[];
  clanInfoMap: Map<string, any>;
  onAssigned: (playerTag: string, clanTag: string) => void;
  onUnassigned: (playerTag: string) => void;
}) {
  const [assigning, setAssigning] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const pd = reg.playerData;
  const canAssign = sessionStatus === 'open' && clanList.length > 0;

  function handleDone(clanTag: string) {
    setAssigning(false);
    onAssigned(reg.playerTag, clanTag);
  }

  async function handleUnassign() {
    setUnassigning(true);
    setAssigning(false);
    try {
      await apiAdminUnassignPlayer(sessionId, reg.userPhone, reg.playerTag);
      onUnassigned(reg.playerTag);
    } catch (e: any) {
      alert(e.message || 'Failed to unassign');
    } finally {
      setUnassigning(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
        {/* TH Icon */}
        {pd?.townHallLevel ? (
          <THIcon level={pd.townHallLevel} />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-400">TH?</div>
        )}

        {/* Player info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 text-sm">{pd?.name || reg.playerTag}</p>
            <TagPill tag={reg.playerTag} color="indigo" />
            {reg.isGroupAdmin && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold uppercase">
                <Crown className="w-2.5 h-2.5" /> Admin
              </span>
            )}
            {pd?.expLevel && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">Lvl {pd.expLevel}</span>
            )}
            {pd?.trophies !== undefined && (
              <span className="text-xs text-amber-600 font-medium">🏆 {pd.trophies.toLocaleString()}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {pd?.clan && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                {pd.clan.badgeUrl && <img src={pd.clan.badgeUrl} alt="" className="w-4 h-4" />}
                {pd.clan.name}
              </span>
            )}
            {pd?.league && <LeagueBadge name={pd.league} iconUrl={pd.leagueIconUrl} />}
            <span className="text-xs text-slate-400">{reg.displayName || reg.userPhone}</span>
          </div>
        </div>

        {/* Assignment status + button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {assignment ? (
            <TagPill tag={assignment} color="emerald" />
          ) : (
            <span className="text-xs text-slate-400 italic">Unassigned</span>
          )}
          {canAssign && (
            <button
              onClick={() => setAssigning((v) => !v)}
              disabled={unassigning}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition flex items-center gap-1 ${
                assigning
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
              } disabled:opacity-50`}
            >
              {unassigning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Swords className="w-3 h-3" />}
              {assigning ? 'Cancel' : assignment ? 'Change' : 'Assign'}
            </button>
          )}
        </div>
      </div>

      {assigning && (
        <AssignPanel
          sessionId={sessionId}
          clanList={clanList}
          clanInfoMap={clanInfoMap}
          registration={reg}
          existingAssignment={assignment}
          onDone={handleDone}
          onUnassign={assignment ? handleUnassign : undefined}
          onClose={() => setAssigning(false)}
        />
      )}
    </div>
  );
}

/** Bulk-assign panel: select a clan and checkboxes for multiple players → one API call */
function BulkAssignPanel({
  sessionId,
  clanList,
  clanInfoMap,
  registrations,
  assignmentMap,
  onDone,
  onClose,
}: {
  sessionId: string;
  clanList: string[];
  clanInfoMap: Map<string, any>;
  registrations: any[];
  assignmentMap: Map<string, string>;
  onDone: (updates: Array<{ userPhone: string; playerTag?: string; clanTag: string }>) => void;
  onClose: () => void;
}) {
  const [selectedClan, setSelectedClan] = useState(clanList[0] || '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [pasteInput, setPasteInput] = useState('');
  const [pasteError, setPasteError] = useState('');

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handleSelectAll() {
    setSelected(new Set(registrations.map((r) => r.playerTag || r.userPhone)));
  }

  function handleClearAll() {
    setSelected(new Set());
  }

  function handlePasteTags() {
    setPasteError('');
    const rawTags = pasteInput
      .split(/[\s,]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.startsWith('#') && t.length > 1);

    if (rawTags.length === 0) {
      setPasteError('No valid tags found. Use format: #TAG1, #TAG2');
      return;
    }

    const matching = registrations
      .filter((r) => rawTags.includes((r.playerTag || '').toUpperCase()))
      .map((r) => r.playerTag || r.userPhone);

    if (matching.length === 0) {
      setPasteError(`None of the pasted tags are registered in this session.`);
      return;
    }

    setSelected((prev) => new Set([...prev, ...matching]));
    setPasteInput('');
  }

  async function handleSave() {
    if (!selectedClan || selected.size === 0) return;
    setSaving(true);
    setErr('');
    try {
      const assignments = registrations
        .filter((r) => selected.has(r.playerTag || r.userPhone))
        .map((r) => ({ userPhone: r.userPhone, playerTag: r.playerTag || undefined, clanTag: selectedClan }));
      await apiAdminAssignMultiple(sessionId, assignments);
      onDone(assignments);
    } catch (e: any) {
      setErr(e.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  const selectedClanInfo = clanInfoMap.get(selectedClan);

  return (
    <div className="bg-white rounded-xl border-2 border-indigo-200 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-500" /> Bulk Assign
        </p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
      </div>

      {/* Clan picker */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Assign to clan:</p>
        <div className="flex flex-wrap gap-2">
          {clanList.map((tag) => {
            const info = clanInfoMap.get(tag);
            const isActive = selectedClan === tag;
            return (
              <button
                key={tag}
                onClick={() => setSelectedClan(tag)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                  isActive
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                {info?.badgeUrl ? (
                  <img src={info.badgeUrl} alt="" className="w-6 h-6 object-contain" />
                ) : (
                  <Shield className={`w-4 h-4 ${isActive ? 'text-white/80' : 'text-slate-400'}`} />
                )}
                <span className="font-medium">{info?.name || tag}</span>
                {info?.clanLevel && (
                  <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'
                  }`}>Lv.{info.clanLevel}</span>
                )}
              </button>
            );
          })}
        </div>
        {selectedClanInfo && (
          <p className="text-xs text-slate-400 mt-1.5 font-mono">{selectedClan}</p>
        )}
      </div>

      {/* Paste tags shortcut */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-2">
        <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
          <ClipboardPaste className="w-3.5 h-3.5 text-slate-400" />
          Quick-select by tag (paste below)
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={pasteInput}
            onChange={(e) => { setPasteInput(e.target.value); setPasteError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handlePasteTags()}
            placeholder="#ABC123, #DEF456, ..."
            className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-slate-300"
          />
          <button
            onClick={handlePasteTags}
            disabled={!pasteInput.trim()}
            className="text-xs px-3 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-800 disabled:opacity-40 flex-shrink-0"
          >
            Select
          </button>
        </div>
        {pasteError && <p className="text-xs text-red-500">{pasteError}</p>}
      </div>

      {/* Selection header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">
          Select players{selected.size > 0 ? ` — ${selected.size} selected` : ''}:
        </p>
        <div className="flex gap-2">
          <button onClick={handleSelectAll} className="text-xs text-indigo-600 hover:underline">All</button>
          <span className="text-slate-300 text-xs">·</span>
          <button onClick={handleClearAll} className="text-xs text-slate-400 hover:underline">Clear</button>
        </div>
      </div>

      {/* Registrations list */}
      <div className="space-y-1 max-h-64 overflow-y-auto rounded-lg border border-slate-100">
        {registrations.map((r) => {
          const key = r.playerTag || r.userPhone;
          const pd = r.playerData;
          const current = assignmentMap.get(key);
          return (
            <label key={key} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(key)}
                onChange={() => toggle(key)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400 flex-shrink-0"
              />
              {pd?.townHallLevel ? (
                <img src={`/townhalls/th-${Math.min(pd.townHallLevel, 18)}.png`} alt="" className="w-7 h-7 object-contain flex-shrink-0" />
              ) : <div className="w-7 h-7 flex-shrink-0" />}
              <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">
                {pd?.name || r.playerTag}
                {pd?.townHallLevel && <span className="text-xs text-slate-400 ml-1">TH{pd.townHallLevel}</span>}
              </span>
              {r.isGroupAdmin && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
              {current && <TagPill tag={current} color="emerald" />}
            </label>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || selected.size === 0 || !selectedClan}
          className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Assign {selected.size > 0 ? `(${selected.size})` : ''}
        </button>
        {err && <span className="text-xs text-red-500">{err}</span>}
      </div>
    </div>
  );
}

function CwlSessionsTab() {
  const { user } = useAuth();
  const isSuperadmin = user?.roles?.includes('superadmin');

  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState('');
  const [myChatIDs, setMyChatIDs] = useState<string[]>([]);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Local assignment map: playerTag|userPhone → clanTag (for optimistic updates)
  const [assignmentMap, setAssignmentMap] = useState<Map<string, string>>(new Map());
  const [showBulk, setShowBulk] = useState(false);

  // Clan info map: clanTag → { name, clanLevel, badgeUrl }
  const [clanInfoMap, setClanInfoMap] = useState<Map<string, any>>(new Map());

  // Session status control
  const [statusChanging, setStatusChanging] = useState(false);

  // Load own group chatIDs + sessions list
  useEffect(() => {
    Promise.all([
      apiListSessions({ limit: 50 }),
      apiGetMyGroup().catch(() => null),
    ]).then(([sessRes, groupRes]) => {
      const allSessions = (sessRes as any).sessions || [];
      const groups: any[] = (groupRes as any)?.groups || [];
      const chatIDs = groups.map((g: any) => g.chatID).filter(Boolean);
      setMyChatIDs(chatIDs);

      // Superadmin sees all sessions; admin sees only own group sessions
      const filtered = isSuperadmin
        ? allSessions
        : chatIDs.length > 0
        ? allSessions.filter((s: any) => chatIDs.includes(s.chatID))
        : allSessions; // fallback: show all if no groups yet
      setSessions(filtered);
    }).catch((e) => setSessionsError(e.message || 'Failed'))
      .finally(() => setSessionsLoading(false));
  }, []);

  // Load session detail when selected
  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError('');
    setDetail(null);
    setShowBulk(false);
    try {
      const res = await apiGetSessionDetail(id);
      setDetail(res.session);
      // Build assignment map from session.assignments
      const map = new Map<string, string>();
      for (const a of res.session?.assignments || []) {
        const key = a.playerTag || a.userPhone;
        map.set(key, a.clanTag);
      }
      setAssignmentMap(map);

      // Load clan info for all clans:
      //   1. session's explicit clanList
      //   2. current in-game clans of registered players + their dashboard-linked clans
      //   3. already-assigned clans (so all known clans appear in the picker)
      const sessionTags: string[] = res.session?.clanList || [];
      const regClanTags: string[] = (res.session?.registrations || [])
        .flatMap((r: any) => [
          r.playerData?.clan?.tag,
          ...(r.userClanTags || []),
        ])
        .filter(Boolean);
      const assignedTags: string[] = (res.session?.assignments || [])
        .map((a: any) => a.clanTag)
        .filter(Boolean);
      const allClanTags = [...new Set([...sessionTags, ...regClanTags, ...assignedTags])];

      if (allClanTags.length > 0) {
        const entries = await Promise.all(
          allClanTags.map((tag) =>
            apiGetClanInfo(tag)
              .then((r: any) => [tag, r?.clan ?? r] as [string, any])
              .catch(() => [tag, null] as [string, null])
          )
        );
        const infoMap = new Map<string, any>();
        entries.forEach(([tag, info]) => { if (info) infoMap.set(tag, info); });
        setClanInfoMap(infoMap);
      }
    } catch (e: any) {
      setDetailError(e.message || 'Failed to load session');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSessionId) loadDetail(selectedSessionId);
  }, [selectedSessionId, loadDetail]);

  async function handleCloseSession() {
    if (!selectedSessionId || !detail) return;
    if (!confirm('Close this registration session? Players will no longer be able to register.')) return;
    setStatusChanging(true);
    try {
      await apiCloseSession(selectedSessionId);
      setDetail((d: any) => ({ ...d, status: 'closed' }));
      setSessions((prev) =>
        prev.map((s) => s._id === selectedSessionId ? { ...s, status: 'closed' } : s)
      );
    } catch (e: any) {
      alert(e.message || 'Failed to close session');
    } finally {
      setStatusChanging(false);
    }
  }

  async function handleReopenSession() {
    if (!selectedSessionId || !detail) return;
    setStatusChanging(true);
    try {
      await apiReopenSession(selectedSessionId);
      setDetail((d: any) => ({ ...d, status: 'open' }));
      setSessions((prev) =>
        prev.map((s) => s._id === selectedSessionId ? { ...s, status: 'open' } : s)
      );
    } catch (e: any) {
      alert(e.message || 'Failed to reopen session');
    } finally {
      setStatusChanging(false);
    }
  }

  function handleAssigned(playerTag: string, clanTag: string) {
    setAssignmentMap((prev) => new Map(prev).set(playerTag, clanTag));
  }

  function handleUnassigned(playerTag: string) {
    setAssignmentMap((prev) => {
      const next = new Map(prev);
      next.delete(playerTag);
      return next;
    });
  }

  function handleBulkDone(updates: Array<{ userPhone: string; playerTag?: string; clanTag: string }>) {
    setAssignmentMap((prev) => {
      const next = new Map(prev);
      updates.forEach((u) => next.set(u.playerTag || u.userPhone, u.clanTag));
      return next;
    });
    setShowBulk(false);
  }

  const regs = detail?.registrations || [];
  // clanList: merge ALL sources so the assign picker always shows every clan
  //   1. session's explicit clanList
  //   2. clans loaded into clanInfoMap (info fetch succeeded)
  //   3. clans from existing assignments — even if their info fetch failed,
  //      ensure they still appear as a selectable option
  const clanList: string[] = [...new Set([
    ...(detail?.clanList || []),
    ...Array.from(clanInfoMap.keys()),
    ...(detail?.assignments || []).map((a: any) => a.clanTag).filter(Boolean),
  ])];

  return (
    <div className="space-y-4">
      {/* Session selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Select Session</p>
        {sessionsLoading ? (
          <div className="flex justify-center py-4"><LoadingSpinner /></div>
        ) : sessionsError ? (
          <p className="text-sm text-red-500">{sessionsError}</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-400">No sessions found.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sessions.map((s: any) => (
              <button
                key={s._id}
                onClick={() => setSelectedSessionId(s._id)}
                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition ${
                  selectedSessionId === s._id
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                {s.chatID?.split('@')[0] || 'Unknown'}
                <StatusBadge status={s.status} />
                <span className="text-xs text-slate-400">({(s.registrations?.length || 0)} regs)</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Session detail */}
      {selectedSessionId && (
        <div className="space-y-4">
          {detailLoading ? (
            <div className="flex items-center justify-center h-40"><LoadingSpinner /></div>
          ) : detailError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{detailError}</div>
          ) : detail ? (
            <>
              {/* Session header */}
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-800">{detail.chatID?.split('@')[0] || 'Session'}</h2>
                    <StatusBadge status={detail.status} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {regs.length} registration{regs.length !== 1 ? 's' : ''}
                    {clanList.length > 0 && ` · ${clanList.length} clan${clanList.length !== 1 ? 's' : ''}`}
                    {detail.createdAt && ` · Created ${new Date(detail.createdAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {detail.status === 'open' && clanList.length > 0 && (
                    <button
                      onClick={() => setShowBulk((v) => !v)}
                      className="text-sm px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium flex items-center gap-1.5"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Bulk Assign
                    </button>
                  )}
                  <button
                    onClick={() => loadDetail(selectedSessionId!)}
                    className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                  {detail.status === 'open' ? (
                    <button
                      onClick={handleCloseSession}
                      disabled={statusChanging}
                      className="text-sm px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {statusChanging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                      Close Session
                    </button>
                  ) : (
                    <button
                      onClick={handleReopenSession}
                      disabled={statusChanging}
                      className="text-sm px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-medium flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {statusChanging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                      Reopen Session
                    </button>
                  )}
                </div>
              </div>

              {/* Clan list pills */}
              {clanList.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1">
                  <span className="text-xs text-slate-500 font-medium">CWL Clans:</span>
                  {clanList.map((c) => <TagPill key={c} tag={c} color="amber" />)}
                </div>
              )}

              {/* Bulk assign panel disabled */}
              <AnimatePresence>
                {showBulk && (
                  <motion.div
                    key="bulk"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <BulkAssignPanel
                      sessionId={selectedSessionId!}
                      clanList={clanList}
                      clanInfoMap={clanInfoMap}
                      registrations={regs}
                      assignmentMap={assignmentMap}
                      onDone={handleBulkDone}
                      onClose={() => setShowBulk(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Registration rows */}
              {regs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center py-16 text-slate-400">
                  <Swords className="w-10 h-10 mb-3 text-slate-300" />
                  <p className="font-medium">No registrations yet</p>
                  <p className="text-sm mt-1">Players will appear once they register via WhatsApp</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {regs.map((r: any) => {
                    const key = r.playerTag || r.userPhone;
                    return (
                      <SessionRegistrationRow
                        key={key}
                        reg={r}
                        assignment={assignmentMap.get(key)}
                        sessionId={selectedSessionId}
                        sessionStatus={detail.status}
                        clanList={clanList}
                        clanInfoMap={clanInfoMap}
                        onAssigned={handleAssigned}
                        onUnassigned={handleUnassigned}
                      />
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {!selectedSessionId && !sessionsLoading && sessions.length > 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center py-16 text-slate-400">
          <ChevronRight className="w-8 h-8 mb-2 text-slate-300" />
          <p className="font-medium">Select a session above</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'sessions', label: 'CWL Sessions', icon: Swords },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function RegistrationsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('users');

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Registrations</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Users who registered via <code className="bg-slate-100 px-1 rounded">!cwlregister</code>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'users' ? <UsersTab /> : <CwlSessionsTab />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
