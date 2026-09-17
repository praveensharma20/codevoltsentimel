import type { ScanResult } from '../types/models';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/api';

export async function authenticate(email: string, password: string, mode: 'login' | 'register') {
  const response = await fetch(`${API_BASE}/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<{ access_token: string }>;
}

export async function uploadScan(token: string, file: File): Promise<ScanResult> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${API_BASE}/scans/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function githubScan(token: string, repositoryUrl: string, branch?: string): Promise<ScanResult> {
  const response = await fetch(`${API_BASE}/scans/github`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ repository_url: repositoryUrl, branch: branch || null }) });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function downloadReport(token: string, scanId: string, format: 'json' | 'csv') {
  const response = await fetch(`${API_BASE}/reports/${scanId}?format=${format}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(await response.text());
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `secure-review-${scanId}.${format}`;
  anchor.click();
  URL.revokeObjectURL(url);
}
