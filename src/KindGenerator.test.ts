import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { KindGenerator } from './KindGenerator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

    // Test replaceable range
    const replaceableKind = KindGenerator.generateAvailableKind(
      'replaceable',
      usedKinds,
    );
    assert.equal(replaceableKind >= 10000 && replaceableKind <= 19999, true);
    assert.equal(usedKinds.has(replaceableKind), false);

    // Test ephemeral range
    const ephemeralKind = KindGenerator.generateAvailableKind(
      'ephemeral',
      usedKinds,
    );
    assert.equal(ephemeralKind >= 20000 && ephemeralKind <= 29999, true);
    assert.equal(usedKinds.has(ephemeralKind), false);

    // Test addressable range
    const addressableKind = KindGenerator.generateAvailableKind(
      'addressable',
      usedKinds,
    );
    assert.equal(addressableKind >= 30000 && addressableKind <= 39999, true);
    assert.equal(usedKinds.has(addressableKind), false);
  });
});
