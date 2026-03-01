'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronLeft, Users, Shield, Trophy,
  Calendar, Clock, CheckCircle2, XCircle, AlertCircle,
  Sword, RefreshCw, ChevronDown, ChevronUp, User, Download,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  apiListSessions, apiGetSessionDetail,
  apiReopenSession, apiCloseSession, apiGetMyCwlRegistration, apiGetClanInfo,
} from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toPng } from 'html-to-image';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function THIcon({ level }: { level: number }) {
  const th = Math.max(1, Math.min(level || 1, 18));
  return (
    <img
      src={`/townhalls/th-${th}.png`}
      alt={`TH${th}`}
      className="w-9 h-9 object-contain flex-shrink-0"
    />
  );
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(d: string | null | undefined) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  open:     { label: 'Open',     dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  closed:   { label: 'Closed',   dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-600 border border-slate-200' },
  archived: { label: 'Archived', dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-700 border border-blue-200' },
};
const scfg = (s: string) => STATUS_CONFIG[s] ?? STATUS_CONFIG.closed;

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({ session, onClick }: { session: any; onClick?: () => void }) {
  const cfg = scfg(session.status);
  const regs = session.registrations?.length ?? 0;
  const assigns = session.assignments?.length ?? 0;
  const assignPct = regs > 0 ? Math.round((assigns / regs) * 100) : 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { scale: 1.015, boxShadow: '0 4px 24px 0 rgba(99,102,241,0.10)' } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={!onClick}
      className={`w-full text-left bg-white rounded-2xl border border-slate-200 p-5 transition-all duration-150 focus:outline-none ${
        onClick ? 'hover:border-indigo-300 cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <p className="font-bold text-slate-800 text-sm leading-tight truncate">
            {session.chatID?.replace('@g.us', '') ?? session._id?.slice(-8)}
          </p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{session._id?.slice(-10)}</p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <strong className="text-slate-800 font-semibold">{regs}</strong> registered
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <strong className="text-emerald-700 font-semibold">{assigns}</strong> assigned
        </span>
      </div>

      {regs > 0 && (
        <div className="mb-3">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${assignPct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{assignPct}% assigned</p>
        </div>
      )}

      <p className="text-[11px] text-slate-400 flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        {fmtDate(session.createdAt ?? session.startedAt)}
      </p>
    </motion.button>
  );
}

// ─── Player Registration Card ─────────────────────────────────────────────────

function PlayerCard({
  reg, assignment, clanInfoMap, sessionStatus, clanList, onAssign, onUnassign,
}: {
  reg: any;
  assignment: any;
  clanInfoMap: Record<string, any>;
  sessionStatus: string;
  clanList: string[];
  onAssign: (playerTag: string, userPhone: string, clanTag: string) => Promise<void>;
  onUnassign: (playerTag: string, userPhone: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const pd = reg.playerData;
  const th = pd?.townHallLevel ?? 0;
  const assignedClan = assignment ? clanInfoMap[assignment.clanTag] : null;

  const handleAssign = async (clanTag: string) => {
    setAssigning(true);
    try { await onAssign(reg.playerTag, reg.userPhone, clanTag); setOpen(false); }
    finally { setAssigning(false); }
  };

  const handleUnassign = async () => {
    setAssigning(true);
    try { await onUnassign(reg.playerTag, reg.userPhone); setOpen(false); }
    finally { setAssigning(false); }
  };

  const canAssign = sessionStatus === 'open' && clanList.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-indigo-200 transition-colors">
      <div
        className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${canAssign ? 'cursor-pointer hover:bg-slate-50' : ''}`}
        onClick={() => canAssign && setOpen(v => !v)}
      >
        {th > 0 ? <THIcon level={th} /> : (
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-slate-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate leading-tight">
            {pd?.name ?? reg.displayName ?? reg.userPhone}
          </p>
          <p className="text-[10px] text-slate-400 font-mono leading-tight">{reg.playerTag}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {pd?.trophies != null && (
            <span className="text-xs text-amber-500 font-semibold hidden sm:flex items-center gap-0.5">
              <Trophy className="w-3 h-3" />{pd.trophies.toLocaleString()}
            </span>
          )}
          {assignedClan?.badgeUrl
            ? <img src={assignedClan.badgeUrl} alt={assignedClan.name} className="w-6 h-6 object-contain" />
            : assignment
              ? <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-mono">{assignment.clanTag}</span>
              : <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">unassigned</span>
          }
          {canAssign && (open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />)}
        </div>
      </div>

      <AnimatePresence>
        {open && canAssign && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-slate-100"
          >
            <div className="bg-slate-50 px-3 py-2 flex items-center gap-2 flex-wrap">
              {assigning ? (
                <span className="text-xs text-slate-400 flex items-center gap-1"><LoadingSpinner size="sm" /> assigning…</span>
              ) : <>
                {assignment && (
                  <button
                    onClick={handleUnassign}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Unassign
                  </button>
                )}
                {clanList.map((tag) => {
                const ci = clanInfoMap[tag];
                const isActive = assignment?.clanTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => handleAssign(tag)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isActive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    {ci?.badgeUrl && <img src={ci.badgeUrl} alt="" className="w-4 h-4 object-contain" />}
                    <span className="truncate max-w-[80px]">{ci?.name ?? tag}</span>
                  </button>
                );
              })}
              </>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Clan Column (Board view) ─────────────────────────────────────────────────

function ClanColumn({ clanTag, clanInfo, players }: { clanTag: string; clanInfo: any; players: any[] }) {
  return (
    <div className="flex-shrink-0 w-56 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center gap-2.5">
        {clanInfo?.badgeUrl ? (
          <img src={clanInfo.badgeUrl} alt={clanInfo.name} className="w-9 h-9 object-contain" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{clanInfo?.name ?? clanTag}</p>
          <p className="text-[10px] text-slate-400">{players.length} player{players.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="p-2 space-y-1.5 max-h-[480px] overflow-y-auto">
        {players.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-4">No players</p>
        ) : players.map((p: any) => {
          const pd = p.playerData;
          const th = pd?.townHallLevel ?? 0;
          return (
            <div key={p.playerTag} className="flex items-center gap-2 bg-white rounded-lg border border-slate-100 px-2.5 py-2">
              {th > 0 ? <THIcon level={th} /> : (
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
                  {pd?.name ?? p.displayName ?? p.userPhone}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">{p.playerTag}</p>
                {pd?.trophies != null && (
                  <p className="text-[10px] text-amber-500 flex items-center gap-0.5 mt-0.5">
                    <Trophy className="w-2.5 h-2.5" />{pd.trophies.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Session Detail ───────────────────────────────────────────────────────────

function SessionDetail({ sessionId, isAdmin, onBack }: { sessionId: string; isAdmin: boolean; onBack: () => void }) {
  const [session, setSession] = useState<any>(null);
  const [clanInfoMap, setClanInfoMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const loadDetail = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiGetSessionDetail(sessionId);
      const s = res.session;
      setSession(s);
      const tags = new Set<string>([
        ...(s.clanList ?? []),
        ...(s.assignments ?? []).map((a: any) => a.clanTag),
        ...(s.registrations ?? []).flatMap((r: any) => r.userClanTags || []),
      ]);
      const infoMap: Record<string, any> = {};
      await Promise.allSettled([...tags].map(async (tag) => {
        const ci = await apiGetClanInfo(tag).catch(() => null);
        if (ci) infoMap[tag] = ci;
      }));
      setClanInfoMap(infoMap);
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDetail(); }, [sessionId]); // eslint-disable-line

  const handleAssign = async (playerTag: string, userPhone: string, clanTag: string) => {
    const { apiAdminAssignPlayer } = await import('@/lib/api');
    await apiAdminAssignPlayer(sessionId, userPhone, clanTag, playerTag);
    await loadDetail();
  };

  const handleUnassign = async (playerTag: string, userPhone: string) => {
    const { apiAdminUnassignPlayer } = await import('@/lib/api');
    await apiAdminUnassignPlayer(sessionId, userPhone, playerTag);
    await loadDetail();
  };

  const handleToggleStatus = async () => {
    setActionLoading(true);
    try {
      if (session?.status === 'open') await apiCloseSession(sessionId);
      else await apiReopenSession(sessionId);
      await loadDetail();
    } finally { setActionLoading(false); }
  };

  const handleExport = useCallback(async () => {
    if (!exportRef.current || !session) return;
    setExporting(true);
    // Replace external img src with server-side proxy to avoid CORS
    const imgs = Array.from(exportRef.current.querySelectorAll<HTMLImageElement>('img'));
    const origSrcs = imgs.map((img) => img.src);
    imgs.forEach((img) => {
      if (img.src.startsWith('http') && !img.src.startsWith(window.location.origin)) {
        img.src = `/api/proxy-image?url=${encodeURIComponent(img.src)}`;
      }
    });
    // Small delay to let images reload via proxy
    await new Promise((r) => setTimeout(r, 600));
    try {
      const dataUrl = await toPng(exportRef.current, { cacheBust: true, pixelRatio: 2, skipFonts: true });
      const link = document.createElement('a');
      const chatId = session.chatID?.replace('@g.us', '') ?? sessionId.slice(-10);
      link.download = `cwl-${chatId}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      // Restore original srcs
      imgs.forEach((img, i) => { img.src = origSrcs[i]; });
      setExporting(false);
    }
  }, [session, sessionId]);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>;
  if (loadError) return (
    <div className="text-center py-16 text-slate-400">
      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-300" />
      <p className="font-medium text-slate-600">{loadError}</p>
      <button onClick={onBack} className="mt-4 text-sm text-indigo-500 hover:underline flex items-center gap-1 mx-auto">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to sessions
      </button>
    </div>
  );
  if (!session) return (
    <div className="text-center py-16 text-slate-400">
      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
      <p>Session not found</p>
    </div>
  );

  const regs: any[] = session.registrations ?? [];
  const assignments: any[] = session.assignments ?? [];
  const clanList: string[] = session.clanList ?? [];
  // Full list for assign dropdown: session clans + every registered user's linked clans
  const assignClanList: string[] = [...new Set([
    ...clanList,
    ...regs.flatMap((r: any) => r.userClanTags || []),
  ])];
  const assignmentByTag = new Map<string, any>();
  for (const a of assignments) if (a.playerTag) assignmentByTag.set(a.playerTag, a);
  const assignedCount = regs.filter((r) => assignmentByTag.has(r.playerTag)).length;
  const cfg = scfg(session.status);

  // Board: clan → players
  const byClan = new Map<string, any[]>();
  for (const tag of clanList) byClan.set(tag, []);
  const unassigned: any[] = [];
  for (const r of regs) {
    const a = assignmentByTag.get(r.playerTag);
    if (a) {
      if (!byClan.has(a.clanTag)) byClan.set(a.clanTag, []);
      byClan.get(a.clanTag)!.push(r);
    } else {
      unassigned.push(r);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      {/* Breadcrumb + action */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={onBack} className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-medium transition-colors">
            <ChevronLeft className="w-4 h-4" /> Sessions
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600 font-mono">{session.chatID?.replace('@g.us', '') ?? sessionId.slice(-10)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
          >
            {exporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {exporting ? 'Exporting…' : 'Export PNG'}
          </button>
          {isAdmin && (
            <button
              onClick={handleToggleStatus}
              disabled={actionLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${
                session.status === 'open'
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {actionLoading
                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                : session.status === 'open'
                  ? <><XCircle className="w-3.5 h-3.5" /> Close Session</>
                  : <><CheckCircle2 className="w-3.5 h-3.5" /> Reopen Session</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Exportable content */}
      <div ref={exportRef} className="space-y-5">

      {/* Session info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sword className="w-4 h-4 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-900">CWL Session</h2>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
        </div>
        <p className="text-[11px] text-slate-400 font-mono mb-4">{session._id}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {[
            { label: 'Registered', value: regs.length,                 color: 'text-slate-800',   icon: <Users className="w-3.5 h-3.5 text-slate-400" /> },
            { label: 'Assigned',   value: assignedCount,               color: 'text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> },
            { label: 'Unassigned', value: regs.length - assignedCount, color: 'text-amber-600',   icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> },
            { label: 'Clans',      value: clanList.length,             color: 'text-indigo-700',  icon: <Shield className="w-3.5 h-3.5 text-indigo-400" /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="bg-slate-50 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
              {icon}
              <div>
                <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          {session.startedBy && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> <span className="font-mono text-slate-600">{session.startedBy}</span></span>}
          {session.startedAt && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {fmtDate(session.startedAt)} {fmtTime(session.startedAt)}</span>}
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">View:</span>
        {(['board', 'list'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
              view === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Board view */}
      {view === 'board' && (
        <div className="w-full overflow-x-auto pb-3">
          <div className="flex gap-4" style={{ minWidth: `max-content` }}>
            {[...byClan.entries()].map(([clanTag, players]) => (
              <ClanColumn key={clanTag} clanTag={clanTag} clanInfo={clanInfoMap[clanTag]} players={players} />
            ))}
            {unassigned.length > 0 && (
              <div className="flex-shrink-0 w-56 bg-amber-50 rounded-2xl border border-amber-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-amber-200 bg-white flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Unassigned</p>
                    <p className="text-[10px] text-slate-400">{unassigned.length} player{unassigned.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="p-2 space-y-1.5 max-h-[480px] overflow-y-auto">
                  {unassigned.map((p: any) => {
                    const pd = p.playerData; const th = pd?.townHallLevel ?? 0;
                    return (
                      <div key={p.playerTag} className="flex items-center gap-2 bg-white rounded-lg border border-amber-100 px-2.5 py-2">
                        {th > 0 ? <THIcon level={th} /> : (
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{pd?.name ?? p.displayName ?? p.userPhone}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{p.playerTag}</p>
                          {pd?.trophies != null && (
                            <p className="text-[10px] text-amber-500 flex items-center gap-0.5 mt-0.5">
                              <Trophy className="w-2.5 h-2.5" />{pd.trophies.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" /> All Registrations
          </p>
          {regs.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 py-10 text-center text-slate-400 text-sm">
              No registrations yet
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {regs.map((reg) => (
                <PlayerCard
                  key={reg.playerTag}
                  reg={reg}
                  assignment={assignmentByTag.get(reg.playerTag) ?? null}
                  clanInfoMap={clanInfoMap}
                  sessionStatus={session.status}
                  clanList={assignClanList}
                  onAssign={handleAssign}
                  onUnassign={handleUnassign}
                />
              ))}
            </div>
          )}
        </div>
      )}
      </div>{/* /exportRef */}
    </motion.div>
  );
}

// ─── My Registration Banner ───────────────────────────────────────────────────

function MyRegistrationBanner({ registration }: { registration: any }) {
  const session = registration.session;
  if (!session) return null;
  const regs: any[] = registration.registrations ?? [];
  const cfg = scfg(session.status);
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-2xl p-5 text-white">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-bold text-base flex items-center gap-2">
            <Sword className="w-4 h-4 text-indigo-200" /> My CWL Registration
          </h2>
          <p className="text-indigo-200 text-xs mt-0.5">{session.chatID?.replace('@g.us', '')}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>{cfg.label}</span>
      </div>
      {regs.length > 0 ? (
        <div className="space-y-2">
          {regs.map((r: any) => (
            <div key={r.playerTag} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <p className="font-mono text-xs text-indigo-100 flex-1">{r.playerTag}</p>
              {(session.assignments ?? []).find((a: any) => a.playerTag === r.playerTag)
                ? <span className="text-[10px] bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full">assigned</span>
                : <span className="text-[10px] bg-white/10 text-indigo-200 px-2 py-0.5 rounded-full">pending</span>
              }
            </div>
          ))}
        </div>
      ) : (
        <p className="text-indigo-200 text-sm">No registrations in this session yet.</p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CWLPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('superadmin');

  const [sessions, setSessions] = useState<any[]>([]);
  const [myRegistration, setMyRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isAdmin) {
          const res = await apiListSessions({ limit: 100 });
          setSessions(res.sessions || res.data || []);
        } else {
          const myRes = await apiGetMyCwlRegistration().catch(() => null);
          if (myRes?.session) {
            setSessions([myRes.session]);
            setMyRegistration(myRes);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    if (user !== undefined) load();
  }, [user, isAdmin]); // eslint-disable-line

  const filtered = useMemo(() => sessions.filter((s) => {
    const ms = statusFilter === 'all' || s.status === statusFilter;
    const mq = !search || s.chatID?.toLowerCase().includes(search.toLowerCase()) || s._id?.toLowerCase().includes(search.toLowerCase());
    return ms && mq;
  }), [sessions, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: sessions.length };
    for (const s of sessions) c[s.status] = (c[s.status] ?? 0) + 1;
    return c;
  }, [sessions]);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>;

  if (selectedId && isAdmin) {
    return (
      <div className="max-w-7xl mx-auto">
        <SessionDetail sessionId={selectedId} isAdmin={!!isAdmin} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Sword className="w-5 h-5 text-indigo-500" /> CWL Sessions
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Clan War League registrations &amp; assignments</p>
      </div>

      {!isAdmin && myRegistration && <MyRegistrationBanner registration={myRegistration} />}

      {isAdmin && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search group or session ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(['all', 'open', 'closed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {s === 'all' ? 'All' : s}
                {statusCounts[s] != null && (
                  <span className={`ml-1.5 text-[10px] font-bold px-1 py-0.5 rounded-full ${
                    statusFilter === s ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-500'
                  }`}>{statusCounts[s]}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Calendar className="w-10 h-10 text-slate-300 mb-3" />
          <p className="font-medium">No sessions found</p>
          {!isAdmin && <p className="text-sm mt-1">No active CWL session for your group yet</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((session) => (
            <SessionCard key={session._id} session={session} onClick={isAdmin ? () => setSelectedId(session._id) : undefined} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
