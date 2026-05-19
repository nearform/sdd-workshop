import { ulid } from 'ulid';
import {
  IdeaListSchema,
  IdeaSchema,
  NewIdeaInputSchema,
} from '@idea-garden/shared';
import type { FastifyTypedInstance } from '../app.ts';
import type { AppDb, IdeaRow } from '../db.ts';
import { randomSpecies } from '../species.ts';

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
}
