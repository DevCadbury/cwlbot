'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import AnimatedPanel from '@/components/ui/AnimatedPanel';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiGetExport } from '@/lib/api';

export default function ExportsPage() {
  const [seasonId, setSeasonId] = useState('');
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleExport = async () => {
    if (!seasonId) {
      setError('Season ID is required (e.g., 2024-08)');
      return;
    }
    setExporting(true);
    setError('');
    setDownloadUrl('');
    try {
      const res = await apiGetExport(seasonId, format as 'excel' | 'pdf');
      if (res.url) {
        setDownloadUrl(res.url);
      } else if (res.downloadUrl) {
        setDownloadUrl(res.downloadUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Exports</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Generate CWL data exports in Excel or PDF format
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="space-y-5">
            <Input
              label="Season ID"
              placeholder="e.g., 2024-08"
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              error={error}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Format
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setFormat('excel')}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                    format === 'excel'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Excel (.xlsx)</p>
                    <p className="text-xs opacity-60">Spreadsheet format</p>
                  </div>
                </button>
                <button
                  onClick={() => setFormat('pdf')}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                    format === 'pdf'
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-medium text-sm">PDF</p>
                    <p className="text-xs opacity-60">Printable format</p>
                  </div>
                </button>
              </div>
            </div>

            <Button
              onClick={handleExport}
              disabled={exporting}
              className="w-full"
            >
              {exporting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Export
                </>
              )}
            </Button>

            {downloadUrl && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-sm text-emerald-700 mb-2">
                  Export generated successfully!
                </p>
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 underline hover:text-emerald-700"
                >
                  Download File
                </a>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
