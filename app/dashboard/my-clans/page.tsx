'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Trash2, Users, Shield, ChevronLeft, Search,
  Trophy, Crown, Swords, RefreshCw, Bot, LayoutDashboard,
  Sword, Clock, Star, AlertTriangle, MessageSquare, CheckCircle, XCircle,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  apiGetUserClans, apiAddUserClan, apiRemoveUserClan, apiSyncUserClans,
  apiGetClanLive, apiGetClanWar,
  apiGetLinkedPlayers, apiGetMyGroup,
} from '@/lib/api';

// ── Constants ────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  leader:   'bg-red-100 text-red-700',
  coLeader: 'bg-orange-100 text-orange-700',
  admin:    'bg-amber-100 text-amber-700',
  member:   'bg-slate-100 text-slate-600',
};

const ROLE_LABEL: Record<string, string> = {
  leader: 'Leader', coLeader: 'Co-Leader', admin: 'Elder', member: 'Member',
};

const WAR_STATE_BADGE: Record<string, string> = {
  preparation: 'bg-amber-100 text-amber-700 border-amber-200',
  inWar:        'bg-red-100 text-red-700 border-red-200',
  warEnded:     'bg-slate-100 text-slate-600 border-slate-200',
};

const WAR_STATE_LABEL: Record<string, string> = {
  preparation: 'Preparation',
  inWar:        'War In Progress',
  warEnded:     'War Ended',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function THIcon({ level }: { level: number }) {
  const th = Math.max(1, Math.min(level || 1, 18));
  return (
    <img
      src={`/townhalls/th-${th}.png`}
      alt={`TH${th}`}
      title={`Town Hall ${th}`}
      className="w-8 h-8 object-contain flex-shrink-0"
    />
  );
}

function SourceBadge({ source }: { source?: string }) {
  if (source === 'bot') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
        <Bot className="w-2.5 h-2.5" /> WhatsApp
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
      <LayoutDashboard className="w-2.5 h-2.5" /> Dashboard
    </span>
  );
}

function WarCard({ war }: { war: any }) {
  const badgeClass = WAR_STATE_BADGE[war.state] || WAR_STATE_BADGE.warEnded;
  const label = WAR_STATE_LABEL[war.state] || war.state;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Sword className="w-4 h-4 text-red-500" /> Current War
        </h3>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
          {label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {/* Our clan */}
        <div className="space-y-1.5">
          {war.clan?.badgeUrl && (
            <img src={war.clan.badgeUrl} alt="badge" className="w-12 h-12 object-contain mx-auto" />
          )}
          <p className="font-semibold text-slate-800 text-xs leading-tight">{war.clan?.name}</p>
          <div className="flex items-center justify-center gap-1 text-amber-500 text-sm font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-500" /> {war.clan?.stars ?? 0}
          </div>
          <p className="text-xs text-slate-400">{(war.clan?.destructionPercentage ?? 0).toFixed(1)}%</p>
          <p className="text-xs text-slate-500">{typeof war.clan?.attacks === 'number' ? war.clan.attacks : (war.clan?.attacks?.length ?? 0)} attacks</p>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="text-slate-400 font-extrabold text-lg">VS</span>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {war.teamSize}v{war.teamSize}
          </span>
          {war.endTime && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400 mt-1">
              <Clock className="w-2.5 h-2.5" />
              {new Date(war.endTime).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Opponent */}
        <div className="space-y-1.5">
          {war.opponent?.badgeUrl && (
            <img src={war.opponent.badgeUrl} alt="badge" className="w-12 h-12 object-contain mx-auto" />
          )}
          <p className="font-semibold text-slate-800 text-xs leading-tight">{war.opponent?.name}</p>
          <div className="flex items-center justify-center gap-1 text-amber-500 text-sm font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-500" /> {war.opponent?.stars ?? 0}
          </div>
          <p className="text-xs text-slate-400">{(war.opponent?.destructionPercentage ?? 0).toFixed(1)}%</p>
          <p className="text-xs text-slate-500">{typeof war.opponent?.attacks === 'number' ? war.opponent.attacks : (war.opponent?.attacks?.length ?? 0)} attacks</p>
        </div>
      </div>
    </div>
  );
}

function ClanCard({
  clan,
  onView,
  onRemove,
}: {
  clan: any;
  onView: (tag: string) => void;
  onRemove: (tag: string) => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3 cursor-pointer hover:border-indigo-200 hover:shadow-sm transition-all"
      onClick={() => onView(clan.clanTag)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-slate-900 font-mono text-sm truncate">{clan.clanTag}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Added {new Date(clan.addedAt).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(clan.clanTag); }}
          className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 p-0.5"
          title="Remove clan"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <SourceBadge source={clan.source} />
        <span className="text-xs text-indigo-500 font-medium">View details →</span>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MyClansPage() {
  const [userClans, setUserClans]       = useState<any[]>([]);
  const [linkedPlayers, setLinkedPlayers] = useState<any[]>([]);
  const [myGroup, setMyGroup]           = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [syncing, setSyncing]           = useState(false);
  const [lastSynced, setLastSynced]     = useState<Date | null>(null);

  // Add clan modal
  const [showAdd, setShowAdd]               = useState(false);
  const [addTag, setAddTag]                 = useState('');
  const [saveToWhatsApp, setSaveToWhatsApp] = useState(false);
  const [addLoading, setAddLoading]         = useState(false);
  const [addError, setAddError]             = useState('');

  // Clan detail view
  const [selectedClan, setSelectedClan] = useState<string | null>(null);
  const [clashData, setClashData]       = useState<any | null>(null);
  const [warData, setWarData]           = useState<any | null>(null);
  const [warLoaded, setWarLoaded]       = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const loadData = async (doSync = false) => {
    if (doSync) setSyncing(true);
    else setLoading(true);
    try {
      if (doSync) {
        await apiSyncUserClans().catch((e: any) => console.warn('Sync failed (non-blocking):', e.message));
        setLastSynced(new Date());
      }
      const [clansRes, playersRes, groupRes] = await Promise.all([
        apiGetUserClans(),
        apiGetLinkedPlayers(),
        apiGetMyGroup().catch(() => null),
      ]);
      setUserClans(clansRes.userClans || []);
      setLinkedPlayers(playersRes.linkedPlayers || []);
      setMyGroup((groupRes as any)?.groups?.[0] ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => { loadData(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewClan = async (tag: string) => {
    setSelectedClan(tag);
    setClashData(null);
    setWarData(null);
    setWarLoaded(false);
    setDetailLoading(true);
    setMemberSearch('');
    try {
      const [clanRes, warRes] = await Promise.all([
        apiGetClanLive(tag).catch(() => null),
        apiGetClanWar(tag).catch(() => null),
      ]);
      setClashData(clanRes?.clan || null);
      setWarData(warRes?.war || null);
      setWarLoaded(true);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddClan = async () => {
    setAddLoading(true);
    setAddError('');
    try {
      const res = await apiAddUserClan(
        addTag.trim().toUpperCase(),
        saveToWhatsApp ? 'bot' : 'dashboard'
      );
      setUserClans(res.userClans || []);
      setShowAdd(false);
      setAddTag('');
      setSaveToWhatsApp(false);
    } catch (e: any) {
      setAddError(e.message || 'Failed to add clan');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveClan = async (tag: string) => {
    if (!confirm(`Remove ${tag} from your clans?`)) return;
    try {
      const res = await apiRemoveUserClan(tag);
      setUserClans(res.userClans || []);
    } catch (e: any) {
      alert(e.message || 'Failed to remove');
    }
  };

  const botClans  = userClans.filter((c) => c.source === 'bot');
  const dashClans = userClans.filter((c) => c.source !== 'bot');

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <LoadingSpinner />
        <p className="text-slate-400 text-sm">Syncing from WhatsApp…</p>
      </div>
    );
  }

  // ─── Detail View ───────────────────────────────────────────────────────────
  if (selectedClan) {
    const members = clashData?.memberList || [];
    const visibleMembers = members.filter(
      (m: any) =>
        !memberSearch ||
        m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.tag?.toLowerCase().includes(memberSearch.toLowerCase())
    );
    const leaders = members.filter(
      (m: any) => m.role === 'leader' || m.role === 'coLeader'
    );

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
        <button
          onClick={() => { setSelectedClan(null); setClashData(null); setWarData(null); }}
          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
            <ChevronLeft className="w-4 h-4" /> Back to My Profile
        </button>

        {detailLoading ? (
          <div className="flex items-center justify-center h-48"><LoadingSpinner /></div>
        ) : clashData ? (
          <>
            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4">
              {clashData.badgeUrl && (
                <img src={clashData.badgeUrl} alt="badge" className="w-20 h-20 object-contain flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-slate-900 truncate">{clashData.name}</h2>
                <p className="text-slate-400 text-xs font-mono mt-0.5">{selectedClan}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-sm">
                  <span className="flex items-center gap-1 text-slate-600">
                    <Users className="w-4 h-4" /> {clashData.memberCount ?? members.length ?? 0} / 50
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <Trophy className="w-3.5 h-3.5" /> {clashData.warWins ?? 0} wins
                  </span>
                  <span className="flex items-center gap-1 text-indigo-600">
                    <Shield className="w-3.5 h-3.5" /> Lvl {clashData.level ?? '?'}
                  </span>
                  {clashData.warLeague && clashData.warLeague !== 'Unranked' && (
                    <span className="flex items-center gap-1 text-violet-600 text-xs">
                      <Sword className="w-3.5 h-3.5" /> {clashData.warLeague}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* War */}
            {warLoaded && (warData ? <WarCard war={warData} /> : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-sm text-slate-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Not currently in a war, or war log is private.
              </div>
            ))}

            {/* Description */}
            {clashData.description && (
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 border border-slate-200">
                {clashData.description}
              </div>
            )}

            {/* Stats */}
            {(clashData.warLosses ?? 0) + (clashData.warTies ?? 0) > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Wins',   value: clashData.warWins   ?? 0, color: 'text-emerald-600' },
                  { label: 'Losses', value: clashData.warLosses ?? 0, color: 'text-red-500' },
                  { label: 'Draws',  value: clashData.warTies   ?? 0, color: 'text-slate-500' },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Leadership */}
            {leaders.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" /> Leadership
                </h3>
                <div className="divide-y divide-slate-100">
                  {leaders.map((m: any) => (
                    <div key={m.tag} className="flex items-center gap-3 py-2.5">
                      <THIcon level={m.townHallLevel || 1} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{m.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{m.tag}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {m.trophies > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-600 text-xs">
                            <Trophy className="w-3 h-3" /> {m.trophies.toLocaleString()}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[m.role] || ''}`}>
                          {ROLE_LABEL[m.role] || m.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members */}
            <div className="bg-white rounded-2xl border border-slate-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-semibold text-slate-800 text-sm">
                  All Members ({visibleMembers.length})
                </h3>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search…"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-44 pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="divide-y divide-slate-50 max-h-[520px] overflow-y-auto">
                {visibleMembers.map((m: any, idx: number) => (
                  <div key={m.tag} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <span className="text-xs text-slate-300 w-5 text-right flex-shrink-0">
                      {idx + 1}
                    </span>
                    <THIcon level={m.townHallLevel || 1} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{m.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{m.tag}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                      {m.trophies > 0 && (
                        <span className="hidden sm:flex items-center gap-0.5 text-amber-500">
                          <Trophy className="w-3 h-3" /> {m.trophies.toLocaleString()}
                        </span>
                      )}
                      {m.donations > 0 && (
                        <span className="hidden md:flex items-center gap-0.5 text-emerald-600">
                          ↑{m.donations}
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${ROLE_BADGE[m.role] || 'bg-slate-100 text-slate-600'}`}>
                        {ROLE_LABEL[m.role] || m.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p>Could not load clan data. Check the tag or try again.</p>
          </div>
        )}
      </motion.div>
    );
  }

  // ─── Main List View ───────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {lastSynced
              ? `Last synced: ${lastSynced.toLocaleTimeString()}`
              : 'Manage your clan watchlist'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={syncing}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-violet-600 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-violet-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync WhatsApp'}
          </button>
          <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Clan
          </Button>
        </div>
      </div>

      {/* Verified Group Profile */}
      {myGroup && (
        <div className={`rounded-2xl border-2 overflow-hidden ${
          myGroup.isVerified ? 'border-indigo-100' : 'border-amber-100'
        }`}>
          <div className={`px-5 py-4 ${
            myGroup.isVerified
              ? 'bg-gradient-to-r from-indigo-600 to-purple-700'
              : 'bg-gradient-to-r from-amber-500 to-orange-500'
          } relative overflow-hidden`}>
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-white/80 flex-shrink-0" />
                  <h2 className="font-bold text-white text-base truncate">
                    {myGroup.displayTitle || myGroup.botChatName || myGroup.title || myGroup.chatID}
                  </h2>
                  {myGroup.isVerified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-white/25 text-white px-2 py-0.5 rounded-full font-bold uppercase flex-shrink-0">
                      <CheckCircle size={8} /> Verified Group
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-white/25 text-white px-2 py-0.5 rounded-full font-bold uppercase flex-shrink-0">
                      <XCircle size={8} /> Unverified
                    </span>
                  )}
                </div>
                <code className="text-xs font-mono text-white/60 mt-1 block">{myGroup.chatID}</code>
              </div>
            </div>
          </div>
          <div className="flex bg-white border-t border-slate-100">
            {[
              { label: 'WA Members', value: myGroup.totalParticipants ?? '-' },
              { label: 'Tracked', value: myGroup.resolvedMembers?.length ?? '-' },
              { label: 'CoC Linked', value: myGroup.resolvedMembers?.filter((m: any) => (m.enrichedPlayers || []).length > 0).length ?? '-' },
            ].map(({ label, value }, i) => (
              <div key={label} className={`flex-1 px-4 py-3 text-center ${i > 0 ? 'border-l border-slate-100' : ''}`}>
                <p className="text-lg font-bold text-slate-800 leading-none">{value}</p>
                <p className="text-[11px] text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {userClans.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center py-20 text-slate-400">
          <Shield className="w-10 h-10 mb-3 text-slate-300" />
          <p className="font-medium">No clans yet</p>
          <p className="text-sm mt-1">Add a clan tag or sync from WhatsApp to get started</p>
        </div>
      )}

      {/* WhatsApp-synced clans */}
      {botClans.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-violet-500" /> WhatsApp Synced
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {botClans.map((c) => (
              <ClanCard key={c.clanTag} clan={c} onView={handleViewClan} onRemove={handleRemoveClan} />
            ))}
          </div>
        </section>
      )}

      {/* Dashboard-only clans */}
      {dashClans.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-500" /> Dashboard Only
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dashClans.map((c) => (
              <ClanCard key={c.clanTag} clan={c} onView={handleViewClan} onRemove={handleRemoveClan} />
            ))}
          </div>
        </section>
      )}

      {/* Linked Players — display only */}
      {linkedPlayers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Swords className="w-4 h-4 text-indigo-500" /> Linked Players
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {linkedPlayers.map((p) => (
              <div key={p.playerTag} className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 gap-2">
                <div>
                  <p className="font-semibold text-slate-800 font-mono text-sm">{p.playerTag}</p>
                  {p.clanTag && (
                    <p className="text-xs text-slate-500 mt-0.5">Clan: <span className="font-mono">{p.clanTag}</span></p>
                  )}
                </div>
                {p.assignedClanTag && (
                  <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full font-medium font-mono">
                    → {p.assignedClanTag}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Clan Modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setAddTag(''); setAddError(''); setSaveToWhatsApp(false); }}
        title="Add Clan to Watchlist"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Enter a Clash of Clans tag (e.g. <code className="bg-slate-100 px-1 rounded">#ABC123</code>).
          </p>
          <Input
            placeholder="Clan Tag (e.g. #ABC123)"
            value={addTag}
            onChange={(e) => setAddTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddClan()}
            autoFocus
          />

          {/* Toggle: save to WhatsApp */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={saveToWhatsApp}
              onChange={(e) => setSaveToWhatsApp(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-violet-600 rounded"
            />
            <div>
              <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-violet-500" /> Also save to WhatsApp profile
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                When on, this clan is pushed to your WhatsApp bot profile and synced automatically.
                When off, it lives only on this dashboard.
              </p>
            </div>
          </label>

          {addError && <p className="text-sm text-red-500">{addError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddClan} disabled={!addTag.trim() || addLoading}>
              {addLoading ? 'Adding…' : 'Add Clan'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
