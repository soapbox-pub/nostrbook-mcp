import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { KindGenerator } from './KindGenerator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('exhausted kind ranges never return occupied kinds', () => {
  const used = new Set(Array.from({ length: 9000 }, (_, i) => i + 1000));
  assert.throws(() => KindGenerator.generateAvailableKind('regular', used), /No available kind/);
});

test('abbreviated multi-digit kind ranges', () => {
  const used = KindGenerator.extractUsedKinds('| `39000-99` | range |');
  assert.equal(used.size, 100);
  assert.equal(used.has(39099), true);
});

test('kind parsing stays within the event kinds table and accepts spaced ranges', () => {
  const used = KindGenerator.extractUsedKinds('## NIPs\n| `99` | NIP |\n## Event Kinds\n| `5000` – `5002` | range |\n## Tags\n| `42` | tag |');
  assert.deepEqual([...used], [5000, 5001, 5002]);
});

test('KindGenerator', async (t) => {
  await t.test('extractUsedKinds with real NIPs fixture', async () => {
    const nipsIndex = await readFile(join(__dirname, 'fixtures', 'NIPs.md'), 'utf-8');
    const usedKinds = KindGenerator.extractUsedKinds(nipsIndex);

    // Check that some expected kinds are extracted from the real NIPs index
    const expectedKinds = [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      20,
      21,
      22,
      30,
      31,
      32,
      33,
      40,
      41,
      42,
      43,
      44,
      62,
      64,
      818,
      1018,
      1021,
      1022,
      1040,
      1059,
      1063,
      1068,
      1111,
      1311,
      1337,
      1617,
      1621,
      1622,
      1971,
      1984,
      1985,
      1986,
      1987,
      2003,
      2004,
      2022,
      4550,
      7000,
      7374,
      7375,
      7376,
      9041,
      9321,
      9467,
      9734,
      9735,
      9802,
      10000,
      10001,
      10002,
      10003,
      10004,
      10005,
      10006,
      10007,
      10009,
      10012,
      10013,
      10015,
      10019,
      10020,
      10030,
      10050,
      10063,
      10096,
      10166,
      13194,
      17375,
      21000,
      22242,
      23194,
      23195,
      24133,
      24242,
      27235,
      30000,
      30001,
      30002,
      30003,
      30004,
      30005,
      30007,
      30008,
      30009,
      30015,
      30017,
      30018,
      30019,
      30020,
      30023,
      30024,
      30030,
      30040,
      30041,
      30063,
      30078,
      30166,
      30267,
      30311,
      30315,
      30388,
      30402,
      30403,
      30617,
      30618,
      30818,
      30819,
      31234,
      31388,
      31890,
      31922,
      31923,
      31924,
      31925,
      31989,
      31990,
      32267,
      34550,
      38383,
      39089,
      39092,
      39701,
    ];

    for (const kind of expectedKinds) {
      assert.equal(
        usedKinds.has(kind),
        true,
        `Kind ${kind} should be extracted from NIPs index`,
      );
    }

    // Check that ranges are properly extracted
    // `5000`-`5999` should add all numbers from 5000 to 5999
    for (let i = 5000; i <= 5999; i++) {
      assert.equal(
        usedKinds.has(i),
        true,
        `Kind ${i} should be in range 5000-5999`,
      );
    }

    // `6000`-`6999` should add all numbers from 6000 to 6999
    for (let i = 6000; i <= 6999; i++) {
      assert.equal(
        usedKinds.has(i),
        true,
        `Kind ${i} should be in range 6000-6999`,
      );
    }

    // `9000`-`9030` should add all numbers from 9000 to 9030
    for (let i = 9000; i <= 9030; i++) {
      assert.equal(
        usedKinds.has(i),
        true,
        `Kind ${i} should be in range 9000-9030`,
      );
    }

    // `39000-9` should add all numbers from 39000 to 39009
    for (let i = 39000; i <= 39009; i++) {
      assert.equal(
        usedKinds.has(i),
        true,
        `Kind ${i} should be in range 39000-39009`,
      );
    }

    // `1630`-`1633` should add all numbers from 1630 to 1633
    for (let i = 1630; i <= 1633; i++) {
      assert.equal(
        usedKinds.has(i),
        true,
        `Kind ${i} should be in range 1630-1633`,
      );
    }
  });

  await t.test('extractUsedKinds with mock data', () => {
    const mockNipsIndex = `
## Event Kinds

| kind          | description                     | NIP                                    |
| ------------- | ------------------------------- | -------------------------------------- |
| \`0\`           | User Metadata                   | [01](01.md)                            |
| \`1\`           | Short Text Note                 | [10](10.md)                            |
| \`3\`           | Follows                         | [02](02.md)                            |
| \`1000\`-\`1999\` | Custom Range                    | [test](test.md)                        |
| \`30000\`       | Addressable Event               | [51](51.md)                            |
`;

    const usedKinds = KindGenerator.extractUsedKinds(mockNipsIndex);

    // Check individual kinds
    assert.equal(usedKinds.has(0), true);
    assert.equal(usedKinds.has(1), true);
    assert.equal(usedKinds.has(3), true);
    assert.equal(usedKinds.has(30000), true);

    // Check range
    for (let i = 1000; i <= 1999; i++) {
      assert.equal(
        usedKinds.has(i),
        true,
        `Kind ${i} should be in range 1000-1999`,
      );
    }
  });

  await t.test('getKindRangeInfo', () => {
    const regularRange = KindGenerator.getKindRangeInfo('regular');
    assert.equal(regularRange.min, 1000);
    assert.equal(regularRange.max, 9999);
    assert.equal(regularRange.name, 'Regular Events');

    const replaceableRange = KindGenerator.getKindRangeInfo('replaceable');
    assert.equal(replaceableRange.min, 10000);
    assert.equal(replaceableRange.max, 19999);

    const ephemeralRange = KindGenerator.getKindRangeInfo('ephemeral');
    assert.equal(ephemeralRange.min, 20000);
    assert.equal(ephemeralRange.max, 29999);

    const addressableRange = KindGenerator.getKindRangeInfo('addressable');
    assert.equal(addressableRange.min, 30000);
    assert.equal(addressableRange.max, 39999);
  });

  await t.test('generateAvailableKind', () => {
    const usedKinds = new Set([1000, 1001, 1002, 10000, 10001, 30000, 30001]);

    // Test regular range
    const regularKind = KindGenerator.generateAvailableKind(
      'regular',
      usedKinds,
    );
    assert.equal(regularKind >= 1000 && regularKind <= 9999, true);
    assert.equal(usedKinds.has(regularKind), false);
    // Check new constraints
    assert.equal(regularKind % 2 !== 0, true, 'Generated kind should be odd');
    assert.equal(regularKind % 5 !== 0, true, 'Generated kind should not be multiple of 5');
    // Check buffer constraint - should not be within 2 of any used kind
    for (const usedKind of usedKinds) {
      const distance = Math.abs(regularKind - usedKind);
      assert.equal(distance > 2, true, `Generated kind ${regularKind} should be more than 2 away from used kind ${usedKind}`);
    }

    // Test replaceable range
    const replaceableKind = KindGenerator.generateAvailableKind(
      'replaceable',
      usedKinds,
    );
    assert.equal(replaceableKind >= 10000 && replaceableKind <= 19999, true);
    assert.equal(usedKinds.has(replaceableKind), false);
    assert.equal(replaceableKind % 2 !== 0, true, 'Generated kind should be odd');
    assert.equal(replaceableKind % 5 !== 0, true, 'Generated kind should not be multiple of 5');

    // Test ephemeral range
    const ephemeralKind = KindGenerator.generateAvailableKind(
      'ephemeral',
      usedKinds,
    );
    assert.equal(ephemeralKind >= 20000 && ephemeralKind <= 29999, true);
    assert.equal(usedKinds.has(ephemeralKind), false);
    assert.equal(ephemeralKind % 2 !== 0, true, 'Generated kind should be odd');
    assert.equal(ephemeralKind % 5 !== 0, true, 'Generated kind should not be multiple of 5');

    // Test addressable range
    const addressableKind = KindGenerator.generateAvailableKind(
      'addressable',
      usedKinds,
    );
    assert.equal(addressableKind >= 30000 && addressableKind <= 39999, true);
    assert.equal(usedKinds.has(addressableKind), false);
    assert.equal(addressableKind % 2 !== 0, true, 'Generated kind should be odd');
    assert.equal(addressableKind % 5 !== 0, true, 'Generated kind should not be multiple of 5');
  });

  await t.test('generateAvailableKind constraints', () => {
    // Test buffer constraint specifically
    const usedKinds = new Set([1007, 1013, 1019]); // Use odd numbers that aren't multiples of 5
    
    const regularKind = KindGenerator.generateAvailableKind('regular', usedKinds);
    
    // Should be in range
    assert.equal(regularKind >= 1000 && regularKind <= 9999, true);
    
    // Should be odd
    assert.equal(regularKind % 2 !== 0, true, 'Generated kind should be odd');
    
    // Should not be multiple of 5
    assert.equal(regularKind % 5 !== 0, true, 'Generated kind should not be multiple of 5');
    
    // Should not be within buffer of used kinds
    const forbiddenNumbers = new Set([
      1005, 1006, 1007, 1008, 1009, // around 1007
      1011, 1012, 1013, 1014, 1015, // around 1013
      1017, 1018, 1019, 1020, 1021, // around 1019
    ]);
    
    assert.equal(forbiddenNumbers.has(regularKind), false, 
      `Generated kind ${regularKind} should not be in forbidden buffer zone`);
  });

  await t.test('generateAvailableKind edge cases', () => {
    // Test with many used kinds to ensure we still find valid ones
    const usedKinds = new Set<number>();
    
    // Fill most even numbers and multiples of 5 in a small range
    for (let i = 1000; i <= 1100; i++) {
      if (i % 2 === 0 || i % 5 === 0) {
        usedKinds.add(i);
      }
    }
    
    const regularKind = KindGenerator.generateAvailableKind('regular', usedKinds);
    
    // Should still find a valid kind
    assert.equal(regularKind >= 1000 && regularKind <= 9999, true);
    assert.equal(regularKind % 2 !== 0, true);
    assert.equal(regularKind % 5 !== 0, true);
    assert.equal(usedKinds.has(regularKind), false);
  });

  await t.test('generateAvailableKind randomness', async () => {
    const nipsIndex = await readFile(join(__dirname, 'fixtures', 'NIPs.md'), 'utf-8');
    const usedKinds = KindGenerator.extractUsedKinds(nipsIndex);

    // Generate many kinds and check distribution
    const results = new Map<number, number>();
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const kind = KindGenerator.generateAvailableKind('regular', usedKinds);
      results.set(kind, (results.get(kind) || 0) + 1);
      
      // Verify constraints on each generated kind
      assert.equal(kind % 2 !== 0, true, `Generated kind ${kind} should be odd`);
      assert.equal(kind % 5 !== 0, true, `Generated kind ${kind} should not be multiple of 5`);
      assert.equal(usedKinds.has(kind), false, `Generated kind ${kind} should not be in used kinds`);
    }

    // Check that we get good variety (at least 50 unique kinds in 1000 iterations)
    // Reduced from 100 due to additional constraints
    assert.equal(results.size >= 50, true, `Expected at least 50 unique kinds, got ${results.size}`);

    // Check that no single kind dominates (no kind should appear more than 15% of the time)
    // Increased threshold due to reduced available pool
    const maxFrequency = Math.max(...results.values());
    const maxFrequencyPercent = (maxFrequency / iterations) * 100;
    assert.equal(
      maxFrequencyPercent <= 15,
      true,
      `No kind should appear more than 15% of the time, but one appeared ${maxFrequencyPercent.toFixed(1)}% of the time`,
    );

    // Check that all generated kinds follow our constraints
    for (const [kind] of results) {
      assert.equal(kind % 2 !== 0, true, `Kind ${kind} should be odd`);
      assert.equal(kind % 5 !== 0, true, `Kind ${kind} should not be multiple of 5`);
      
      // Check buffer constraint
      for (const usedKind of usedKinds) {
        const distance = Math.abs(kind - usedKind);
        assert.equal(distance > 2, true, `Kind ${kind} should be more than 2 away from used kind ${usedKind}`);
      }
    }
  });
});
