import type { Interview } from './types';

const BASE = '/api/interviews';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || '请求失败');
  }
  return res.json();
}

export function fetchInterviews(): Promise<Interview[]> {
  return request<Interview[]>(BASE);
}

export function createInterview(company: string, position: string): Promise<Interview> {
  return request<Interview>(BASE, {
    method: 'POST',
    body: JSON.stringify({ company, position })
  });
}

export function updateStage(id: string, stageIndex: number, status: string): Promise<Interview> {
  return request<Interview>(`${BASE}/${id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stageIndex, status })
  });
}

export function deleteInterview(id: string): Promise<void> {
  return request<void>(`${BASE}/${id}`, { method: 'DELETE' });
}

export function updateInterview(id: string, company: string, position: string): Promise<Interview> {
  return request<Interview>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ company, position })
  });
}

export function exportInterviews(): Promise<Interview[]> {
  return request<Interview[]>(`${BASE}/export`);
}

export function importInterviews(data: Interview[]): Promise<{ success: boolean; count: number }> {
  return request<{ success: boolean; count: number }>(`${BASE}/import`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
