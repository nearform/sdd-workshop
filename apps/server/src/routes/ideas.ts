import { z } from 'zod';
import { ulid } from 'ulid';
import {
  IdeaDetailSchema,
  IdeaListSchema,
  IdeaSchema,
  IdeaWithUpdateSchema,
  NewIdeaInputSchema,
  NewUpdateInputSchema,
  UpdateIdeaInputSchema,
} from '@idea-garden/shared';
import type { FastifyTypedInstance } from '../app.ts';
import type { AppDb, IdeaRow, IdeaUpdateRow } from '../db.ts';
import { randomSpecies } from '../species.ts';

const IdeaIdParamsSchema = z.object({ id: z.string().length(26) });

function httpError(status: number, code: string): Error {
  const err = new Error(code) as Error & { statusCode?: number; code?: string };
  err.statusCode = status;
  err.code = code;
  return err;
}

export function registerIdeasRoutes(app: FastifyTypedInstance, db: AppDb): void {
  app.route({
    method: 'GET',
    url: '/api/ideas',
    schema: {
      response: {
        200: IdeaListSchema,
      },
    },
    handler: async (_request, reply) => {
      const rows = db.selectAllIdeas.all();
      // Normalise: SQLite stores `description` as `null` when absent, which is
      // exactly what IdeaSchema expects. No mapping needed.
      reply.status(200);
      return rows;
    },
  });

  app.route({
    method: 'POST',
    url: '/api/ideas',
    schema: {
      body: NewIdeaInputSchema,
      response: {
        201: IdeaSchema,
      },
    },
    handler: async (request, reply) => {
      const { title, description } = request.body;
      const now = Date.now();
      const row: IdeaRow = {
        id: ulid(),
        title,
        description: description ?? null,
        species: randomSpecies(),
        stage: 1,
        created_at: now,
        updated_at: now,
      };
      db.insertIdea.run(row);
      reply.header('Location', `/api/ideas/${row.id}`);
      reply.status(201);
      return row;
    },
  });

  app.route({
    method: 'GET',
    url: '/api/ideas/:id',
    schema: {
      params: IdeaIdParamsSchema,
      response: {
        200: IdeaDetailSchema,
      },
    },
    handler: async (request, reply) => {
      const idea = db.selectIdeaById.get(request.params.id);
      if (!idea) throw httpError(404, 'idea_not_found');
      const updates = db.selectUpdatesByIdeaId.all(request.params.id);
      reply.status(200);
      return { idea, updates };
    },
  });

  app.route({
    method: 'PATCH',
    url: '/api/ideas/:id',
    schema: {
      params: IdeaIdParamsSchema,
      body: UpdateIdeaInputSchema,
      response: {
        200: IdeaSchema,
      },
    },
    handler: async (request, reply) => {
      const existing = db.selectIdeaById.get(request.params.id);
      if (!existing) throw httpError(404, 'idea_not_found');
      const now = Date.now();
      db.updateIdeaFields.run({
        id: request.params.id,
        title: request.body.title,
        description: request.body.description,
        updated_at: now,
      });
      const updated = db.selectIdeaById.get(request.params.id);
      if (!updated) throw new Error('idea_vanished_after_update');
      reply.status(200);
      return updated;
    },
  });

  app.route({
    method: 'DELETE',
    url: '/api/ideas/:id',
    schema: {
      params: IdeaIdParamsSchema,
    },
    handler: async (request, reply) => {
      const result = db.deleteIdea.run(request.params.id);
      if (result.changes === 0) throw httpError(404, 'idea_not_found');
      reply.status(204);
      return reply.send();
    },
  });

  // Update insert + stage bump must be atomic — see PRD §2.5 and constitution
  // Principle I (server is source of truth for stage).
  const applyUpdate = db.raw.transaction((row: IdeaUpdateRow): { idea: IdeaRow; update: IdeaUpdateRow } => {
    const idea = db.selectIdeaById.get(row.idea_id);
    if (!idea) throw httpError(404, 'idea_not_found');
    db.bumpIdeaStage.run({ id: row.idea_id, updated_at: row.created_at });
    const updated = db.selectIdeaById.get(row.idea_id);
    if (!updated) throw new Error('idea_vanished_after_bump');
    const inserted: IdeaUpdateRow = { ...row, stage_after: updated.stage };
    db.insertUpdate.run(inserted);
    return { idea: updated, update: inserted };
  });

  app.route({
    method: 'POST',
    url: '/api/ideas/:id/updates',
    schema: {
      params: IdeaIdParamsSchema,
      body: NewUpdateInputSchema,
      response: {
        201: IdeaWithUpdateSchema,
      },
    },
    handler: async (request, reply) => {
      const now = Date.now();
      const seed: IdeaUpdateRow = {
        id: ulid(),
        idea_id: request.params.id,
        note: request.body.note,
        stage_after: 1,
        created_at: now,
      };
      const result = applyUpdate(seed);
      reply.status(201);
      return result;
    },
  });
}
