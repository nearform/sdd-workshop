import { describe, expect, it } from 'vitest';
import { relativeTime } from './relativeTime.ts';

const now = 1746783402000; // arbitrary fixed reference

describe('relativeTime', () => {
  it("returns 'just now' for the same instant", () => {
    expect(relativeTime(now, now)).toBe('just now');
  });

  it("returns 'just now' at 59s elapsed", () => {
    expect(relativeTime(now, now - 59 * 1000)).toBe('just now');
  });

  it('returns minutes at 60s elapsed', () => {
    expect(relativeTime(now, now - 60 * 1000)).toBe('1m ago');
  });

  it('returns minutes at 59m elapsed', () => {
    expect(relativeTime(now, now - 59 * 60 * 1000)).toBe('59m ago');
  });

  it('returns hours at 60m elapsed', () => {
    expect(relativeTime(now, now - 60 * 60 * 1000)).toBe('1h ago');
  });

  it('returns hours at 23h elapsed', () => {
    expect(relativeTime(now, now - 23 * 60 * 60 * 1000)).toBe('23h ago');
  });

  it('returns days at 24h elapsed', () => {
    expect(relativeTime(now, now - 24 * 60 * 60 * 1000)).toBe('1d ago');
  });

  it('returns days at 7d elapsed', () => {
    expect(relativeTime(now, now - 7 * 24 * 60 * 60 * 1000)).toBe('7d ago');
  });

  it('handles a future timestamp by returning "just now"', () => {
    expect(relativeTime(now, now + 5_000)).toBe('just now');
  });
});
