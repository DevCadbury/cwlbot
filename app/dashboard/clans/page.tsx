'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Swords, Trash2, TrendingUp, Users, Download,
  FileSpreadsheet, FileText, Shield, Star, ChevronLeft, Trophy,
  Zap, BarChart3,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ClanTierChart from '@/components/dashboard/ClanTierChart';
import {
  apiListClans, apiAddClan, apiDeleteClan,
  apiGetSnapshotHistory, apiGetClan, apiExportClan,
} from '@/lib/api';

const ROLE_BADGE: Record<string, string> = {
  leader:   'bg-red-100 text-red-700',
  coLeader: 'bg-orange-100 text-orange-700',
  admin:    'bg-amber-100 text-amber-700',
  member:   'bg-slate-100 text-slate-600',
};

const ROLE_LABEL: Record<string, string> = {
  leader: 'Leader', coLeader: 'Co-Leader', admin: 'Elder', member: 'Member',
};

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ClansPage() {
  const [clans, setClans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addTag, setAddTag] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [search, setSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  // Detail view
  const [selectedClan, setSelectedClan] = useState<any | null>(null);
  const [clashData, setClashData] = useState<any | null>(null);
  const [tierHistory, setTierHistory] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Export
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);
  const [exportError, setExportError] = useState('');

  const fetchClans = async () => {
    try {
      const res = await apiListClans({ page: 1, limit: 100 });
      setClans(res.clans || res.data || []);
    } catch (err) {
      console.error('Failed to load clans', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClans(); }, []);

  const handleAddClan = async () => {
    setAddLoading(true);
    setAddError('');
    try {
      await apiAddClan(addTag.toUpperCase());
      setShowAdd(false);
      setAddTag('');
      fetchClans();
    } catch (err: any) {
      setAddError(err.message || 'Failed to add clan');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (clanTag: string) => {
    if (!confirm(`Delete clan ${clanTag}?`)) return;
    try {
      await apiDeleteClan(clanTag);
      if (selectedClan?.clanTag === clanTag) setSelectedClan(null);
      fetchClans();
    } catch (err) {
      console.error('Failed to delete clan', err);
    }
  };

  const handleViewClan = async (clan: any) => {
    setSelectedClan(clan);
    setClashData(null);
    setTierHistory([]);
    setMemberSearch('');
    setDetailLoading(true);
    try {
      const [detailRes, tierRes] = await Promise.allSettled([
        apiGetClan(clan.clanTag),
        apiGetSnapshotHistory(clan.clanTag),
      ]);
      if (detailRes.status === 'fulfilled') setClashData((detailRes.value as any).clashData);
      if (tierRes.status === 'fulfilled') {
        const t = tierRes.value as any;
        setTierHistory(t.history || t.snapshots || t.data || []);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!selectedClan) return;
    setExportLoading(format);
    setExportError('');
    try {
      const blob = await apiExportClan(selectedClan.clanTag, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      a.download = `${selectedClan.name || selectedClan.clanTag}-members.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err.message || 'Export failed');
    } finally {
      setExportLoading(null);
    }
  };

  const filtered = clans.filter(
    (c) =>
      c.clanTag?.toLowerCase().includes(search.toLowerCase()) ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.clashData?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const memberList: any[] = clashData?.memberList || [];
  const filteredMembers = memberSearch
    ? memberList.filter(
        (m) =>
          m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.tag?.toLowerCase().includes(memberSearch.toLowerCase())
      )
    : memberList;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ── Detail view ──
  if (selectedClan) {
    const live = clashData;
    const displayName = live?.name || selectedClan.name || selectedClan.clanTag;
    const badgeUrl = live?.badgeUrl || '';

    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Back + header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedClan(null)}>
              <ChevronLeft className="w-4 h-4 mr-1" />Back
            </Button>
            {badgeUrl && (
              <img src={badgeUrl} alt="badge" className="w-12 h-12 rounded-lg object-contain bg-slate-50 border border-slate-100 p-1 shadow-sm" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
              <p className="text-xs font-mono text-slate-400">{selectedClan.clanTag}</p>
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-2">
            {exportError && <span className="text-xs text-red-500">{exportError}</span>}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('excel')}
              disabled={exportLoading !== null}
            >
              {exportLoading === 'excel' ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Export Excel
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('pdf')}
              disabled={exportLoading !== null}
            >
              {exportLoading === 'pdf' ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-1.5 text-red-500" />
                  Export PDF
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(selectedClan.clanTag)}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {detailLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* Stats grid */}
            {live && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatBox label="Level" value={`Lv. ${live.level ?? '—'}`} />
                <StatBox label="Members" value={`${live.memberCount ?? '—'}/50`} />
                <StatBox label="War League" value={live.warLeague || '—'} />
                <StatBox label="War Wins" value={live.warWins ?? '—'} sub={`Streak: ${live.warWinStreak ?? 0}`} />
                <StatBox label="Losses / Ties" value={`${live.warLosses ?? '—'} / ${live.warTies ?? '—'}`} />
                <StatBox label="Clan Points" value={live.points ?? '—'} />
              </div>
            )}

            {/* Description */}
            {live?.description && (
              <p className="text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-100 px-4 py-3">
                {live.description}
              </p>
            )}

            {/* Tier history chart */}
            {tierHistory.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-500" /> Tier History
                </h2>
                <ClanTierChart history={tierHistory} />
              </div>
            )}

            {/* Members */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <h2 className="text-sm font-semibold text-slate-700">
                    Members ({memberList.length})
                  </h2>
                </div>
                <div className="relative sm:ml-auto w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3 text-left w-8">#</th>
                      <th className="px-5 py-3 text-left">Player</th>
                      <th className="px-5 py-3 text-left">Tag</th>
                      <th className="px-5 py-3 text-left">Role</th>
                      <th className="px-5 py-3 text-center">TH</th>
                      <th className="px-5 py-3 text-right">Trophies</th>
                      <th className="px-5 py-3 text-right">Donations</th>
                      <th className="px-5 py-3 text-right">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-10 text-center text-slate-400 text-sm">
                          No members found
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((m, i) => (
                        <tr key={m.tag} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3 text-xs text-slate-400">{i + 1}</td>
                          <td className="px-5 py-3 font-medium text-slate-900">{m.name}</td>
                          <td className="px-5 py-3 font-mono text-xs text-slate-400">{m.tag}</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[m.role] || ROLE_BADGE.member}`}>
                              {ROLE_LABEL[m.role] || m.role}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                              {m.townHallLevel}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-slate-700">
                            <span className="flex items-center justify-end gap-1">
                              <Trophy className="w-3 h-3 text-amber-400" />
                              {m.trophies?.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-emerald-600 font-medium">{m.donations?.toLocaleString() ?? 0}</td>
                          <td className="px-5 py-3 text-right text-slate-500">{m.donationsReceived?.toLocaleString() ?? 0}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-50">
                {filteredMembers.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">No members found</div>
                ) : (
                  filteredMembers.map((m, i) => (
                    <div key={m.tag} className="px-4 py-3 flex items-center gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 flex items-center justify-center">
                        {m.townHallLevel}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{m.name}</p>
                        <p className="text-xs font-mono text-slate-400">{m.tag}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ROLE_BADGE[m.role] || ROLE_BADGE.member}`}>
                          {ROLE_LABEL[m.role] || m.role}
                        </span>
                        <p className="text-xs text-slate-500 mt-1 flex items-center justify-end gap-1">
                          <Trophy className="w-3 h-3 text-amber-400" />{m.trophies?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clans</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage tracked Clash of Clans clans</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Clan
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search clans..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-14">
            <Swords className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No clans found</p>
          </div>
        ) : (
          filtered.map((clan) => {
            const live = clan.clashData;
            const displayName = live?.name || clan.name || clan.clanTag;
            const badgeUrl = live?.badgeUrl || '';
            return (
              <motion.div
                key={clan._id || clan.clanTag}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-150 cursor-pointer"
                onClick={() => handleViewClan(clan)}
              >
                <div className="p-5">
                  {/* Badge + name */}
                  <div className="flex items-start gap-3 mb-3">
                    {badgeUrl ? (
                      <img
                        src={badgeUrl}
                        alt="badge"
                        className="w-12 h-12 rounded-lg object-contain bg-slate-50 border border-slate-100 p-1 shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{displayName}</h3>
                      <p className="text-xs font-mono text-slate-400">{clan.clanTag}</p>
                    </div>
                    {live?.level && (
                      <span className="flex-shrink-0 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">
                        Lv. {live.level}
                      </span>
                    )}
                  </div>

                  {/* Stats row */}
                  {live ? (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-slate-900">{live.memberCount ?? '—'}</p>
                        <p className="text-xs text-slate-400">Members</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-slate-900">{live.warWins ?? '—'}</p>
                        <p className="text-xs text-slate-400">War Wins</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-indigo-600 leading-tight mt-1">{live.warLeague || 'Unranked'}</p>
                        <p className="text-xs text-slate-400">CWL League</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-12 flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleViewClan(clan); }}
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> View Details
                    </button>
                    <button
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleDelete(clan.clanTag); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Add Clan Modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setAddError(''); }}
        title="Add Clan"
      >
        <div className="space-y-4">
          <Input
            label="Clan Tag"
            placeholder="#2PP or #8QYG8V0"
            value={addTag}
            onChange={(e) => setAddTag(e.target.value)}
            error={addError}
          />
          <p className="text-xs text-slate-400 -mt-2">Clan info will be fetched live from the Clash of Clans API</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddClan} disabled={addLoading || !addTag.trim()}>
              {addLoading ? <LoadingSpinner size="sm" /> : 'Add Clan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
