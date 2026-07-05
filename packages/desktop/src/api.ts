import type { Interview } from './types';

const BASE = '/api/interviews';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const hasBody = options?.body !== undefined;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers
    }
  });
  if (!res.ok) {
    // 优先解析后端返回的错误信息
    let message = '请求失败';
    try {
      const body = await res.json();
      if (body && typeof body.error === 'string') message = body.error;
    } catch {
      // 非 JSON 响应（如网关错误）忽略，使用默认提示
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  // 204 No Content 或空响应体直接返回，避免 json() 解析报错
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
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
