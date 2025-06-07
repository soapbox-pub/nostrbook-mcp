import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { HTTPError } from './HTTPError.ts';

test('HTTPError', () => {
  const request = new Request('https://example.com/api');
  const response = new Response('Not Found', { status: 404 });

  const error = new HTTPError(response, request);

  assert.equal(error.name, 'HTTPError');
  assert.equal(error.message, 'HTTP Error: 404 GET https://example.com/api');
  assert.equal(error.response, response);
  assert.equal(error.request, request);
});
