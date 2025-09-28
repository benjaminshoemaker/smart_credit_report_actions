import type { AnalysisResponse } from '@/types/credit';

const API_BASE: string = (import.meta as ImportMeta).env?.VITE_API_BASE || 'http://localhost:8787';

export async function analyzeCreditReport(file: File): Promise<AnalysisResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/analyze`, { method: 'POST', body: form });
  if (!res.ok) {
    let message = `Analyze failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data && typeof data.error === 'string') message = data.error;
    } catch {
      try {
        message = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new Error(message);
  }
  return res.json(); // {accounts, totals, actions}
}

export { API_BASE };
