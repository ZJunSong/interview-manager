import { describe, it, expect } from 'vitest';
import { filterInterviews, groupByCompany, sortGroups } from '../src/utils/grouping';
import type { Interview } from '../src/types';

function makeStages(passed: number, currentAt: number): Interview['stages'] {
  return Array.from({ length: 10 }, (_, i) => ({
    name: `阶段${i}`,
    status: i < passed ? 'pass' : i === currentAt ? 'current' : 'pending'
  }));
}

function makeItem(overrides: Partial<Interview> & { id: string; company: string; position: string }): Interview {
  return {
    stages: makeStages(0, 0),
    status: 'active',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    ...overrides
  } as Interview;
}

describe('filterInterviews 搜索过滤', () => {
  const data: Interview[] = [
    makeItem({ id: '1', company: '腾讯', position: '前端工程师' }),
    makeItem({ id: '2', company: '阿里巴巴', position: '后端开发' }),
    makeItem({ id: '3', company: 'tencent', position: 'tester' })
  ];

  it('按公司名匹配（不区分大小写）', () => {
    expect(filterInterviews(data, 'TENCENT').map(i => i.id)).toEqual(['3']);
  });

  it('按职位名匹配', () => {
    expect(filterInterviews(data, '前端').map(i => i.id)).toEqual(['1']);
  });

  it('中文关键词匹配', () => {
    expect(filterInterviews(data, '阿里').map(i => i.id)).toEqual(['2']);
  });

  it('空查询返回全部', () => {
    expect(filterInterviews(data, '   ')).toHaveLength(3);
  });

  it('无命中返回空数组', () => {
    expect(filterInterviews(data, '字节跳动')).toHaveLength(0);
  });
});

describe('groupByCompany 公司聚合', () => {
  it('同公司多岗位聚合为一个组，不同公司各自成组', () => {
    const groups = groupByCompany([
      makeItem({ id: '1', company: '腾讯', position: 'pcg qq' }),
      makeItem({ id: '2', company: '腾讯', position: '微信前端' }),
      makeItem({ id: '3', company: '阿里', position: '后端' })
    ]);
    expect(groups).toHaveLength(2);
    const tx = groups.find(g => g.company === '腾讯')!;
    expect(tx.items.map(i => i.id)).toEqual(['1', '2']);
  });

  it('公司名仅 trim 后比较，忽略首尾空格差异', () => {
    const groups = groupByCompany([
      makeItem({ id: '1', company: '腾讯', position: 'a' }),
      makeItem({ id: '2', company: ' 腾讯 ', position: 'b' })
    ]);
    expect(groups).toHaveLength(1);
  });

  it('maxProgress 取组内最大进度', () => {
    const groups = groupByCompany([
      makeItem({ id: '1', company: '腾讯', position: 'a', stages: makeStages(1, 1) }),
      makeItem({ id: '2', company: '腾讯', position: 'b', stages: makeStages(4, 4) })
    ]);
    expect(groups[0].maxProgress).toBe(4);
  });

  it('latestVisit 取组内最新访问时间', () => {
    const groups = groupByCompany([
      makeItem({ id: '1', company: '腾讯', position: 'a', lastVisitedAt: '2026-09-10T08:00:00.000Z' }),
      makeItem({ id: '2', company: '腾讯', position: 'b', lastVisitedAt: '2026-09-12T08:00:00.000Z' })
    ]);
    expect(groups[0].latestVisit).toBe('2026-09-12T08:00:00.000Z');
  });

  it('url 优先取最近访问过的记录的链接，其次取第一条有链接的', () => {
    const groups = groupByCompany([
      makeItem({ id: '1', company: '腾讯', position: 'a', url: 'https://old.com', lastVisitedAt: '2026-09-10T08:00:00.000Z' }),
      makeItem({ id: '2', company: '腾讯', position: 'b', url: 'https://new.com', lastVisitedAt: '2026-09-12T08:00:00.000Z' }),
      makeItem({ id: '3', company: '腾讯', position: 'c', url: 'https://never.com' })
    ]);
    expect(groups[0].url).toBe('https://new.com');

    const groupsNoVisit = groupByCompany([
      makeItem({ id: '1', company: '字节', position: 'a' }),
      makeItem({ id: '2', company: '字节', position: 'b', url: 'https://byted.com' })
    ]);
    expect(groupsNoVisit[0].url).toBe('https://byted.com');
  });
});

describe('sortGroups 公司维度排序', () => {
  const a = (company: string, overrides: Partial<CompanyGroup>): CompanyGroup => ({
    company,
    items: [],
    maxProgress: 0,
    latestCreatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides
  });

  it('progress：按公司最大进度降序，进度相同按最新投递时间降序', () => {
    const sorted = sortGroups([
      a('甲', { maxProgress: 1, latestCreatedAt: '2026-09-05' }),
      a('乙', { maxProgress: 4, latestCreatedAt: '2026-09-01' }),
      a('丙', { maxProgress: 1, latestCreatedAt: '2026-09-08' })
    ], 'progress');
    expect(sorted.map(g => g.company)).toEqual(['乙', '丙', '甲']);
  });

  it('recentVisit：有访问的按时间降序在前，从未访问的排最后', () => {
    const sorted = sortGroups([
      a('未访问', { latestCreatedAt: '2026-09-09' }),
      a('旧访问', { latestVisit: '2026-09-10T08:00:00.000Z' }),
      a('新访问', { latestVisit: '2026-09-12T08:00:00.000Z' })
    ], 'recentVisit');
    expect(sorted.map(g => g.company)).toEqual(['新访问', '旧访问', '未访问']);
  });

  it('newest / oldest 按公司最新投递时间正反排序', () => {
    const groups = [
      a('老', { latestCreatedAt: '2026-08-01' }),
      a('新', { latestCreatedAt: '2026-09-15' })
    ];
    expect(sortGroups(groups, 'newest').map(g => g.company)).toEqual(['新', '老']);
    expect(sortGroups(groups, 'oldest').map(g => g.company)).toEqual(['老', '新']);
  });

  it('company 按公司名拼音排序且不改原数组', () => {
    const groups = [a('腾讯'), a('阿里巴巴'), a('字节跳动')];
    const sorted = sortGroups(groups, 'company');
    // zh-CN localeCompare 按拼音：阿(ā) < 腾(téng) < 字(zì)
    expect(sorted.map(g => g.company)).toEqual(['阿里巴巴', '腾讯', '字节跳动']);
    expect(groups[0].company).toBe('腾讯');
  });
});
