import { describe, expect, it } from 'vitest';
import {
  IMAGE_CAROUSEL_FIXTURE,
  IMAGE_JOB_COMPLETED_FIXTURE,
  IMAGE_JOB_GENERATING_FIXTURE,
  IMAGE_JOB_PENDING_FIXTURE,
  IMAGE_JOB_QUEUED_FIXTURE,
  IMG_FIXTURE_URL,
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

// Pinned against `App\Models\ImageJob` + `ImageJobController`: a fixture
// that does not match the server makes the offline path lie.
describe('image job fixtures', () => {
  it('uses the server status values (pending, not queued)', () => {
    expect(IMAGE_JOB_PENDING_FIXTURE.status).toBe('pending');
    expect(IMAGE_JOB_GENERATING_FIXTURE.status).toBe('generating');
    expect(IMAGE_JOB_COMPLETED_FIXTURE.status).toBe('completed');
    expect(IMAGE_JOB_QUEUED_FIXTURE).toBe(IMAGE_JOB_PENDING_FIXTURE);
  });

  it('uses integer job ids so the poll route constraint accepts them', () => {
    for (const job of [
      IMAGE_JOB_PENDING_FIXTURE,
      IMAGE_JOB_GENERATING_FIXTURE,
      IMAGE_JOB_COMPLETED_FIXTURE,
    ]) {
      expect(Number.isInteger(job.job_id)).toBe(true);
      expect(`/image-jobs/${job.job_id}`).toMatch(/^\/image-jobs\/\d+$/);
    }
  });

  it('carries asset_url on the completed job and nothing on the pending one', () => {
    expect(IMAGE_JOB_PENDING_FIXTURE.asset_url).toBeNull();
    expect(IMAGE_JOB_COMPLETED_FIXTURE.asset_url).toBe(IMG_FIXTURE_URL);
  });

  it('gives every carousel asset the gallery fields the API returns', () => {
    expect(IMAGE_CAROUSEL_FIXTURE.length).toBeGreaterThan(0);
    for (const asset of IMAGE_CAROUSEL_FIXTURE) {
      expect(Number.isInteger(asset.id)).toBe(true);
      expect(asset.url).toBe(IMG_FIXTURE_URL);
      expect(asset.mime_type).not.toBeNull();
      expect(asset.created_at).not.toBeNull();
    }
  });
});
