'use client';
import DataTable from '@/components/ui/DataTable';
import { formatDate } from '@/lib/utils';

interface Assignment {
  userPhone: string;
  clanTag: string;
  assignedBy: string;
  timestamp: string;
}

interface Props {
  assignments: Assignment[];
  loading?: boolean;
}

export default function AssignmentTable({ assignments, loading }: Props) {
  const columns = [
    { key: 'userPhone', header: 'Player Phone' },
    { key: 'clanTag', header: 'Clan Tag' },
    { key: 'assignedBy', header: 'Assigned By' },
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (row: Assignment) => formatDate(row.timestamp),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={assignments}
      loading={loading}
      emptyMessage="No assignments yet"
    />
  );
}
