import { assertEquals } from '@std/assert';

import { HTTPError } from './HTTPError.ts';

Deno.test('HTTPError', () => {
  const request = new Request('https://example.com/api');
  const response = new Response('Not Found', { status: 404 });

  const error = new HTTPError(response, request);

  assertEquals(error.name, 'HTTPError');
  assertEquals(error.message, 'HTTP Error: 404 GET https://example.com/api');
  assertEquals(error.response, response);
  assertEquals(error.request, request);
});
