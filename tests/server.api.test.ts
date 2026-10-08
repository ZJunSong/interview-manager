import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import type { Server } from 'http';

// ===== 环境准备：必须在动态 import 服务端模块之前设置 =====
// database.ts 在模块加载时读取 DATA_DIR 求值数据库路径，auth.ts 在模块加载时读取 JWT_SECRET
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'im-api-test-'));
process.env.DATA_DIR = dataDir;
process.env.JWT_SECRET = 'test-secret-for-vitest';
process.env.NODE_ENV = 'test';

const { initDatabase, closeDatabase } = await import('../server/database');
const authRoutes = (await import('../server/auth')).default;
const interviewRoutes = (await import('../server/routes')).default;

let server: Server | undefined;
let baseURL = '';

// ===== 测试工具 =====
async function registerAndLogin(username: string, password = 'password123'): Promise<string> {
  const res = await fetch(`${baseURL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (res.status === 409) {
    const login = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return ((await login.json()) as any).token;
  }
  return ((await res.json()) as any).token;
}

function auth(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function validStages() {
  return ['投递', '测评', '笔试', '简历评估', '一面', '二面', '三面', 'HR面', 'Offer评估', '正式offer']
    .map((name, i) => ({ name, status: i === 0 ? 'current' : 'pending' }));
}

async function createInterview(token: string, company: string, position: string, url?: string) {
  const res = await fetch(`${baseURL}/api/interviews`, {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ company, position, url })
  });
  expect(res.status).toBe(201);
  return (await res.json()) as any;
}

beforeAll(async () => {
  await initDatabase();

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/interviews', interviewRoutes);

  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
  });
  baseURL = `http://127.0.0.1:${(server!.address() as any).port}`;
});

afterAll(async () => {
  server?.close();
  closeDatabase();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

// ===== 认证 =====
describe('认证接口', () => {
  it('注册成功返回 201 与 token', async () => {
    const res = await fetch(`${baseURL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'password123' })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.user.username).toBe('alice');
    expect(body.user.role).toBe('user');
  });

  it('重复注册返回 409', async () => {
    const res = await fetch(`${baseURL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'password123' })
    });
    expect(res.status).toBe(409);
  });

  it('无 token 访问面试接口返回 401', async () => {
    const res = await fetch(`${baseURL}/api/interviews`);
    expect(res.status).toBe(401);
  });

  it('用户被删除后其 token 立即失效（幽灵 token 防护）', async () => {
    const bobToken = await registerAndLogin('bob');
    expect(bobToken).toBeTruthy();

    // admin 登录并删除 bob
    const adminLogin = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const adminToken = ((await adminLogin.json()) as any).token;
    const users = ((await (await fetch(`${baseURL}/api/auth/users`, { headers: auth(adminToken) })).json()) as any).users;
    const bobId = users.find((u: any) => u.username === 'bob').id;
    const del = await fetch(`${baseURL}/api/auth/users/${bobId}`, {
      method: 'DELETE',
      headers: auth(adminToken)
    });
    expect(del.status).toBe(200);

    // bob 的旧 token 应立即失效
    const res = await fetch(`${baseURL}/api/interviews`, { headers: auth(bobToken) });
    expect(res.status).toBe(401);
  });
});

// ===== 面试记录 CRUD 与阶段流转 =====
describe('面试记录 CRUD', () => {
  let token = '';

  beforeAll(async () => {
    token = await registerAndLogin('carol');
  });

  it('创建记录：投递自动通过、测评进行中，url 持久化', async () => {
    const item = await createInterview(token, '腾讯', 'pcg qq', 'https://careers.tencent.com/1');
    expect(item.id).toBeTruthy();
    expect(item.stages[0].status).toBe('pass');
    expect(item.stages[1].status).toBe('current');
    expect(item.stages[2].status).toBe('pending');
    expect(item.stages).toHaveLength(10);
    expect(item.url).toBe('https://careers.tencent.com/1');
  });

  it('列表返回已创建的记录', async () => {
    const list = (await (await fetch(`${baseURL}/api/interviews`, { headers: auth(token) })).json()) as any[];
    expect(list).toHaveLength(1);
    expect(list[0].company).toBe('腾讯');
  });

  it('编辑记录：改职位、清空 url', async () => {
    const list = (await (await fetch(`${baseURL}/api/interviews`, { headers: auth(token) })).json()) as any[];
    const res = await fetch(`${baseURL}/api/interviews/${list[0].id}`, {
      method: 'PATCH',
      headers: auth(token),
      body: JSON.stringify({ company: '腾讯', position: '微信前端', url: '' })
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.position).toBe('微信前端');
    expect(body.url).toBeUndefined();
  });

  it('阶段流转 pass：当前阶段通过、下一阶段变 current，响应包含 url（回归：不丢失链接字段）', async () => {
    const list = (await (await fetch(`${baseURL}/api/interviews`, { headers: auth(token) })).json()) as any[];

    // 先恢复 url 再流转，验证响应携带 url
    await fetch(`${baseURL}/api/interviews/${list[0].id}`, {
      method: 'PATCH',
      headers: auth(token),
      body: JSON.stringify({ company: '腾讯', position: '微信前端', url: 'https://careers.tencent.com/1' })
    });

    // 创建后投递已自动通过，当前阶段为测评（索引 1）
    const res = await fetch(`${baseURL}/api/interviews/${list[0].id}/stage`, {
      method: 'PATCH',
      headers: auth(token),
      body: JSON.stringify({ stageIndex: 1, status: 'pass' })
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stages[1].status).toBe('pass');
    expect(body.stages[2].status).toBe('current');
    expect(body.url).toBe('https://careers.tencent.com/1');
    expect(body.lastVisitedAt).toBeUndefined();
  });

  it('待进行阶段不能提前修改，返回 400', async () => {
    const list = (await (await fetch(`${baseURL}/api/interviews`, { headers: auth(token) })).json()) as any[];
    const res = await fetch(`${baseURL}/api/interviews/${list[0].id}/stage`, {
      method: 'PATCH',
      headers: auth(token),
      body: JSON.stringify({ stageIndex: 3, status: 'pass' })
    });
    expect(res.status).toBe(400);
  });

  it('非法状态值与非法阶段索引返回 400', async () => {
    const list = (await (await fetch(`${baseURL}/api/interviews`, { headers: auth(token) })).json()) as any[];
    const id = list[0].id;

    const bad1 = await fetch(`${baseURL}/api/interviews/${id}/stage`, {
      method: 'PATCH',
      headers: auth(token),
      body: JSON.stringify({ stageIndex: 1, status: 'hack' })
    });
    expect(bad1.status).toBe(400);

    const bad2 = await fetch(`${baseURL}/api/interviews/${id}/stage`, {
      method: 'PATCH',
      headers: auth(token),
      body: JSON.stringify({ stageIndex: 99, status: 'pass' })
    });
    expect(bad2.status).toBe(400);

    const bad3 = await fetch(`${baseURL}/api/interviews/${id}/stage`, {
      method: 'PATCH',
      headers: auth(token),
      body: JSON.stringify({ stageIndex: 1.5, status: 'pass' })
    });
    expect(bad3.status).toBe(400);
  });

  it('删除记录', async () => {
    const item = await createInterview(token, '临时公司', '临时职位');
    const res = await fetch(`${baseURL}/api/interviews/${item.id}`, {
      method: 'DELETE',
      headers: auth(token)
    });
    expect(res.status).toBe(200);
    const list = (await (await fetch(`${baseURL}/api/interviews`, { headers: auth(token) })).json()) as any[];
    expect(list.find((i: any) => i.id === item.id)).toBeUndefined();
  });
});

// 历史更正统一撤销后续结果，使用独立用户避免影响原有记录数量断言。
describe('已记录阶段更正', () => {
  let token = '';
  let sequence = 0;
  const historyStates = [
    { status: 'pass', label: '已通过' },
    { status: 'skip', label: '已跳过' },
    { status: 'fail', label: '未通过' },
    { status: 'rejected', label: '已拒绝' }
  ];
  const actions = [{ status: 'current', label: '进行中' }, ...historyStates];

  beforeAll(async () => {
    token = await registerAndLogin('stage_correction');
  });

  async function importRecord(statuses: string[]) {
    const item = {
      id: `stage-correction-${++sequence}`,
      company: '阶段更正测试',
      position: '前端工程师',
      stages: validStages().map((stage, index) => ({ ...stage, status: statuses[index] }))
    };
    const res = await fetch(`${baseURL}/api/interviews/import`, {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify({ data: [item] })
    });
    expect(res.status).toBe(200);
    expect((await res.json()).count).toBe(1);
    return item;
  }

  function changeStage(id: string, stageIndex: number, status: string, callerToken = token) {
    return fetch(`${baseURL}/api/interviews/${id}/stage`, {
      method: 'PATCH',
      headers: auth(callerToken),
      body: JSON.stringify({ stageIndex, status })
    });
  }

  async function readRecord(id: string) {
    const res = await fetch(`${baseURL}/api/interviews`, { headers: auth(token) });
    expect(res.status).toBe(200);
    const item = (await res.json()).find((record: any) => record.id === id);
    expect(item).toBeDefined();
    return item;
  }

  const corrections = historyStates.flatMap(source => actions
    .filter(target => target.status !== source.status)
    .map(target => ({ source: source.status, target: target.status, sourceLabel: source.label, targetLabel: target.label })));

  it.each(corrections)('$sourceLabel更正为$targetLabel，保留前序并重置全部后续结果', async ({ source, target }) => {
    // 后续混合全部已记录状态，验证已通过、已跳过和终止结果也被撤销。
    const item = await importRecord(['pass', 'skip', source, 'pass', 'skip', 'current', 'fail', 'rejected', 'pass', 'pass']);
    const res = await changeStage(item.id, 2, target);
    expect(res.status).toBe(200);
    const body = await res.json();

    const expected = ['pass', 'skip', target, ...Array(7).fill('pending')];
    if (target === 'pass' || target === 'skip') expected[3] = 'current';
    expect(body.stages.map((stage: any) => stage.status)).toEqual(expected);
    expect(body.stages.slice(0, 2)).toEqual(item.stages.slice(0, 2));
    expect(body.stages.map((stage: any) => stage.name)).toEqual(item.stages.map(stage => stage.name));
    expect(body.stages.filter((stage: any) => stage.status === 'current')).toHaveLength(
      target === 'fail' || target === 'rejected' ? 0 : 1
    );
    expect((await readRecord(item.id)).stages).toEqual(body.stages);
  });

  it('自动通过的投递阶段可以恢复并重新推进，其他岗位字段保持不变', async () => {
    const company = '首阶段更正公司';
    const item = await createInterview(token, company, '后端工程师', 'https://jobs.example.com/correction');
    const pinRes = await fetch(`${baseURL}/api/interviews/pin-company`, {
      method: 'PUT', headers: auth(token), body: JSON.stringify({ company, pinned: true })
    });
    expect(pinRes.status).toBe(200);
    const visitRes = await fetch(`${baseURL}/api/interviews/visit-company`, {
      method: 'POST', headers: auth(token), body: JSON.stringify({ company })
    });
    expect(visitRes.status).toBe(200);
    const visit = await visitRes.json();

    const res = await changeStage(item.id, 0, 'current');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stages.map((stage: any) => stage.status)).toEqual(['current', ...Array(9).fill('pending')]);
    const fields = {
      id: item.id, company, position: item.position, status: item.status,
      url: item.url, pinned: true, lastVisitedAt: visit.lastVisitedAt, createdAt: item.createdAt
    };
    expect(body).toMatchObject(fields);
    expect(await readRecord(item.id)).toMatchObject({ ...fields, stages: body.stages });

    const continued = await changeStage(item.id, 0, 'skip');
    expect(continued.status).toBe(200);
    expect((await continued.json()).stages.map((stage: any) => stage.status))
      .toEqual(['skip', 'current', ...Array(8).fill('pending')]);
  });

  const finalCorrections = [
    ...historyStates.map(source => ({ source: source.status, target: 'current', sourceLabel: source.label, targetLabel: '进行中' })),
    { source: 'pass', target: 'skip', sourceLabel: '已通过', targetLabel: '已跳过' },
    { source: 'skip', target: 'pass', sourceLabel: '已跳过', targetLabel: '已通过' }
  ];
  it.each(finalCorrections)('最后阶段由$sourceLabel更正为$targetLabel，不启动额外阶段', async ({ source, target }) => {
    const item = await importRecord([...Array(9).fill('pass'), source]);
    const res = await changeStage(item.id, 9, target);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stages.slice(0, 9)).toEqual(item.stages.slice(0, 9));
    expect(body.stages[9].status).toBe(target);
    expect(body.stages.filter((stage: any) => stage.status === 'current')).toHaveLength(target === 'current' ? 1 : 0);
  });

  it.each(actions)('$label重复设置相同状态被拒绝，后续结果及更新时间均不改变', async ({ status }) => {
    const later = status === 'current' ? Array(7).fill('pending') : ['pass', 'skip', 'current', ...Array(4).fill('pending')];
    const item = await importRecord(['pass', 'skip', status, ...later]);
    const before = await readRecord(item.id);
    expect((await changeStage(item.id, 2, status)).status).toBe(400);
    expect(await readRecord(item.id)).toEqual(before);
  });

  it('禁止回写待进行状态，导入仍可包含待进行节点', async () => {
    const item = await importRecord(['pass', 'skip', 'pass', 'current', ...Array(6).fill('pending')]);
    const before = await readRecord(item.id);
    expect((await changeStage(item.id, 2, 'pending')).status).toBe(400);
    expect(await readRecord(item.id)).toEqual(before);
  });

  it.each([
    { status: 'current', label: '进行中' },
    { status: 'fail', label: '未通过' },
    { status: 'rejected', label: '已拒绝' }
  ])('前序存在$label时拒绝历史更正，整条记录保持不变', async ({ status }) => {
    const item = await importRecord(['pass', status, 'skip', 'pass', 'current', ...Array(5).fill('pending')]);
    const before = await readRecord(item.id);
    for (const target of ['current', 'pass', 'fail']) {
      expect((await changeStage(item.id, 2, target)).status).toBe(400);
      expect(await readRecord(item.id)).toEqual(before);
    }
  });

  it('其他用户不能恢复历史节点，原用户数据保持不变', async () => {
    const item = await importRecord(['pass', 'skip', 'pass', 'current', ...Array(6).fill('pending')]);
    const before = await readRecord(item.id);
    const otherToken = await registerAndLogin('stage_other');
    expect((await changeStage(item.id, 2, 'current', otherToken)).status).toBe(404);
    expect(await readRecord(item.id)).toEqual(before);
  });

  it.each(historyStates)('进行中节点改为$label时保留正常推进和终止规则', async ({ status }) => {
    const item = await createInterview(token, '正常阶段流转', '测试工程师');
    const res = await changeStage(item.id, 1, status);
    expect(res.status).toBe(200);
    const body = await res.json();
    const expected = ['pass', status, ...Array(8).fill('pending')];
    if (status === 'pass' || status === 'skip') expected[2] = 'current';
    expect(body.stages.map((stage: any) => stage.status)).toEqual(expected);
  });
});

// ===== 用户数据隔离 =====
describe('用户数据隔离', () => {
  it('用户无法查看或操作他人的记录', async () => {
    const tokenA = await registerAndLogin('dave');
    const tokenB = await registerAndLogin('eve');
    const item = await createInterview(tokenA, '保密公司', '保密职位');

    const listB = (await (await fetch(`${baseURL}/api/interviews`, { headers: auth(tokenB) })).json()) as any[];
    expect(listB.find((i: any) => i.id === item.id)).toBeUndefined();

    const patch = await fetch(`${baseURL}/api/interviews/${item.id}/stage`, {
      method: 'PATCH',
      headers: auth(tokenB),
      body: JSON.stringify({ stageIndex: 0, status: 'pass' })
    });
    expect(patch.status).toBe(404);
  });
});

// ===== visit-company：公司维度批量访问标记（新接口） =====
describe('visit-company 批量访问标记', () => {
  let token = '';

  beforeAll(async () => {
    token = await registerAndLogin('frank');
    await createInterview(token, '腾讯', 'pcg qq', 'https://t.com/pcg');
    await createInterview(token, '腾讯', '微信事业群', 'https://t.com/wx');
    await createInterview(token, '阿里', '后端', 'https://a.com/be');
  });

  it('访问一次公司，该公司全部岗位记录同步更新访问时间，其他公司不受影响', async () => {
    const res = await fetch(`${baseURL}/api/interviews/visit-company`, {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify({ company: '腾讯' })
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(2);
    expect(body.lastVisitedAt).toBeTruthy();

    const list = (await (await fetch(`${baseURL}/api/interviews`, { headers: auth(token) })).json()) as any[];
    const tx = list.filter((i: any) => i.company === '腾讯');
    expect(new Set(tx.map((i: any) => i.lastVisitedAt))).toEqual(new Set([body.lastVisitedAt]));
    const ali = list.find((i: any) => i.company === '阿里');
    expect(ali.lastVisitedAt).toBeUndefined();
  });

  it('公司名含首尾空格时按 trim 后匹配', async () => {
    const res = await fetch(`${baseURL}/api/interviews/visit-company`, {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify({ company: ' 腾讯 ' })
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).updated).toBe(2);
  });

  it('不存在的公司返回 404', async () => {
    const res = await fetch(`${baseURL}/api/interviews/visit-company`, {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify({ company: '不存在公司' })
    });
    expect(res.status).toBe(404);
  });

  it('空公司名返回 400', async () => {
    const res = await fetch(`${baseURL}/api/interviews/visit-company`, {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify({ company: '   ' })
    });
    expect(res.status).toBe(400);
  });
});

// ===== pin-company：公司维度置顶（新接口） =====
describe('pin-company 公司置顶', () => {
  let token = '';

  beforeAll(async () => {
    token = await registerAndLogin('henry');
    await createInterview(token, '置顶公司', '岗位a', 'https://p.com/a');
    await createInterview(token, '置顶公司', '岗位b');
    await createInterview(token, '普通公司', '岗位c');
  });

  it('置顶后该公司全部岗位记录 pinned=true，其他公司不受影响', async () => {
    const res = await fetch(`${baseURL}/api/interviews/pin-company`, {
      method: 'PUT',
      headers: auth(token),
      body: JSON.stringify({ company: '置顶公司', pinned: true })
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).updated).toBe(2);

    const list = (await (await fetch(`${baseURL}/api/interviews`, { headers: auth(token) })).json()) as any[];
    const pinnedItems = list.filter((i: any) => i.company === '置顶公司');
    expect(pinnedItems.every((i: any) => i.pinned === true)).toBe(true);
    expect(list.find((i: any) => i.company === '普通公司').pinned).toBe(false);
  });

  it('取消置顶后 pinned=false', async () => {
    const res = await fetch(`${baseURL}/api/interviews/pin-company`, {
      method: 'PUT',
      headers: auth(token),
      body: JSON.stringify({ company: '置顶公司', pinned: false })
    });
    expect(res.status).toBe(200);
    const list = (await (await fetch(`${baseURL}/api/interviews`, { headers: auth(token) })).json()) as any[];
    expect(list.filter((i: any) => i.company === '置顶公司').every((i: any) => i.pinned === false)).toBe(true);
  });

  it('不存在的公司返回 404，非法 pinned 参数返回 400', async () => {
    const res404 = await fetch(`${baseURL}/api/interviews/pin-company`, {
      method: 'PUT',
      headers: auth(token),
      body: JSON.stringify({ company: '不存在', pinned: true })
    });
    expect(res404.status).toBe(404);

    const res400 = await fetch(`${baseURL}/api/interviews/pin-company`, {
      method: 'PUT',
      headers: auth(token),
      body: JSON.stringify({ company: '置顶公司', pinned: 'yes' })
    });
    expect(res400.status).toBe(400);
  });

  it('导出接口包含 pinned 字段', async () => {
    await fetch(`${baseURL}/api/interviews/pin-company`, {
      method: 'PUT',
      headers: auth(token),
      body: JSON.stringify({ company: '置顶公司', pinned: true })
    });
    const data = (await (await fetch(`${baseURL}/api/interviews/export`, { headers: auth(token) })).json()) as any[];
    expect(data.find((i: any) => i.company === '置顶公司').pinned).toBe(true);
    expect(data.find((i: any) => i.company === '普通公司').pinned).toBe(false);
  });

  it('导入带 pinned 字段的数据可持久化（旧格式无该字段默认 false）', async () => {
    const res = await fetch(`${baseURL}/api/interviews/import`, {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify({
        mode: 'overwrite',
        data: [
          { company: '导入置顶', position: 'x', stages: validStages(), pinned: true },
          { company: '导入普通', position: 'y', stages: validStages() }
        ]
      })
    });
    expect(res.status).toBe(200);
    const list = (await (await fetch(`${baseURL}/api/interviews`, { headers: auth(token) })).json()) as any[];
    expect(list.find((i: any) => i.company === '导入置顶').pinned).toBe(true);
    expect(list.find((i: any) => i.company === '导入普通').pinned).toBe(false);
  });
});

// ===== 管理员接口（统计/角色）与改密码 =====
describe('管理员接口与改密码', () => {
  it('admin/stats 返回全平台统计（回归：SQL 双引号字符串曾致 500）', async () => {
    const adminToken = await registerAndLogin('admin', 'admin123');
    const res = await fetch(`${baseURL}/api/interviews/admin/stats`, { headers: auth(adminToken) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stats.totalUsers).toBeGreaterThanOrEqual(1);
    expect(typeof body.stats.totalInterviews).toBe('number');
    expect(typeof body.stats.recentUsers).toBe('number');
  });

  it('普通用户访问 admin 接口返回 403', async () => {
    const userToken = await registerAndLogin('iris');
    const res = await fetch(`${baseURL}/api/interviews/admin/stats`, { headers: auth(userToken) });
    expect(res.status).toBe(403);
  });

  it('修改角色与修改密码接口可用（回归：SQL 双引号字符串曾致 500）', async () => {
    const adminToken = await registerAndLogin('admin', 'admin123');
    const jackToken = await registerAndLogin('jack');
    const users = ((await (await fetch(`${baseURL}/api/auth/users`, { headers: auth(adminToken) })).json()) as any).users;
    const jackId = users.find((u: any) => u.username === 'jack').id;

    const roleRes = await fetch(`${baseURL}/api/auth/users/${jackId}/role`, {
      method: 'PUT',
      headers: auth(adminToken),
      body: JSON.stringify({ role: 'admin' })
    });
    expect(roleRes.status).toBe(200);

    const pwdRes = await fetch(`${baseURL}/api/auth/password`, {
      method: 'PUT',
      headers: auth(jackToken),
      body: JSON.stringify({ oldPassword: 'password123', newPassword: 'newpass456' })
    });
    expect(pwdRes.status).toBe(200);
  });
});

// ===== 导入/导出 =====
describe('数据导入', () => {
  let token = '';

  beforeAll(async () => {
    token = await registerAndLogin('grace');
  });

  function importItem(id?: string, status?: string) {
    return {
      ...(id ? { id } : {}),
      company: '导入公司',
      position: '导入职位',
      stages: validStages(),
      ...(status ? { status } : {})
    };
  }

  it('合并模式：同 id 记录跳过不覆盖，新记录导入', async () => {
    const existing = await createInterview(token, '已有公司', '已有职位');
    const res = await fetch(`${baseURL}/api/interviews/import`, {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify({
        mode: 'merge',
        data: [
          importItem(existing.id),
          importItem()
        ]
      })
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).count).toBe(1);

    const list = (await (await fetch(`${baseURL}/api/interviews`, { headers: auth(token) })).json()) as any[];
    expect(list).toHaveLength(2);
    // 同 id 记录未被覆盖：公司名保持"已有公司"
    expect(list.find((i: any) => i.id === existing.id).company).toBe('已有公司');
  });

  it('覆盖模式：清空原有数据后导入', async () => {
    const res = await fetch(`${baseURL}/api/interviews/import`, {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify({ mode: 'overwrite', data: [importItem()] })
    });
    expect(res.status).toBe(200);
    const list = (await (await fetch(`${baseURL}/api/interviews`, { headers: auth(token) })).json()) as any[];
    expect(list).toHaveLength(1);
  });

  it('非法数据返回 400：非数组、阶段数不为 10、非法阶段状态、非法记录状态', async () => {
    const cases = [
      { data: 'not-array' },
      { data: [{ company: 'x', position: 'y', stages: validStages().slice(0, 9) }] },
      { data: [{ company: 'x', position: 'y', stages: validStages().map(s => ({ ...s, status: 'hack' })) }] },
      { data: [importItem(undefined, 'hack')] }
    ];
    for (const body of cases) {
      const res = await fetch(`${baseURL}/api/interviews/import`, {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(body)
      });
      expect(res.status).toBe(400);
    }
  });
});
