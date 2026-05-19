import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IdeaSchema, IdeaListSchema } from '@idea-garden/shared';
import { buildApp, type FastifyTypedInstance } from '../app.ts';
import { openDb, type AppDb } from '../db.ts';

let tempDir: string;
let dbFile: string;
let db: AppDb;
let app: FastifyTypedInstance;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'idea-garden-test-'));
  dbFile = join(tempDir, 'garden.db');
  db = openDb(dbFile);
  app = buildApp({ db, logger: false, corsOrigin: false });
  await app.ready();
});

afterEach(async () => {
  await app.close();
  db.close();
  await rm(tempDir, { recursive: true, force: true });
});

describe('GET /api/ideas', () => {
  it('returns [] on a fresh DB with status 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ideas' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
    expect(IdeaListSchema.safeParse(res.json()).success).toBe(true);
  });

  it('returns inserted ideas in created_at DESC, id DESC order', async () => {
    const a = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'first idea' },
    });
    expect(a.statusCode).toBe(201);
    // Tiny pause to guarantee ordering by created_at, then a second idea.
    await new Promise((r) => setTimeout(r, 5));
    const b = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'second idea' },
    });
    expect(b.statusCode).toBe(201);

    const list = await app.inject({ method: 'GET', url: '/api/ideas' });
    expect(list.statusCode).toBe(200);
    const parsed = IdeaListSchema.parse(list.json());
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.title).toBe('second idea');
    expect(parsed[1]?.title).toBe('first idea');
  });
});

describe('POST /api/ideas — happy path', () => {
  it('returns 201 with an Idea-shaped body, stage 1, species in allowlist', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'Build an idea garden', description: 'A playful CRUD app.' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.headers['location']).toMatch(/^\/api\/ideas\/[A-Z0-9]{26}$/i);

    const idea = IdeaSchema.parse(res.json());
    expect(idea.title).toBe('Build an idea garden');
    expect(idea.description).toBe('A playful CRUD app.');
    expect(idea.species).toBe('oak');
    expect(idea.stage).toBe(1);
    expect(idea.id).toHaveLength(26);
    expect(idea.created_at).toBe(idea.updated_at);
    expect(idea.created_at).toBeGreaterThan(0);
  });

  it('accepts a title-only body and stores description as null', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'just a title' },
    });
    expect(res.statusCode).toBe(201);
    const idea = IdeaSchema.parse(res.json());
    expect(idea.description).toBeNull();
  });

  it('trims the title before storing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: '  trim me  ' },
    });
    expect(res.statusCode).toBe(201);
    expect(IdeaSchema.parse(res.json()).title).toBe('trim me');
  });
});

describe('POST /api/ideas — validation failures', () => {
  const bad = (payload: unknown) =>
    app.inject({ method: 'POST', url: '/api/ideas', payload: payload as never });

  it('rejects a missing title', async () => {
    const res = await bad({ description: 'no title' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'validation' });
    expect(res.json().details).toBeDefined();
  });

  it('rejects an empty title', async () => {
    const res = await bad({ title: '' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation');
  });

  it('rejects a whitespace-only title', async () => {
    const res = await bad({ title: '   ' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation');
  });

  it('rejects an 81-character title', async () => {
    const res = await bad({ title: 'x'.repeat(81) });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation');
  });

  it('rejects a 501-character description', async () => {
    const res = await bad({ title: 'ok', description: 'x'.repeat(501) });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation');
  });

  it('rejects a JSON body whose shape does not match the schema (e.g. a bare string)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify('not an object'),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation');
  });
});

describe('POST /api/ideas — round-trip preservation (M1: emoji / HTML injection)', () => {
  it('round-trips emoji and special characters byte-for-byte', async () => {
    const tricky = '🌱 idea <script>alert(1)</script> & "quotes"';
    const res = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: tricky, description: '😀 desc & <b>bold</b>' },
    });
    expect(res.statusCode).toBe(201);
    const idea = IdeaSchema.parse(res.json());
    expect(idea.title).toBe(tricky);
    expect(idea.description).toBe('😀 desc & <b>bold</b>');
  });
});
