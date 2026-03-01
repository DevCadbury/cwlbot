'use client';
import { formatDate } from '@/lib/utils';

interface Session {
  _id: string;
  chatID: string;
  status: string;
  startedBy: string;
  startedAt: string;
  registrations: any[];
  assignments: any[];
  clanList: string[];
}

interface Props {
  session: Session;
}

export default function CWLSessionPanel({ session }: Props) {
  const statusColors: Record<string, string> = {
    open: 'bg-green-100 text-green-700',
    closed: 'bg-neutral-200 text-neutral-600',
    archived: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="glass panel-depth rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">CWL Session</h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            statusColors[session.status] || statusColors.closed
          }`}
        >
          {session.status.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-neutral-500">Session ID</span>
          <p className="font-mono text-xs mt-0.5">{session._id}</p>
        </div>
        <div>
          <span className="text-neutral-500">Started By</span>
          <p className="mt-0.5">{session.startedBy}</p>
        </div>
        <div>
          <span className="text-neutral-500">Started At</span>
          <p className="mt-0.5">{formatDate(session.startedAt)}</p>
        </div>
        <div>
          <span className="text-neutral-500">Clans</span>
          <p className="mt-0.5">{session.clanList.join(', ') || 'None'}</p>
        </div>
        <div>
          <span className="text-neutral-500">Registrations</span>
          <p className="mt-0.5 text-lg font-semibold">{session.registrations?.length || 0}</p>
        </div>
        <div>
          <span className="text-neutral-500">Assignments</span>
          <p className="mt-0.5 text-lg font-semibold">{session.assignments?.length || 0}</p>
        </div>
      </div>
    </div>
  );
}
