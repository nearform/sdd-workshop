import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  IdeaDetailResponseSchema,
  IdeaListSchema,
  IdeaSchema,
  MutationResponseSchema,
} from '@idea-garden/shared';
import { buildApp, type FastifyTypedInstance } from '../app.ts';
import { openDb, type AppDb } from '../db.ts';

async function plantIdea(
  app: FastifyTypedInstance,
  payload: { title?: string; description?: string | null } = {},
): Promise<{ id: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/ideas',
    payload: { title: 'fresh idea', ...payload },
  });
  if (res.statusCode !== 201) {
    throw new Error(`plantIdea expected 201, got ${res.statusCode}: ${res.body}`);
  }
  return { id: IdeaSchema.parse(res.json()).id };
}

async function water(
  app: FastifyTypedInstance,
  ideaId: string,
  note: string,
): Promise<ReturnType<typeof MutationResponseSchema.parse>> {
  const res = await app.inject({
    method: 'POST',
    url: `/api/ideas/${ideaId}/updates`,
    payload: { note },
  });
  if (res.statusCode !== 201) {
    throw new Error(`water expected 201, got ${res.statusCode}: ${res.body}`);
  }
  return MutationResponseSchema.parse(res.json());
}

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

describe('GET /api/ideas/:id (T013, US1)', () => {
  it('returns the idea with empty updates list when none exist', async () => {
    const { id } = await plantIdea(app, { title: 'fresh' });
    const res = await app.inject({ method: 'GET', url: `/api/ideas/${id}` });
    expect(res.statusCode).toBe(200);
    const parsed = IdeaDetailResponseSchema.parse(res.json());
    expect(parsed.idea.id).toBe(id);
    expect(parsed.updates).toEqual([]);
  });

  it('returns updates in newest-first order', async () => {
    const { id } = await plantIdea(app);
    await water(app, id, 'first');
    await new Promise((r) => setTimeout(r, 3));
    await water(app, id, 'second');
    await new Promise((r) => setTimeout(r, 3));
    await water(app, id, 'third');

    const res = await app.inject({ method: 'GET', url: `/api/ideas/${id}` });
    expect(res.statusCode).toBe(200);
    const parsed = IdeaDetailResponseSchema.parse(res.json());
    expect(parsed.updates.map((u) => u.note)).toEqual(['third', 'second', 'first']);
  });

  it('returns 404 idea_not_found for an unknown id', async () => {
    const fakeId = 'A'.repeat(26);
    const res = await app.inject({ method: 'GET', url: `/api/ideas/${fakeId}` });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: 'idea_not_found' });
  });

  it('returns 400 validation for a malformed id', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ideas/x' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'validation' });
  });
});

describe('POST /api/ideas/:id/updates (T015, US1)', () => {
  it('happy path — bumps stage, returns prev_stage and update', async () => {
    const { id } = await plantIdea(app);
    // Take the idea to stage 3 (two prior updates → stage_after 1, 2)
    await water(app, id, 'one');
    await water(app, id, 'two');
    const beforeRes = await app.inject({ method: 'GET', url: `/api/ideas/${id}` });
    const before = IdeaDetailResponseSchema.parse(beforeRes.json());
    const startStage = before.idea.stage;

    const res = await app.inject({
      method: 'POST',
      url: `/api/ideas/${id}/updates`,
      payload: { note: 'three' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.headers['location']).toMatch(/\/api\/ideas\/[A-Z0-9]{26}\/updates\/[A-Z0-9]{26}/i);

    const parsed = MutationResponseSchema.parse(res.json());
    expect(parsed.prev_stage).toBe(startStage);
    expect(parsed.idea.stage).toBe(startStage + 1);
    expect(parsed.update?.stage_after).toBe(startStage + 1);
    expect(parsed.update?.note).toBe('three');
    expect(parsed.idea.updated_at).toBeGreaterThanOrEqual(parsed.idea.created_at);
  });

  it('returns 404 idea_not_found for an unknown idea id', async () => {
    const fakeId = 'A'.repeat(26);
    const res = await app.inject({
      method: 'POST',
      url: `/api/ideas/${fakeId}/updates`,
      payload: { note: 'x' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: 'idea_not_found' });
  });

  it('bug-hunt 1: rejects empty note, persists nothing', async () => {
    const { id } = await plantIdea(app);
    const res = await app.inject({
      method: 'POST',
      url: `/api/ideas/${id}/updates`,
      payload: { note: '' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation');

    const count = db.raw
      .prepare('SELECT COUNT(*) AS n FROM idea_updates WHERE idea_id = ?')
      .get(id) as { n: number };
    expect(count.n).toBe(0);
  });

  it('bug-hunt 1b: rejects whitespace-only note via trim', async () => {
    const { id } = await plantIdea(app);
    const res = await app.inject({
      method: 'POST',
      url: `/api/ideas/${id}/updates`,
      payload: { note: '   \n   ' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation');

    const count = db.raw
      .prepare('SELECT COUNT(*) AS n FROM idea_updates WHERE idea_id = ?')
      .get(id) as { n: number };
    expect(count.n).toBe(0);
  });

  it('bug-hunt 1c: rejects a 1001-char note', async () => {
    const { id } = await plantIdea(app);
    const res = await app.inject({
      method: 'POST',
      url: `/api/ideas/${id}/updates`,
      payload: { note: 'a'.repeat(1001) },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation');
  });

  it('bug-hunt 2: stage-16 idea stays at 16 on further waterings', async () => {
    const { id } = await plantIdea(app);
    // Take to stage 16 by inserting 16 prior updates.
    for (let i = 0; i < 16; i++) {
      await water(app, id, `prior ${i}`);
    }
    const detailRes = await app.inject({ method: 'GET', url: `/api/ideas/${id}` });
    const detail = IdeaDetailResponseSchema.parse(detailRes.json());
    expect(detail.idea.stage).toBe(16);

    const res = await app.inject({
      method: 'POST',
      url: `/api/ideas/${id}/updates`,
      payload: { note: 'over the cap' },
    });
    expect(res.statusCode).toBe(201);
    const parsed = MutationResponseSchema.parse(res.json());
    expect(parsed.prev_stage).toBe(16);
    expect(parsed.idea.stage).toBe(16);
    expect(parsed.update?.stage_after).toBe(16);

    const count = db.raw
      .prepare('SELECT COUNT(*) AS n FROM idea_updates WHERE idea_id = ?')
      .get(id) as { n: number };
    expect(count.n).toBe(17);
  });

  it('bug-hunt 3: transactional failure rolls back (stage and updates unchanged)', async () => {
    const { id } = await plantIdea(app);
    await water(app, id, 'one');
    const before = db.raw
      .prepare('SELECT stage FROM ideas WHERE id = ?')
      .get(id) as { stage: number };
    const beforeCount = db.raw
      .prepare('SELECT COUNT(*) AS n FROM idea_updates WHERE idea_id = ?')
      .get(id) as { n: number };

    // Monkey-patch recomputeIdeaStage to throw once.
    const originalRun = db.recomputeIdeaStage.run.bind(db.recomputeIdeaStage);
    let thrown = false;
    db.recomputeIdeaStage.run = ((arg: { id: string; updated_at: number }) => {
      if (!thrown) {
        thrown = true;
        throw new Error('simulated recompute failure');
      }
      return originalRun(arg);
    }) as typeof db.recomputeIdeaStage.run;

    try {
      const res = await app.inject({
        method: 'POST',
        url: `/api/ideas/${id}/updates`,
        payload: { note: 'should rollback' },
      });
      expect(res.statusCode).toBe(500);
      expect(res.json().error).toBe('internal_error');
    } finally {
      db.recomputeIdeaStage.run = originalRun;
    }

    const after = db.raw
      .prepare('SELECT stage FROM ideas WHERE id = ?')
      .get(id) as { stage: number };
    const afterCount = db.raw
      .prepare('SELECT COUNT(*) AS n FROM idea_updates WHERE idea_id = ?')
      .get(id) as { n: number };
    expect(after.stage).toBe(before.stage);
    expect(afterCount.n).toBe(beforeCount.n);
  });

  it('bug-hunt 4: two sequential POSTs produce monotonic stage', async () => {
    const { id } = await plantIdea(app);
    const first = await water(app, id, 'one');
    const second = await water(app, id, 'two');
    // Either both at 16 (capped) or second is first + 1.
    if (first.idea.stage === 16) {
      expect(second.idea.stage).toBe(16);
    } else {
      expect(second.idea.stage).toBe(first.idea.stage + 1);
    }
  });
});

describe('PATCH /api/ideas/:id (T035, US2)', () => {
  it('happy path — both fields update; stage unchanged; no update row', async () => {
    const { id } = await plantIdea(app, { title: 'old title', description: 'old desc' });
    const beforeRes = await app.inject({ method: 'GET', url: `/api/ideas/${id}` });
    const before = IdeaDetailResponseSchema.parse(beforeRes.json());

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ideas/${id}`,
      payload: { title: 'new title', description: 'new desc' },
    });
    expect(res.statusCode).toBe(200);
    const parsed = MutationResponseSchema.parse(res.json());
    expect(parsed.idea.title).toBe('new title');
    expect(parsed.idea.description).toBe('new desc');
    expect(parsed.idea.stage).toBe(before.idea.stage);
    expect(parsed.prev_stage).toBe(before.idea.stage);
    expect(parsed.update).toBeUndefined();
    expect(parsed.idea.updated_at).toBeGreaterThanOrEqual(parsed.idea.created_at);
  });

  it('happy path — title only', async () => {
    const { id } = await plantIdea(app, { title: 'old', description: 'keep me' });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ideas/${id}`,
      payload: { title: 'renamed' },
    });
    expect(res.statusCode).toBe(200);
    const parsed = MutationResponseSchema.parse(res.json());
    expect(parsed.idea.title).toBe('renamed');
    expect(parsed.idea.description).toBe('keep me');
  });

  it('happy path — description set to null', async () => {
    const { id } = await plantIdea(app, { description: 'will be cleared' });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ideas/${id}`,
      payload: { description: null },
    });
    expect(res.statusCode).toBe(200);
    const parsed = MutationResponseSchema.parse(res.json());
    expect(parsed.idea.description).toBeNull();
  });

  it('rejects an empty title', async () => {
    const { id } = await plantIdea(app);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ideas/${id}`,
      payload: { title: '' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation');
  });

  it('rejects an 81-char title', async () => {
    const { id } = await plantIdea(app);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ideas/${id}`,
      payload: { title: 'x'.repeat(81) },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation');
  });

  it('rejects a 501-char description', async () => {
    const { id } = await plantIdea(app);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ideas/${id}`,
      payload: { description: 'x'.repeat(501) },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation');
  });

  it('rejects a body with neither field', async () => {
    const { id } = await plantIdea(app);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ideas/${id}`,
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('validation');
  });

  it('returns 404 for unknown idea id', async () => {
    const fakeId = 'A'.repeat(26);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ideas/${fakeId}`,
      payload: { title: 'doesn’t matter' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('idea_not_found');
  });

  it('does not add an idea_updates row and does not change ideas.stage', async () => {
    const { id } = await plantIdea(app);
    await water(app, id, 'first');
    const before = db.raw.prepare('SELECT stage FROM ideas WHERE id = ?').get(id) as {
      stage: number;
    };
    const beforeCount = db.raw
      .prepare('SELECT COUNT(*) AS n FROM idea_updates WHERE idea_id = ?')
      .get(id) as { n: number };

    await app.inject({
      method: 'PATCH',
      url: `/api/ideas/${id}`,
      payload: { title: 'renamed' },
    });

    const after = db.raw.prepare('SELECT stage FROM ideas WHERE id = ?').get(id) as {
      stage: number;
    };
    const afterCount = db.raw
      .prepare('SELECT COUNT(*) AS n FROM idea_updates WHERE idea_id = ?')
      .get(id) as { n: number };
    expect(after.stage).toBe(before.stage);
    expect(afterCount.n).toBe(beforeCount.n);
  });
});

describe('PATCH /api/ideas/:id/updates/:updateId (T047, US4)', () => {
  it('happy path — note changes; stage_after and idea.stage unchanged', async () => {
    const { id } = await plantIdea(app);
    const original = await water(app, id, 'original note');
    const updateId = original.update!.id;
    const beforeStage = original.idea.stage;

    await new Promise((r) => setTimeout(r, 3));
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ideas/${id}/updates/${updateId}`,
      payload: { note: 'edited note' },
    });
    expect(res.statusCode).toBe(200);
    const parsed = MutationResponseSchema.parse(res.json());
    expect(parsed.update?.note).toBe('edited note');
    expect(parsed.update?.stage_after).toBe(original.update!.stage_after);
    expect(parsed.idea.stage).toBe(beforeStage);
  });

  it('rejects an empty note', async () => {
    const { id } = await plantIdea(app);
    const original = await water(app, id, 'note');
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ideas/${id}/updates/${original.update!.id}`,
      payload: { note: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a > 1000-char note', async () => {
    const { id } = await plantIdea(app);
    const original = await water(app, id, 'note');
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ideas/${id}/updates/${original.update!.id}`,
      payload: { note: 'x'.repeat(1001) },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 update_not_found for an unknown update id', async () => {
    const { id } = await plantIdea(app);
    const fakeUpdate = 'Z'.repeat(26);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ideas/${id}/updates/${fakeUpdate}`,
      payload: { note: 'x' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('update_not_found');
  });

  it('returns 404 when update belongs to a different idea (path consistency)', async () => {
    const a = await plantIdea(app, { title: 'A' });
    const b = await plantIdea(app, { title: 'B' });
    const aUpdate = await water(app, a.id, 'belongs to A');
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ideas/${b.id}/updates/${aUpdate.update!.id}`,
      payload: { note: 'mismatch' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('update_not_found');
  });
});

describe('DELETE /api/ideas/:id/updates/:updateId (T049, US4)', () => {
  it('delete the highest-stage update drops idea.stage by one', async () => {
    const { id } = await plantIdea(app);
    await water(app, id, 'one');
    await water(app, id, 'two');
    const third = await water(app, id, 'three');
    const beforeStage = third.idea.stage;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/ideas/${id}/updates/${third.update!.id}`,
    });
    expect(res.statusCode).toBe(200);
    const parsed = MutationResponseSchema.parse(res.json());
    expect(parsed.prev_stage).toBe(beforeStage);
    expect(parsed.idea.stage).toBe(beforeStage - 1);
    expect(parsed.update).toBeUndefined();
  });

  it('delete a middle (non-max) update leaves idea.stage unchanged', async () => {
    const { id } = await plantIdea(app);
    const first = await water(app, id, 'one');
    await water(app, id, 'two');
    const last = await water(app, id, 'three');
    const beforeStage = last.idea.stage;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/ideas/${id}/updates/${first.update!.id}`,
    });
    expect(res.statusCode).toBe(200);
    const parsed = MutationResponseSchema.parse(res.json());
    expect(parsed.idea.stage).toBe(beforeStage);
    expect(parsed.prev_stage).toBe(beforeStage);
  });

  it('delete the only remaining update drops stage to 1', async () => {
    const { id } = await plantIdea(app);
    const only = await water(app, id, 'only');
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/ideas/${id}/updates/${only.update!.id}`,
    });
    expect(res.statusCode).toBe(200);
    const parsed = MutationResponseSchema.parse(res.json());
    expect(parsed.idea.stage).toBe(1);
  });

  it('returns 404 for an unknown update id', async () => {
    const { id } = await plantIdea(app);
    const fake = 'Z'.repeat(26);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/ideas/${id}/updates/${fake}`,
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('update_not_found');
  });

  it('returns 404 when update belongs to a different idea', async () => {
    const a = await plantIdea(app, { title: 'A' });
    const b = await plantIdea(app, { title: 'B' });
    const aUpdate = await water(app, a.id, 'belongs to A');
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/ideas/${b.id}/updates/${aUpdate.update!.id}`,
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('update_not_found');
  });
});

describe('DELETE /api/ideas/:id (T059, US5)', () => {
  it('returns 204 and removes the idea + cascades updates', async () => {
    const { id } = await plantIdea(app);
    await water(app, id, 'one');
    await water(app, id, 'two');

    const res = await app.inject({ method: 'DELETE', url: `/api/ideas/${id}` });
    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');

    const ideaCount = db.raw
      .prepare('SELECT COUNT(*) AS n FROM ideas WHERE id = ?')
      .get(id) as { n: number };
    const updateCount = db.raw
      .prepare('SELECT COUNT(*) AS n FROM idea_updates WHERE idea_id = ?')
      .get(id) as { n: number };
    expect(ideaCount.n).toBe(0);
    expect(updateCount.n).toBe(0);
  });

  it('cascades many updates in one statement', async () => {
    const { id } = await plantIdea(app);
    for (let i = 0; i < 5; i++) {
      await water(app, id, `update ${i}`);
    }
    const res = await app.inject({ method: 'DELETE', url: `/api/ideas/${id}` });
    expect(res.statusCode).toBe(204);
    const updateCount = db.raw
      .prepare('SELECT COUNT(*) AS n FROM idea_updates WHERE idea_id = ?')
      .get(id) as { n: number };
    expect(updateCount.n).toBe(0);
  });

  it('returns 404 idea_not_found for an unknown id', async () => {
    const fake = 'A'.repeat(26);
    const res = await app.inject({ method: 'DELETE', url: `/api/ideas/${fake}` });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('idea_not_found');
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
