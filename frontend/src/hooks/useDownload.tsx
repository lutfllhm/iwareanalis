'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

/**
 * Custom hook for downloading full database for a given module.
 * Checks settings for permission before enabling the download button.
 *
 * @param moduleKey  - The module identifier (e.g. 'pelanggan', 'barang-jasa')
 * @param endpoint   - The API endpoint path (e.g. '/data/pelanggan/download')
 * @param filename   - Base filename for the downloaded file (e.g. 'pelanggan')
 */
export function useDownload(moduleKey: string, endpoint: string, filename: string) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Fetch download permissions from settings
  const { data: downloadConfig } = useQuery({
    queryKey: ['downloadConfig'],
    queryFn: async () => {
      const res = await api.get('/settings/download-config');
      return res.data;
    },
    staleTime: 60_000, // cache for 1 minute
  });

  // Whether download is allowed for this module (default true if config not loaded)
  const canDownload: boolean = downloadConfig?.enabledModules?.includes(moduleKey) ?? true;

  const handleDownload = async (onSuccess?: (msg: string) => void, onError?: (msg: string) => void) => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Gagal mengunduh data' }));
        throw new Error(err.message || 'Gagal mengunduh data');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onSuccess?.(`Download data ${filename} berhasil!`);
    } catch (err: any) {
      const msg = err.message || 'Gagal mengunduh data';
      setDownloadError(msg);
      onError?.(msg);
    } finally {
      setIsDownloading(false);
    }
  };

  return { canDownload, isDownloading, downloadError, handleDownload };
}
