'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Users, CheckCircle, XCircle, Search, Shield, RefreshCw,
  KeyRound, ChevronRight, X, Crown, Star, Swords, Trophy,
  SlidersHorizontal, User, Bot, Unlock, Lock, CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  apiGetMyGroup,
  apiGenerateGroupOtp,
  apiGetPlayerLive,
  apiGetGroupSession,
  apiReopenSession,
  apiAdminAssignPlayer,
  apiAdminAssignMultiple,
  apiGetClanInfo,
} from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerData {
  tag: string;
  name: string;
  townHallLevel: number;
  expLevel: number;
  trophies: number;
  warStars: number;
  attackWins: number;
  defenseWins: number;
  league?: { name: string; iconUrls?: { small?: string } } | null;
  leagueIconUrl?: string;
  clan?: { tag: string; name: string; badgeUrl: string } | null;
}

interface EnrichedPlayer {
  playerTag: string;
  playerData: PlayerData | null;
}

interface GroupMember {
  _id?: string;
  phone: string;
  displayName?: string;
  name?: string;
  roles?: string[];
  enrichedPlayers: EnrichedPlayer[];
  userClans?: { clanTag: string }[];
  linkedPlayerData?: PlayerData | null;
  isAdmin?: boolean;
  _source?: 'bot' | undefined;
}

interface GroupData {
  chatID: string;
  title?: string;
  displayTitle?: string;
  botChatName?: string;
  isVerified?: boolean;
  verifiedByUserId?: string;
  resolvedMembers: GroupMember[];
  adminPhones: string[];
  totalParticipants: number;
}

interface ClanInfo { tag: string; name: string; badgeUrl: string; level?: number }

interface FilterState {
  search: string;
  source: 'all' | 'dashboard' | 'bot';
  status: 'all' | 'linked' | 'unlinked';
  adminOnly: boolean;
  thMin: number;
}

const DEFAULT_FILTER: FilterState = {
  search: '',
  source: 'all',
  status: 'all',
  adminOnly: false,
  thMin: 0,
};

// ─── Module-level clan cache + throttle ──────────────────────────────────────
// Persists across re-renders; max 15 concurrent CoC requests (BatchThrottler pattern)

const _clanCache = new Map<string, ClanInfo>();
let _inflight = 0;
const _waitQueue: Array<() => void> = [];
const MAX_CONCURRENT = 15;

function _tick() {
  while (_inflight < MAX_CONCURRENT && _waitQueue.length > 0) {
    const next = _waitQueue.shift()!;
    next();
  }
}

async function fetchClanInfoCached(
  tag: string,
  seedMap?: Record<string, ClanInfo>
): Promise<ClanInfo | null> {
  if (_clanCache.has(tag)) return _clanCache.get(tag)!;
  if (seedMap?.[tag]) { _clanCache.set(tag, seedMap[tag]); return seedMap[tag]; }
  return new Promise((resolve) => {
    const run = async () => {
      _inflight++;
      try {
        const d = await apiGetClanInfo(tag).catch(() => null) as any;
        if (d && d.tag) {
          const info: ClanInfo = { tag: d.tag, name: d.name || tag, badgeUrl: d.badgeUrl || '', level: d.level ?? 0 };
          _clanCache.set(tag, info);
          resolve(info);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      } finally {
        _inflight--;
        _tick();
      }
    };
    if (_inflight < MAX_CONCURRENT) {
      run();
    } else {
      _waitQueue.push(run);
    }
  });
}

/** Seed the module cache from the clanInfoMap returned by getMyGroup */
function seedClanCache(map: Record<string, ClanInfo>) {
  for (const [k, v] of Object.entries(map)) _clanCache.set(k, v);
}

// ─── ClanSelect ───────────────────────────────────────────────────────────────
// Custom dropdown that shows badge + name + level instead of plain option tags

function ClanSelect({
  value,
  onChange,
  clanTags,
}: {
  value: string;
  onChange: (t: string) => void;
  clanTags: string[];
}) {
  const [open, setOpen] = useState(false);
  const [infos, setInfos] = useState<Record<string, ClanInfo>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const updates: Record<string, ClanInfo> = {};
      await Promise.all(
        clanTags.map(async (t) => {
          const info = await fetchClanInfoCached(t);
          if (info && !cancelled) updates[t] = info;
        })
      );
      if (!cancelled) setInfos((prev) => ({ ...prev, ...updates }));
    })();
    return () => { cancelled = true; };
  }, [clanTags.join(',')]);

  const selected = infos[value];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm min-w-[160px] text-left"
      >
        {selected?.badgeUrl && (
          <Image src={selected.badgeUrl} alt="" width={20} height={20} unoptimized className="object-contain flex-shrink-0" />
        )}
        <span className="flex-1 truncate text-slate-800 dark:text-slate-200 text-xs">
          {selected ? `${selected.name}${selected.level ? ` (Lv.${selected.level})` : ''}` : value || 'Select clan'}
        </span>
        <ChevronDown size={12} className="text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 min-w-[200px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 max-h-60 overflow-y-auto">
          {clanTags.map((t) => {
            const info = infos[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => { onChange(t); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${t === value ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                  }`}
              >
                {info?.badgeUrl ? (
                  <Image src={info.badgeUrl} alt="" width={22} height={22} unoptimized className="object-contain flex-shrink-0" />
                ) : (
                  <Shield size={16} className="text-slate-300 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {info?.name || t}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {t}{info?.level ? ` · Lv.${info.level}` : ''}
                  </p>
                </div>
                {t === value && <CheckCircle2 size={14} className="text-indigo-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── GroupSessionPanel ────────────────────────────────────────────────────────

function GroupSessionPanel({
  chatID,
  resolvedMembers,
  clanInfoMap,
}: {
  chatID: string;
  resolvedMembers: GroupMember[];
  clanInfoMap: Record<string, ClanInfo>;
}) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [assignmentMap, setAssignmentMap] = useState<Map<string, string>>(new Map());
  const [showBulk, setShowBulk] = useState(false);
  const [reopening, setReopening] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res: any = await apiGetGroupSession(chatID);
      setSession(res.session);
      if (res.session) {
        const m = new Map<string, string>();
        for (const a of res.session.assignments || []) m.set(a.playerTag || a.userPhone, a.clanTag);
        setAssignmentMap(m);
      }
    } catch (e: any) {
      setErr(e.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [chatID]);

  useEffect(() => { load(); }, [load]);

  // Seed cache from page clanInfoMap
  useEffect(() => { seedClanCache(clanInfoMap); }, [clanInfoMap]);

  // Available clan tags for assignment: session clanList + all members' dashboard-linked clans
  const availableClanTags = useMemo(() => {
    const set = new Set<string>(session?.clanList || []);
    for (const m of resolvedMembers) {
      for (const c of (m.userClans || [])) set.add(c.clanTag);
    }
    return [...set];
  }, [session, resolvedMembers]);

  async function handleReopen() {
    if (!session?._id) return;
    setReopening(true);
    try {
      await apiReopenSession(session._id);
      await load();
    } catch (e: any) {
      setErr(e.message || 'Failed to reopen');
    } finally {
      setReopening(false);
    }
  }

  function handleAssigned(key: string, clanTag: string) {
    setAssignmentMap((prev) => new Map(prev).set(key, clanTag));
  }

  function handleBulkDone(updates: Array<{ userPhone: string; playerTag?: string; clanTag: string }>) {
    setAssignmentMap((prev) => {
      const next = new Map(prev);
      updates.forEach((u) => next.set(u.playerTag || u.userPhone, u.clanTag));
      return next;
    });
    setShowBulk(false);
  }

  if (loading) return <div className="flex justify-center py-6"><LoadingSpinner size="sm" /></div>;
  if (err) return <p className="text-sm text-red-500 text-center py-4">{err}</p>;
  if (!session) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-4 text-center">
        <p className="text-slate-400 text-sm">No active CWL session for this group.</p>
      </div>
    );
  }

  const isOpen = session.status === 'open';
  const regs: any[] = session.registrations || [];
  const sessionId: string = session._id;

  return (
    <div className="space-y-3">
      {/* Session header */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-semibold ${isOpen
            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
          }`}>
          {isOpen ? <Unlock size={12} /> : <Lock size={12} />}
          Session {isOpen ? 'Open' : 'Closed'}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {regs.length} registrations · {assignmentMap.size} assigned
        </span>
        {!isOpen && (
          <button
            onClick={handleReopen}
            disabled={reopening}
            className="ml-auto flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors disabled:opacity-60"
          >
            {reopening ? <RefreshCw size={12} className="animate-spin" /> : <Unlock size={12} />}
            Reopen Session
          </button>
        )}
        {isOpen && regs.length > 0 && (
          <button
            onClick={() => setShowBulk((v) => !v)}
            className="ml-auto flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 dark:text-indigo-400 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 font-medium transition-colors"
          >
            <CheckCircle2 size={12} /> Bulk Assign
          </button>
        )}
      </div>

      {/* Bulk assign panel */}
      {showBulk && (
        <BulkAssignPanel
          sessionId={sessionId}
          clanTags={availableClanTags}
          registrations={regs}
          assignmentMap={assignmentMap}
          onDone={handleBulkDone}
          onClose={() => setShowBulk(false)}
        />
      )}

      {/* Registration rows */}
      <div className="space-y-2">
        {regs.length === 0 && (
          <p className="text-slate-400 text-xs text-center py-4">No registrations yet.</p>
        )}
        {regs.map((reg) => {
          const key = reg.playerTag || reg.userPhone;
          const assigned = assignmentMap.get(key);
          return (
            <SessionRegRow
              key={key}
              reg={reg}
              assignment={assigned}
              sessionId={sessionId}
              clanTags={availableClanTags}
              isOpen={isOpen}
              onAssigned={handleAssigned}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── SessionRegRow ────────────────────────────────────────────────────────────

function SessionRegRow({
  reg,
  assignment,
  sessionId,
  clanTags,
  isOpen,
  onAssigned,
}: {
  reg: any;
  assignment?: string;
  sessionId: string;
  clanTags: string[];
  isOpen: boolean;
  onAssigned: (key: string, clanTag: string) => void;
}) {
  const [assigning, setAssigning] = useState(false);
  const [selectedClan, setSelectedClan] = useState(assignment || clanTags[0] || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const pd = reg.playerData;
  const key = reg.playerTag || reg.userPhone;

  async function handleSave() {
    if (!selectedClan) return;
    setSaving(true);
    setErr('');
    try {
      await apiAdminAssignPlayer(sessionId, reg.userPhone, selectedClan, reg.playerTag);
      onAssigned(key, selectedClan);
      setAssigning(false);
    } catch (e: any) {
      setErr(e.message || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-visible relative ${assigning ? 'z-50' : 'z-0'}`}>
      <div className="flex items-center gap-3 px-3 py-2.5 flex-wrap">
        <THIcon level={pd?.townHallLevel} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {pd?.name || reg.playerTag}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap mt-0.5">
            <span className="font-mono">{reg.playerTag}</span>
            {pd?.clan && (
              <span className="flex items-center gap-1">
                {pd.clan.badgeUrl && <Image src={pd.clan.badgeUrl} alt="" width={12} height={12} unoptimized />}
                {pd.clan.name}
              </span>
            )}
            <span className="text-slate-300">·</span>
            <span>{reg.displayName || reg.userPhone}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {assignment ? (
            <AssignedClanBadge clanTag={assignment} />
          ) : (
            <span className="text-xs text-slate-400 italic">Unassigned</span>
          )}
          {isOpen && clanTags.length > 0 && (
            <button
              onClick={() => { setSelectedClan(assignment || clanTags[0] || ''); setAssigning((v) => !v); }}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 dark:text-indigo-400 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 font-medium flex items-center gap-1"
            >
              <Shield size={12} />{assignment ? 'Reassign' : 'Assign'}
            </button>
          )}
        </div>
      </div>
      {assigning && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700/40 border-t border-slate-100 dark:border-slate-700">
          <ClanSelect value={selectedClan} onChange={setSelectedClan} clanTags={clanTags} />
          <button
            onClick={handleSave}
            disabled={saving || !selectedClan}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50"
          >
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Save
          </button>
          <button onClick={() => setAssigning(false)} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
          {err && <span className="text-xs text-red-500">{err}</span>}
        </div>
      )}
    </div>
  );
}

// ─── AssignedClanBadge ────────────────────────────────────────────────────────
function AssignedClanBadge({ clanTag }: { clanTag: string }) {
  const [info, setInfo] = useState<ClanInfo | null>(_clanCache.get(clanTag) || null);
  useEffect(() => {
    if (!info) {
      fetchClanInfoCached(clanTag).then((r) => { if (r) setInfo(r); });
    }
  }, [clanTag]);
  return (
    <span className="flex items-center gap-1 text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700 font-medium">
      {info?.badgeUrl && <Image src={info.badgeUrl} alt="" width={14} height={14} unoptimized />}
      {info?.name || clanTag}
    </span>
  );
}

// ─── BulkAssignPanel ──────────────────────────────────────────────────────────

function BulkAssignPanel({
  sessionId,
  clanTags,
  registrations,
  assignmentMap,
  onDone,
  onClose,
}: {
  sessionId: string;
  clanTags: string[];
  registrations: any[];
  assignmentMap: Map<string, string>;
  onDone: (updates: Array<{ userPhone: string; playerTag?: string; clanTag: string }>) => void;
  onClose: () => void;
}) {
  const [selectedClan, setSelectedClan] = useState(clanTags[0] || '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next;
    });
  }
  function toggleAll() {
    if (selected.size === registrations.length) setSelected(new Set());
    else setSelected(new Set(registrations.map((r) => r.playerTag || r.userPhone)));
  }

  async function handleSave() {
    if (!selectedClan || selected.size === 0) return;
    setSaving(true); setErr('');
    try {
      const assignments = registrations
        .filter((r) => selected.has(r.playerTag || r.userPhone))
        .map((r) => ({ userPhone: r.userPhone, playerTag: r.playerTag || undefined, clanTag: selectedClan }));
      await apiAdminAssignMultiple(sessionId, assignments);
      onDone(assignments);
    } catch (e: any) { setErr(e.message || 'Failed'); }
    finally { setSaving(false); }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-indigo-200 dark:border-indigo-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-slate-800 dark:text-white text-sm">Bulk Assign</p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Assign to:</span>
        <ClanSelect value={selectedClan} onChange={setSelectedClan} clanTags={clanTags} />
      </div>
      <div className="space-y-1 max-h-52 overflow-y-auto">
        <label className="flex items-center gap-2 px-2 py-1 text-xs text-slate-500 cursor-pointer">
          <input type="checkbox"
            checked={selected.size === registrations.length && registrations.length > 0}
            onChange={toggleAll}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600"
          />
          Select all ({registrations.length})
        </label>
        {registrations.map((r) => {
          const key = r.playerTag || r.userPhone;
          const pd = r.playerData;
          return (
            <label key={key} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
              <input type="checkbox" checked={selected.has(key)} onChange={() => toggle(key)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
              <THIcon level={pd?.townHallLevel} size="sm" />
              <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">
                {pd?.name || r.playerTag}
                {pd?.townHallLevel && <span className="text-xs text-slate-400 ml-1">TH{pd.townHallLevel}</span>}
              </span>
              {assignmentMap.get(key) && <AssignedClanBadge clanTag={assignmentMap.get(key)!} />}
            </label>
          );
        })}
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button onClick={handleSave} disabled={saving || selected.size === 0 || !selectedClan}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50">
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Assign {selected.size > 0 ? `(${selected.size})` : ''}
        </button>
        {err && <span className="text-xs text-red-500">{err}</span>}
      </div>
    </div>
  );
}

function THIcon({ level, size = 'md', showLabel = false }: { level?: number | null; size?: 'sm' | 'md' | 'lg'; showLabel?: boolean }) {
  if (!level) return null;
  const th = Math.min(Math.max(level, 1), 18);
  const dim = size === 'sm' ? 26 : size === 'lg' ? 56 : 38;
  return (
    <div className="relative flex-shrink-0 inline-flex items-center justify-center">
      <Image
        src={`/townhalls/th-${th}.png`}
        alt={`TH${th}`}
        width={dim}
        height={dim}
        className="object-contain drop-shadow-sm"
        unoptimized
      />
      {showLabel && (
        <span className="absolute -bottom-1 -right-1 text-[9px] font-bold bg-slate-800 text-white rounded px-0.5 leading-tight shadow">
          {th}
        </span>
      )}
    </div>
  );
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const { dot, bg, text } =
    role === 'superadmin'
      ? { dot: 'bg-red-500',   bg: 'bg-red-50 dark:bg-red-900/20',   text: 'text-red-700 dark:text-red-400' }
      : role === 'admin'
      ? { dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400' }
      : { dot: 'bg-blue-500',  bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-700 dark:text-blue-400' };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {role}
    </span>
  );
}

// ─── PlayerModal ─────────────────────────────────────────────────────────────

function PlayerModal({
  tag,
  initial,
  onClose,
}: {
  tag: string;
  initial: PlayerData | null;
  onClose: () => void;
}) {
  const [player, setPlayer] = useState<PlayerData | null>(initial);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await apiGetPlayerLive(tag);
        if (!cancelled) setPlayer((res as any).player ?? res);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to fetch');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tag]);

  const th = player?.townHallLevel ?? initial?.townHallLevel;
  const leagueIcon = player?.leagueIconUrl || player?.league?.iconUrls?.small;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 24, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-5 text-white relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-purple-500/20 pointer-events-none" />
          <div className="relative flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <THIcon level={th} size="lg" showLabel />
              <div>
                <p className="font-bold text-lg leading-tight drop-shadow">{player?.name || initial?.name || tag}</p>
                <p className="text-indigo-200 text-xs font-mono">{tag}</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X size={16} />
            </motion.button>
          </div>
          <div className="relative flex items-center gap-2 text-sm">
            {leagueIcon && (
              <Image src={leagueIcon} alt="league" width={24} height={24} unoptimized className="object-contain drop-shadow-sm" />
            )}
            <span className="opacity-90">{player?.league?.name || 'Unranked'}</span>
            <span className="opacity-50">·</span>
            <span className="opacity-80">Level {player?.expLevel ?? '?'}</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {loading && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[0,1,2].map(i => (
                <div key={i} className="bg-slate-100 dark:bg-slate-700 rounded-xl h-16 animate-pulse" />
              ))}
              <div className="col-span-3 bg-slate-100 dark:bg-slate-700 rounded-xl h-14 animate-pulse" />
            </div>
          )}
          {error && !loading && (
            <p className="text-center text-red-500 text-sm py-4">{error}</p>
          )}
          {!loading && player && (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { icon: <Trophy size={15} className="text-amber-500" />, label: 'Trophies',   value: player.trophies?.toLocaleString(),     bg: 'bg-amber-50 dark:bg-amber-900/20' },
                  { icon: <Star size={15} className="text-yellow-500" />,  label: 'War Stars',  value: player.warStars?.toLocaleString(),      bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
                  { icon: <Swords size={15} className="text-red-500" />,   label: 'Attacks',    value: player.attackWins?.toLocaleString(),    bg: 'bg-red-50 dark:bg-red-900/20' },
                  { icon: <Shield size={15} className="text-blue-500" />,  label: 'Defenses',   value: player.defenseWins?.toLocaleString(),   bg: 'bg-blue-50 dark:bg-blue-900/20' },
                ].map(({ icon, label, value, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-2.5 flex items-center gap-2.5`}>
                    <div className="flex-shrink-0">{icon}</div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-sm leading-none">{value ?? '—'}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Clan */}
              {player.clan ? (
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                  {player.clan.badgeUrl && (
                    <Image src={player.clan.badgeUrl} alt="clan badge" width={36} height={36} unoptimized className="object-contain flex-shrink-0 drop-shadow-sm" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{player.clan.name}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-mono">{player.clan.tag}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 text-slate-400 text-sm">No clan</div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── ClanSection ─────────────────────────────────────────────────────────────

function ClanSection({
  clanTag,
  clanInfo,
  players,
  onPlayerClick,
}: {
  clanTag: string | null;
  clanInfo?: ClanInfo;
  players: EnrichedPlayer[];
  onPlayerClick: (tag: string, data: PlayerData | null) => void;
}) {
  const displayName = clanInfo?.name || (clanTag === null ? 'No Clan' : clanTag ?? 'Unknown Clan');
  const badgeUrl = clanInfo?.badgeUrl;

  return (
    <div className="rounded-xl overflow-hidden mb-2 border border-slate-200/70 dark:border-slate-700/70">
      {/* Clan header — subtle gradient */}
      <div className="flex items-center gap-2 px-3 py-2
        bg-gradient-to-r from-slate-100 to-slate-50
        dark:from-slate-700/70 dark:to-slate-800/50">
        {badgeUrl ? (
          <Image src={badgeUrl} alt="clan" width={22} height={22} unoptimized
            className="object-contain flex-shrink-0 drop-shadow-sm" />
        ) : (
          <div className="w-5 h-5 rounded flex items-center justify-center bg-slate-200 dark:bg-slate-600 flex-shrink-0">
            <Shield size={12} className="text-slate-500" />
          </div>
        )}
        <span className="font-semibold text-slate-800 dark:text-slate-100 text-xs truncate flex-1">{displayName}</span>
        <span className="flex-shrink-0 text-[10px] font-bold bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-full px-1.5 py-0.5">
          {players.length}
        </span>
        {clanTag && (
          <span className="hidden sm:block text-slate-400 text-[10px] font-mono ml-1">{clanTag}</span>
        )}
      </div>

      {/* Player rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
        {players.map((ep) => {
          const pd = ep.playerData;
          const name = pd?.name || ep.playerTag;
          const tag = ep.playerTag;
          return (
            <motion.button
              key={tag}
              onClick={() => onPlayerClick(tag, pd)}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5
                hover:bg-indigo-50/80 dark:hover:bg-indigo-900/20
                active:bg-indigo-100 dark:active:bg-indigo-900/30
                transition-colors text-left group"
            >
              <THIcon level={pd?.townHallLevel} size="sm" showLabel />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white text-sm truncate
                  group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                  {name}
                </p>
                <p className="text-slate-400 text-[11px] font-mono">{tag}</p>
              </div>
              {pd?.trophies != null && (
                <span className="flex items-center gap-0.5 text-xs font-semibold
                  bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400
                  px-1.5 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-700/50">
                  <Trophy size={10} />
                  {pd.trophies.toLocaleString()}
                </span>
              )}
              <ChevronRight size={13} className="text-slate-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MemberCard ───────────────────────────────────────────────────────────────

function MemberInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  // Deterministic color from name
  const colors = [
    'from-indigo-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-sky-500 to-blue-600',
    'from-violet-500 to-fuchsia-600',
  ];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % colors.length;
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${colors[idx]} shadow-sm`}>
      <span className="text-white text-xs font-bold tracking-wide">{initials || '?'}</span>
    </div>
  );
}

function MemberCard({
  member,
  clanInfoMap,
  onPlayerClick,
  expanded: controlledExpanded,
  onToggle,
}: {
  member: GroupMember;
  clanInfoMap: Record<string, ClanInfo>;
  onPlayerClick: (tag: string, data: PlayerData | null) => void;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = controlledExpanded !== undefined ? controlledExpanded : localExpanded;
  const setExpanded = onToggle ? () => onToggle() : () => setLocalExpanded((v) => !v);
  const displayName = member.displayName || member.name || member.phone;
  const isDashboard = !member._source;

  const playersByClan = useMemo(() => {
    const map = new Map<string, EnrichedPlayer[]>();
    for (const ep of member.enrichedPlayers || []) {
      const clanTag = ep.playerData?.clan?.tag ?? '__none__';
      if (!map.has(clanTag)) map.set(clanTag, []);
      map.get(clanTag)!.push(ep);
    }
    return map;
  }, [member.enrichedPlayers]);

  const bestTH = useMemo(() => {
    return (member.enrichedPlayers || []).reduce(
      (b, ep) => Math.max(b, ep.playerData?.townHallLevel ?? 0),
      member.linkedPlayerData?.townHallLevel ?? 0
    );
  }, [member.enrichedPlayers, member.linkedPlayerData]);

  const totalPlayers = (member.enrichedPlayers || []).length;
  const hasPlayers = totalPlayers > 0;
  const hasBotClans = member._source === 'bot' && (member.userClans || []).length > 0;

  // Border color per source
  const borderAccent = isDashboard
    ? 'border-l-indigo-400 dark:border-l-indigo-500'
    : 'border-l-emerald-400 dark:border-l-emerald-500';

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-l-[3px] ${borderAccent} overflow-hidden transition-all duration-200 hover:shadow-md hover:shadow-slate-200/60 dark:hover:shadow-slate-900/60`}>
      {/* Member header — clickable to expand/collapse */}
      <button
        className="w-full flex items-center gap-3 p-3 border-b border-slate-100 dark:border-slate-700/60 text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
        onClick={() => setExpanded()}
        aria-expanded={expanded}
      >
        {/* Avatar: initials with TH overlay */}
        <div className="relative flex-shrink-0">
          <MemberInitials name={displayName} />
          {bestTH > 0 && (
            <div className="absolute -bottom-1.5 -right-1.5">
              <THIcon level={bestTH} size="sm" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-900 dark:text-white text-sm">{displayName}</span>
            {member.isAdmin && (
              <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-bold uppercase">
                <Crown size={9} /> Admin
              </span>
            )}
            {isDashboard ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full font-bold uppercase">
                <User size={9} /> Dashboard
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold uppercase">
                <Bot size={9} /> WA
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {member.phone && <p className="text-slate-400 text-xs font-mono">{member.phone}</p>}
            {isDashboard && (member.roles || []).length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {(member.roles || []).map((r) => <RoleBadge key={r} role={r} />)}
              </div>
            )}
          </div>
        </div>

        {/* Right side: player count + expand caret */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasPlayers ? (
            <span className="flex items-center gap-1 text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-700">
              <CheckCircle size={11} /> {totalPlayers}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700">
              <XCircle size={11} /> 0
            </span>
          )}
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight size={14} className="text-slate-400" />
          </motion.div>
        </div>
      </button>

      {/* Expandable player body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-2">
              {hasPlayers ? (
                Array.from(playersByClan.entries()).map(([clanTag, players]) => (
                  <ClanSection
                    key={clanTag}
                    clanTag={clanTag === '__none__' ? null : clanTag}
                    clanInfo={clanTag !== '__none__' ? clanInfoMap[clanTag] : undefined}
                    players={players}
                    onPlayerClick={onPlayerClick}
                  />
                ))
              ) : hasBotClans ? (
                <div className="space-y-1 px-1 py-1">
                  {(member.userClans || []).map((c) => {
                    const info = clanInfoMap[c.clanTag];
                    return (
                      <div key={c.clanTag} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                        {info?.badgeUrl ? (
                          <Image src={info.badgeUrl} alt="clan" width={20} height={20} unoptimized className="object-contain flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                            <Shield size={11} className="text-slate-400" />
                          </div>
                        )}
                        <span className="font-medium truncate flex-1">{info?.name || c.clanTag}</span>
                        <span className="text-slate-400 text-[10px] font-mono hidden xs:block">{c.clanTag}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center py-4 gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <User size={16} className="text-slate-400" />
                  </div>
                  <p className="text-slate-400 dark:text-slate-500 text-xs">No CoC account linked</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

const TH_OPTIONS = [
  { label: 'Any TH', value: 0 },
  { label: 'TH6+', value: 6 },
  { label: 'TH9+', value: 9 },
  { label: 'TH11+', value: 11 },
  { label: 'TH13+', value: 13 },
  { label: 'TH15+', value: 15 },
  { label: 'TH16+', value: 16 },
  { label: 'TH17+', value: 17 },
];

function FilterBar({
  filter,
  onChange,
  onClear,
}: {
  filter: FilterState;
  onChange: (f: Partial<FilterState>) => void;
  onClear: () => void;
}) {
  const activeCount = [
    !!filter.search,
    filter.source !== 'all',
    filter.status !== 'all',
    filter.adminOnly,
    filter.thMin > 0,
  ].filter(Boolean).length;

  return (
    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
      {/* Search row */}
      <div className="relative px-3 pt-3 pb-2">
        <Search size={14} className="absolute left-6 top-1/2 mt-0.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search name, phone, tag, clan…"
          value={filter.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="w-full pl-8 pr-8 py-2 rounded-xl text-sm
            bg-slate-50 dark:bg-slate-700/60
            border border-slate-200 dark:border-slate-600
            text-slate-900 dark:text-white placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-indigo-500/60
            transition"
        />
        {filter.search && (
          <button
            onClick={() => onChange({ search: '' })}
            className="absolute right-6 top-1/2 mt-0.5 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Chip row — horizontally scrollable on mobile */}
      <div className="px-3 pb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none snap-x">

          {/* Source group */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 flex-shrink-0 snap-start text-xs">
            {(['all', 'dashboard', 'bot'] as const).map((v) => (
              <button
                key={v}
                onClick={() => onChange({ source: v })}
                className={`px-3 py-1.5 font-semibold transition-colors whitespace-nowrap ${
                  filter.source === v
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {v === 'bot' ? '📱 WA' : v === 'dashboard' ? '💻 Dashboard' : 'All'}
              </button>
            ))}
          </div>

          {/* Status group */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 flex-shrink-0 snap-start text-xs">
            {(['all', 'linked', 'unlinked'] as const).map((v) => (
              <button
                key={v}
                onClick={() => onChange({ status: v })}
                className={`px-3 py-1.5 font-semibold transition-colors capitalize whitespace-nowrap ${
                  filter.status === v
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {v === 'linked' ? '✓ Linked' : v === 'unlinked' ? '✗ Unlinked' : 'All'}
              </button>
            ))}
          </div>

          {/* Admin chip */}
          <button
            onClick={() => onChange({ adminOnly: !filter.adminOnly })}
            className={`flex-shrink-0 snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap ${
              filter.adminOnly
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Crown size={11} /> Admins
          </button>

          {/* TH filter */}
          <select
            value={filter.thMin}
            onChange={(e) => onChange({ thMin: Number(e.target.value) })}
            className={`flex-shrink-0 snap-start text-xs px-3 py-1.5 rounded-xl border font-semibold
              bg-white dark:bg-slate-700
              text-slate-700 dark:text-slate-200
              focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition
              ${
                filter.thMin > 0
                  ? 'border-indigo-400 text-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-600'
              }`}
          >
            {TH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Clear with active badge */}
          {activeCount > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={onClear}
              className="flex-shrink-0 snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400
                border border-red-200 dark:border-red-700
                hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors whitespace-nowrap"
            >
              <X size={11} /> Clear
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {activeCount}
              </span>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── OTP Panel ────────────────────────────────────────────────────────────────

function OtpPanel({ chatID }: { chatID: string }) {
  const [otpState, setOtpState] = useState<{ otp?: string; expiresAt?: string; error?: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    setOtpState(null);
    try {
      const res: any = await apiGenerateGroupOtp(chatID);
      setOtpState({ otp: res.otp ?? res.token, expiresAt: res.expiresAt });
    } catch (e: any) {
      setOtpState({ error: e.message || 'Failed to generate OTP' });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <KeyRound size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">Group Not Verified</p>
          <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
            Generate an OTP and use{' '}
            <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">!cwlotp</code>{' '}
            in the WhatsApp group to verify it.
          </p>
        </div>
      </div>
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-60"
      >
        {generating ? 'Generating…' : 'Generate OTP'}
      </button>
      {otpState?.otp && (
        <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-slate-500 mb-1">Your OTP (valid ~10 min)</p>
          <p className="font-mono text-2xl font-bold text-indigo-600 tracking-widest">{otpState.otp}</p>
          {otpState.expiresAt && (
            <p className="text-xs text-slate-400 mt-1">Expires: {new Date(otpState.expiresAt).toLocaleTimeString()}</p>
          )}
        </div>
      )}
      {otpState?.error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{otpState.error}</p>
      )}
    </div>
  );
}

// ─── UnverifiedMembersGrid ────────────────────────────────────────────────────
// Accordion grid for members in an unverified group (no session tab)

function UnverifiedMembersGrid({
  members,
  totalCount,
  clanInfoMap,
  onPlayerClick,
}: {
  members: GroupMember[];
  totalCount: number;
  clanInfoMap: Record<string, ClanInfo>;
  onPlayerClick: (tag: string, data: PlayerData | null) => void;
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (members.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
        <Search size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 text-sm font-semibold">No members match the filters</p>
      </div>
    );
  }

  return (
    <>
      {members.length !== totalCount && (
        <p className="text-xs text-slate-500 mb-2">
          Showing <span className="font-semibold text-indigo-600">{members.length}</span> of {totalCount} members
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence initial={false}>
          {members.map((member, idx) => {
            const k = member.phone || member._id || member.displayName || String(idx);
            return (
              <motion.div
                key={k}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18, delay: Math.min(idx * 0.035, 0.28) }}
                layout
              >
                <MemberCard
                  member={member}
                  clanInfoMap={clanInfoMap}
                  onPlayerClick={onPlayerClick}
                  expanded={expandedKey === k}
                  onToggle={() => setExpandedKey((prev) => (prev === k ? null : k))}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}

// ─── GroupTabbedView ──────────────────────────────────────────────────────────

function GroupTabbedView({
  group,
  clanInfoMap,
  filter,
  filterMembers,
  onPlayerClick,
}: {
  group: GroupData;
  clanInfoMap: Record<string, ClanInfo>;
  filter: FilterState;
  filterMembers: (members: GroupMember[]) => GroupMember[];
  onPlayerClick: (tag: string, data: PlayerData | null) => void;
}) {
  const [tab, setTab] = useState<'members' | 'session'>('members');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const filtered = useMemo(() => filterMembers(group.resolvedMembers), [group.resolvedMembers, filter]);

  return (
    <div className="space-y-4">
      {/* Pill tab bar */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-1 w-fit shadow-inner">
        {(['members', 'session'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative px-4 py-2 rounded-xl text-xs font-bold transition-colors"
          >
            {tab === t && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-white dark:bg-slate-700 rounded-xl shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className={`relative z-10 transition-colors ${
              tab === t
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              {t === 'members' ? `👥 Members (${filtered.length})` : '⚔️ CWL Session'}
            </span>
          </button>
        ))}
      </div>

      {/* Animated tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: tab === 'members' ? -12 : 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: tab === 'members' ? 12 : -12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {tab === 'members' && (
            <>
              {filtered.length !== group.resolvedMembers.length && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Showing <span className="font-semibold text-indigo-600 dark:text-indigo-400">{filtered.length}</span> of {group.resolvedMembers.length} members
                </p>
              )}
              {filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700"
                >
                  <Search size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No members match the filters</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try adjusting your search or clearing filters</p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <AnimatePresence initial={false}>
                    {filtered.map((member, idx) => (
                      <motion.div
                        key={member.phone || member._id || member.displayName}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.18, delay: Math.min(idx * 0.035, 0.28) }}
                        layout
                      >
                        <MemberCard
                          member={member}
                          clanInfoMap={clanInfoMap}
                          onPlayerClick={onPlayerClick}
                          expanded={expandedKey === (member.phone || member._id || member.displayName)}
                          onToggle={() => {
                            const k = member.phone || member._id || member.displayName || '';
                            setExpandedKey((prev) => (prev === k ? null : k));
                          }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}

          {tab === 'session' && (
            <GroupSessionPanel
              chatID={group.chatID}
              resolvedMembers={group.resolvedMembers}
              clanInfoMap={clanInfoMap}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyGroupPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [clanInfoMap, setClanInfoMap] = useState<Record<string, ClanInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [playerModal, setPlayerModal] = useState<{ tag: string; initial: PlayerData | null } | null>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiGetMyGroup();
      setGroups(res.groups ?? []);
      setClanInfoMap(res.clanInfoMap ?? {});
    } catch (e: any) {
      setError(e.message || 'Failed to load group data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const updateFilter = useCallback((partial: Partial<FilterState>) => {
    setFilter((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearFilter = useCallback(() => setFilter(DEFAULT_FILTER), []);

  function filterMembers(members: GroupMember[]): GroupMember[] {
    return members.filter((m) => {
      if (filter.source === 'dashboard' && m._source === 'bot') return false;
      if (filter.source === 'bot' && !m._source) return false;
      if (filter.status === 'linked' && (m.enrichedPlayers || []).length === 0) return false;
      if (filter.status === 'unlinked' && (m.enrichedPlayers || []).length > 0) return false;
      if (filter.adminOnly && !m.isAdmin) return false;
      if (filter.thMin > 0) {
        const best = (m.enrichedPlayers || []).reduce(
          (b, ep) => Math.max(b, ep.playerData?.townHallLevel ?? 0),
          m.linkedPlayerData?.townHallLevel ?? 0
        );
        if (best < filter.thMin) return false;
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const name = (m.displayName || m.name || m.phone || '').toLowerCase();
        const phone = (m.phone || '').toLowerCase();
        const tags = (m.enrichedPlayers || []).map((ep) => ep.playerTag.toLowerCase()).join(' ');
        const pnames = (m.enrichedPlayers || []).map((ep) => ep.playerData?.name?.toLowerCase() || '').join(' ');
        const clans = (m.enrichedPlayers || []).map((ep) => (ep.playerData?.clan?.name || '').toLowerCase()).join(' ');
        const clanTags = (m.userClans || []).map((c) => c.clanTag.toLowerCase()).join(' ');
        if (![name, phone, tags, pnames, clans, clanTags].some((s) => s.includes(q))) return false;
      }
      return true;
    });
  }

  const onPlayerClick = useCallback((tag: string, data: PlayerData | null) => {
    setPlayerModal({ tag, initial: data });
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-28 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            <div className="h-4 w-52 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
        {/* Filter skeleton */}
        <div className="h-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl animate-pulse" />
        {/* Card skeletons */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2 animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0,1,2].map(j => <div key={j} className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-12 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={loadGroups} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
          Retry
        </button>
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="max-w-sm mx-auto mt-12 text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4">
          <Users size={36} className="text-indigo-400 dark:text-indigo-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">No Group Linked Yet</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Send{' '}
          <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono font-medium">
            !cwlotp
          </code>{' '}
          in your WhatsApp group — then use the OTP in this dashboard to verify and link it.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
      {/* ─── Page header ─── */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-none">
            My Group
          </h1>
          <p className="text-sm text-slate-500 mt-1 truncate">
            {groups.length === 1
              ? (groups[0].displayTitle || groups[0].botChatName || groups[0].title || groups[0].chatID)
              : `${groups.length} WhatsApp group${groups.length !== 1 ? 's' : ''} linked`}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadGroups}
          className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors shadow-sm"
          title="Refresh"
        >
          <RefreshCw size={15} />
          <span className="hidden sm:inline">Refresh</span>
        </motion.button>
      </div>

      {/* ─── Desktop layout: sidebar filter + content ─── */}
      <div className="flex flex-col lg:flex-row lg:gap-6 lg:items-start">

        {/* Filter panel — sticky sidebar on desktop, top bar on mobile */}
        <aside className="lg:w-72 lg:flex-shrink-0 mb-4 lg:mb-0 lg:sticky lg:top-[72px]">
          <FilterBar filter={filter} onChange={updateFilter} onClear={clearFilter} />
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {groups.map((group) => {
            const displayTitle = group.displayTitle || group.botChatName || group.title || group.chatID;
            const linkedCount = group.resolvedMembers.filter(m => (m.enrichedPlayers || []).length > 0).length;

            return (
              <div key={group.chatID} className="space-y-4">
                {/* Group header card */}
                <div className={`rounded-2xl overflow-hidden shadow-sm ${
                  group.isVerified
                    ? 'border-2 border-indigo-100'
                    : 'border-2 border-amber-100'
                }`}>
                  {/* Gradient banner */}
                  <div className={`px-5 py-4 ${
                    group.isVerified
                      ? 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700'
                      : 'bg-gradient-to-br from-amber-500 to-orange-600'
                  } relative overflow-hidden`}>
                    {/* Decorative circle */}
                    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
                    <div className="relative flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-bold text-white text-lg sm:text-xl leading-tight truncate">{displayTitle}</h2>
                          {group.isVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-white/25 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide flex-shrink-0">
                              <CheckCircle size={9} /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-white/25 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide flex-shrink-0">
                              <XCircle size={9} /> Unverified
                            </span>
                          )}
                        </div>
                        <code className="text-xs font-mono text-white/60 mt-1 block select-all">{group.chatID}</code>
                      </div>
                    </div>
                  </div>
                  {/* Stats strip */}
                  <div className="flex bg-white border-t border-slate-100">
                    {[
                      { label: 'WA Members', value: group.totalParticipants, color: 'text-indigo-600' },
                      { label: 'Tracked',    value: group.resolvedMembers.length, color: 'text-slate-800' },
                      { label: 'CoC Linked', value: linkedCount, color: 'text-emerald-600' },
                    ].map(({ label, value, color }, i) => (
                      <div key={label} className={`flex-1 px-4 py-3 text-center ${i > 0 ? 'border-l border-slate-100' : ''}`}>
                        <p className={`text-xl font-bold leading-none ${color}`}>{value}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* OTP panel if unverified */}
                {!group.isVerified && <OtpPanel chatID={group.chatID} />}

                {/* Tab switcher for verified groups */}
                {group.isVerified && (
                  <GroupTabbedView
                    group={group}
                    clanInfoMap={clanInfoMap}
                    filter={filter}
                    filterMembers={filterMembers}
                    onPlayerClick={onPlayerClick}
                  />
                )}

                {/* Member cards for unverified groups (no session tab) */}
                {!group.isVerified && (
                  <UnverifiedMembersGrid
                    members={filterMembers(group.resolvedMembers)}
                    totalCount={group.resolvedMembers.length}
                    clanInfoMap={clanInfoMap}
                    onPlayerClick={onPlayerClick}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Player modal */}
      <AnimatePresence>
        {playerModal && (
          <PlayerModal
            key={playerModal.tag}
            tag={playerModal.tag}
            initial={playerModal.initial}
            onClose={() => setPlayerModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
