import { assertEquals } from '@std/assert';

import { llmstxtUrl } from './llmstxt.ts';

Deno.test('llmstxtUrl', () => {
  const testCases = [
    {
      input: 'https://example.com',
      expected: 'https://example.com/index.md',
    },
    {
      input: 'https://example.com/',
      expected: 'https://example.com/index.md',
    },
    {
      input: 'https://example.com/test',
      expected: 'https://example.com/test.md',
    },
    {
      input: 'https://example.com/test/',
      expected: 'https://example.com/test/index.md',
    },
    {
      input: 'https://example.com/test.md',
      expected: 'https://example.com/test.md',
    },
  ];

  for (const { input, expected } of testCases) {
    const result = llmstxtUrl(input);
    assertEquals(result.toString(), expected);
  }
});
