import { randomInt } from 'node:crypto';
import { SpeciesSchema, type Species } from '@idea-garden/shared';

// Frozen and derived from the shared Zod enum so the two cannot drift.
export const SPECIES_LIST: readonly Species[] = Object.freeze([...SpeciesSchema.options]);

export function randomSpecies(): Species {
  const idx = randomInt(0, SPECIES_LIST.length);
  const choice = SPECIES_LIST[idx];
  if (!choice) {
    throw new Error('Species allowlist is empty — this is a build-time invariant violation.');
  }
  return choice;
}
