'use client';

interface TierHistoryEntry {
  seasonId: string;
  tier: string;
  trophies: number;
  membersCount: number;
}

interface Props {
  history: TierHistoryEntry[];
}

const TIER_COLORS: Record<string, string> = {
  'Champion': 'bg-yellow-100 text-yellow-800',
  'Master': 'bg-purple-100 text-purple-800',
  'Crystal': 'bg-blue-100 text-blue-800',
  'Gold': 'bg-amber-100 text-amber-800',
  'Silver': 'bg-gray-100 text-gray-800',
  'Bronze': 'bg-orange-100 text-orange-800',
};

function getTierColor(tier: string): string {
  for (const [key, val] of Object.entries(TIER_COLORS)) {
    if (tier.includes(key)) return val;
  }
  return 'bg-neutral-100 text-neutral-800';
}

export default function ClanTierChart({ history }: Props) {
  if (!history || history.length === 0) {
    return <p className="text-neutral-500 text-center py-8">No tier history available</p>;
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => (
        <div
          key={entry.seasonId}
          className="flex items-center gap-4 p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors"
        >
          <span className="text-sm font-mono text-neutral-500 w-20">
            {entry.seasonId}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTierColor(entry.tier)}`}>
            {entry.tier}
          </span>
          <span className="text-sm text-neutral-600 ml-auto">
            {entry.trophies} pts · {entry.membersCount} members
          </span>
        </div>
      ))}
    </div>
  );
}
