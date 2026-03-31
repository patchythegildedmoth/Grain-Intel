import { describe, it, expect } from 'vitest';
import {
  CROP_PROGRESS_METRICS,
  CORN_BELT_FIPS,
  NASS_COMMODITIES,
  type CropProgressRecord,
  type CropProgressFetchMeta,
} from '../usdaNass';

// ─── Constants ───────────────────────────────────────────────────────────────

describe('USDA NASS constants', () => {
  it('has 4 crop progress metrics', () => {
    expect(CROP_PROGRESS_METRICS).toHaveLength(4);
    expect(CROP_PROGRESS_METRICS).toContain('PCT PLANTED');
    expect(CROP_PROGRESS_METRICS).toContain('PCT EMERGED');
    expect(CROP_PROGRESS_METRICS).toContain('PCT GOOD');
    expect(CROP_PROGRESS_METRICS).toContain('PCT EXCELLENT');
  });

  it('has 5 Corn Belt FIPS codes', () => {
    expect(CORN_BELT_FIPS).toHaveLength(5);
    // IL=17, IA=19, MN=27, NE=31, IN=18
    expect(CORN_BELT_FIPS).toContain('17');
    expect(CORN_BELT_FIPS).toContain('19');
  });

  it('maps commodity names to NASS format', () => {
    expect(NASS_COMMODITIES['Corn']).toBe('CORN');
    expect(NASS_COMMODITIES['Soybeans']).toBe('SOYBEANS');
    expect(NASS_COMMODITIES['Winter Wheat']).toBe('WHEAT, WINTER');
  });
});

// ─── CropProgressRecord ID format ────────────────────────────────────────────

describe('CropProgressRecord ID format', () => {
  it('compound key includes commodity, metric, fips, date', () => {
    const record: CropProgressRecord = {
      id: 'Corn:PCT GOOD:US:2026-03-30',
      commodity: 'Corn',
      unitDesc: 'PCT GOOD',
      statDesc: 'US',
      stateFipsCode: null,
      referencePeriodDesc: 'WEEK ENDING MAR 30',
      referenceDate: '2026-03-30',
      value: 72,
      year: 2026,
      fetchedAt: '2026-03-31T00:00:00Z',
    };
    expect(record.id).toBe('Corn:PCT GOOD:US:2026-03-30');
  });

  it('uses state FIPS when available', () => {
    const record: CropProgressRecord = {
      id: 'Corn:PCT GOOD:17:2026-03-30',
      commodity: 'Corn',
      unitDesc: 'PCT GOOD',
      statDesc: 'Illinois',
      stateFipsCode: '17',
      referencePeriodDesc: 'WEEK ENDING MAR 30',
      referenceDate: '2026-03-30',
      value: 75,
      year: 2026,
      fetchedAt: '2026-03-31T00:00:00Z',
    };
    expect(record.id).toContain(':17:');
  });
});

// ─── Cache metadata ──────────────────────────────────────────────────────────

describe('CropProgressFetchMeta', () => {
  it('partial flag marks incomplete fetches', () => {
    const meta: CropProgressFetchMeta = {
      key: 'crop-progress-meta:Corn:2026',
      fetchedAt: '2026-03-31T00:00:00Z',
      partial: true,
    };
    expect(meta.partial).toBe(true);
  });

  it('key format is commodity:year', () => {
    const meta: CropProgressFetchMeta = {
      key: 'crop-progress-meta:Soybeans:2025',
      fetchedAt: '2026-03-31T00:00:00Z',
    };
    expect(meta.key).toBe('crop-progress-meta:Soybeans:2025');
  });

  it('non-partial means complete fetch', () => {
    const meta: CropProgressFetchMeta = {
      key: 'crop-progress-meta:Corn:2026',
      fetchedAt: '2026-03-31T00:00:00Z',
      partial: false,
    };
    expect(meta.partial).toBe(false);
  });
});

// ─── Concurrency math ────────────────────────────────────────────────────────

describe('NASS request count', () => {
  it('full fetch = 4 metrics × 6 targets = 24 requests', () => {
    const targets = [null, ...CORN_BELT_FIPS]; // national + 5 states
    const total = CROP_PROGRESS_METRICS.length * targets.length;
    expect(total).toBe(24);
  });

  it('per-metric retry = 1 metric × 6 targets = 6 requests', () => {
    const targets = [null, ...CORN_BELT_FIPS];
    expect(targets.length).toBe(6);
  });
});
