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

  it('创建记录：首阶段为 current，url 持久化', async () => {
    const item = await createInterview(token, '腾讯', 'pcg qq', 'https://careers.tencent.com/1');
    expect(item.id).toBeTruthy();
    expect(item.stages[0].status).toBe('current');
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

    const res = await fetch(`${baseURL}/api/interviews/${list[0].id}/stage`, {
      method: 'PATCH',
      headers: auth(token),
      body: JSON.stringify({ stageIndex: 0, status: 'pass' })
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stages[0].status).toBe('pass');
    expect(body.stages[1].status).toBe('current');
    expect(body.url).toBe('https://careers.tencent.com/1');
    expect(body.lastVisitedAt).toBeUndefined();
  });

  it('非 current 阶段不允许操作，返回 400', async () => {
    const list = (await (await fetch(`${baseURL}/api/interviews`, { headers: auth(token) })).json()) as any[];
    const res = await fetch(`${baseURL}/api/interviews/${list[0].id}/stage`, {
      method: 'PATCH',
      headers: auth(token),
      body: JSON.stringify({ stageIndex: 0, status: 'pass' })
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
