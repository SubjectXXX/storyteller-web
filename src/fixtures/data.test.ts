import { describe, expect, it } from 'vitest';
import {
  PLAY_FIXTURE,
  REFERRAL_FIXTURE,
  SCENARIO_FIXTURES,
  SETTINGS_FIXTURE,
  WALLET_FIXTURE,
  findScenario,
} from './data';

describe('scenario fixtures', () => {
  it('has at least four scenarios for the Stage S1 gallery', () => {
    expect(SCENARIO_FIXTURES.length).toBeGreaterThanOrEqual(4);
  });

  it('uses stable ids that the routes rely on', () => {
    const ids = SCENARIO_FIXTURES.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining([
      'demo-romance',
      'demo-mystery',
      'demo-horizon',
      'demo-ember',
    ]));
  });

  it('every scenario points at a real CSS variable accent', () => {
    for (const s of SCENARIO_FIXTURES) {
      expect(s.coverAccent).toMatch(/^var\(--color-/);
    }
  });

  it('findScenario returns the matching fixture by id', () => {
    expect(findScenario('demo-romance')?.title).toBe('A Quiet Court');
    expect(findScenario('does-not-exist')).toBeUndefined();
  });
});

describe('play fixture', () => {
  it('always offers at least two choices', () => {
    expect(PLAY_FIXTURE.choices.length).toBeGreaterThanOrEqual(2);
  });

  it('every choice has a unique id', () => {
    const ids = PLAY_FIXTURE.choices.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('wallet fixture', () => {
  it('has a non-negative balance and exactly one ineligible package', () => {
    expect(WALLET_FIXTURE.balanceCredits).toBeGreaterThanOrEqual(0);
    expect(WALLET_FIXTURE.packages.filter((p) => !p.eligible)).toHaveLength(1);
  });
});

describe('referral fixture', () => {
  it('emits a stable code and a matching shareable link', () => {
    expect(REFERRAL_FIXTURE.link.endsWith(REFERRAL_FIXTURE.code)).toBe(true);
  });
});

describe('settings fixture', () => {
  it('has three setting groups (memory / typography / physical)', () => {
    expect(SETTINGS_FIXTURE.map((g) => g.id)).toEqual(['memory', 'typography', 'physical']);
  });

  it('every group has at least one row', () => {
    for (const g of SETTINGS_FIXTURE) {
      expect(g.rows.length).toBeGreaterThan(0);
    }
  });
});
