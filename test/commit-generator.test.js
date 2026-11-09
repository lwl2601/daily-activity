import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getRandomInt,
  pickRandomMessages,
  generateTimestampsForDay,
  generateDateRange,
  buildCommitPlan,
  parseArgs
} from '../src/commit-generator.js';

describe('commit-generator', () => {
  it('gera quantidade aleatória dentro do intervalo [10, 20]', () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) {
      const val = getRandomInt(10, 20);
      assert.ok(val >= 10 && val <= 20, `Valor fora do intervalo: ${val}`);
      seen.add(val);
    }
    assert.ok(seen.size > 5, 'Deve variar os valores gerados entre os dias');
  });

  it('lança erro para intervalos inválidos em getRandomInt', () => {
    assert.throws(() => getRandomInt(20, 10), RangeError);
    assert.throws(() => getRandomInt(0, 10), RangeError);
  });

  it('gera timestamps ordenados cronologicamente para um dia', () => {
    const timestamps = generateTimestampsForDay('2026-09-08', 15);
    assert.equal(timestamps.length, 15);
    for (let i = 1; i < timestamps.length; i++) {
      assert.ok(timestamps[i] >= timestamps[i - 1], 'Timestamps devem estar em ordem crescente');
      assert.match(timestamps[i], /^2026-09-08T\d{2}:\d{2}:\d{2}-03:00$/);
    }
  });

  it('seleciona mensagens aleatórias seguindo padrão conventional commits', () => {
    const msgs = pickRandomMessages(20);
    assert.equal(msgs.length, 20);
    for (const msg of msgs) {
      assert.match(msg, /^(chore|docs|refactor|feat|perf)(\([a-z]+\))?: .+$/);
    }
  });

  it('gera intervalo de datas corretamente no modo backfill e daily', () => {
    const ref = new Date('2026-11-09T12:00:00Z');
    const dates = generateDateRange(7, ref);
    assert.equal(dates.length, 8); // 7 dias atrás até hoje inclusive
    assert.equal(dates[0], '2026-11-02');
    assert.equal(dates[dates.length - 1], '2026-11-09');

    const dailyPlan = buildCommitPlan({ mode: 'daily', min: 10, max: 20, referenceDate: ref });
    assert.ok(dailyPlan.length >= 10 && dailyPlan.length <= 20);
    assert.ok(dailyPlan.every((p) => p.date === '2026-11-09'));
  });

  it('faz parse dos argumentos de linha de comando', () => {
    const parsed = parseArgs(['--mode=backfill', '--min=12', '--max=18', '--days=30', '--dry-run']);
    assert.deepEqual(parsed, {
      mode: 'backfill',
      min: 12,
      max: 18,
      days: 30,
      dryRun: true
    });
  });
});
