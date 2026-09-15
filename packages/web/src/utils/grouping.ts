import type { Interview } from '../types';

/** 公司聚合组：同一公司的多条记录（多部门/多岗位）归并为一组 */
export interface CompanyGroup {
  company: string;
  /** 组内全部记录 */
  items: Interview[];
  /** 公司最大进度（pass+skip 的阶段数最大值） */
  maxProgress: number;
  /** 组内最新投递时间 */
  latestCreatedAt: string;
  /** 组内最新访问时间（所有记录中最大值，可能为 undefined） */
  latestVisit?: string;
  /** 公司跳转链接：优先取最近访问过的记录的链接，其次取任意有链接的记录 */
  url?: string;
}

function progressOf(item: Interview): number {
  return item.stages.filter(s => s.status === 'pass' || s.status === 'skip').length;
}

function newestVisitOf(items: Interview[]): string | undefined {
  let latest: string | undefined;
  for (const i of items) {
    if (i.lastVisitedAt && (!latest || i.lastVisitedAt > latest)) latest = i.lastVisitedAt;
  }
  return latest;
}

function pickUrl(items: Interview[]): string | undefined {
  // 优先最近访问过的记录的链接（用户上次关注的就是它），否则取任意有链接的记录
  const withUrl = items.filter(i => !!i.url);
  if (withUrl.length === 0) return undefined;
  const visited = withUrl.filter(i => !!i.lastVisitedAt);
  if (visited.length > 0) {
    visited.sort((a, b) => (a.lastVisitedAt! < b.lastVisitedAt! ? 1 : -1));
    return visited[0].url;
  }
  return withUrl[0].url;
}

/** 搜索过滤：公司名或职位名包含关键词（不区分大小写） */
export function filterInterviews(interviews: Interview[], query: string): Interview[] {
  const q = query.trim().toLowerCase();
  if (!q) return interviews;
  return interviews.filter(
    i => i.company.toLowerCase().includes(q) || i.position.toLowerCase().includes(q)
  );
}

/** 按公司分组（公司名 trim 后精确匹配） */
export function groupByCompany(interviews: Interview[]): CompanyGroup[] {
  const map = new Map<string, Interview[]>();
  for (const item of interviews) {
    const key = item.company.trim();
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }

  const groups: CompanyGroup[] = [];
  for (const [company, items] of map) {
    groups.push({
      company,
      items,
      maxProgress: Math.max(...items.map(progressOf)),
      latestCreatedAt: items.reduce(
        (acc, i) => (i.createdAt > acc ? i.createdAt : acc),
        items[0].createdAt
      ),
      latestVisit: newestVisitOf(items),
      url: pickUrl(items)
    });
  }
  return groups;
}

export type SortMode = 'progress' | 'newest' | 'oldest' | 'company' | 'recentVisit';

/** 公司维度排序。progress：公司最大进度降序；recentVisit：公司最新访问降序，未访问排最后 */
export function sortGroups(groups: CompanyGroup[], sortBy: SortMode): CompanyGroup[] {
  const sorted = [...groups];
  switch (sortBy) {
    case 'progress':
      sorted.sort(
        (a, b) =>
          b.maxProgress - a.maxProgress ||
          (a.latestCreatedAt < b.latestCreatedAt ? 1 : -1)
      );
      break;
    case 'newest':
      sorted.sort((a, b) => (a.latestCreatedAt < b.latestCreatedAt ? 1 : -1));
      break;
    case 'oldest':
      sorted.sort((a, b) => (a.latestCreatedAt > b.latestCreatedAt ? 1 : -1));
      break;
    case 'company':
      sorted.sort((a, b) => a.company.localeCompare(b.company, 'zh-CN'));
      break;
    case 'recentVisit':
      sorted.sort((a, b) => {
        if (a.latestVisit && b.latestVisit) return a.latestVisit < b.latestVisit ? 1 : -1;
        if (a.latestVisit) return -1;
        if (b.latestVisit) return 1;
        return a.latestCreatedAt < b.latestCreatedAt ? 1 : -1;
      });
      break;
  }
  return sorted;
}
