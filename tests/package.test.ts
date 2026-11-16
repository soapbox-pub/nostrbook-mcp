import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('packed production install initializes, calls tools over stdio, and shuts down', { timeout: 60_000 }, async (t) => {
  const directory = await mkdtemp(join(process.env.TMPDIR ?? tmpdir(), 'nostrbook-package-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const pack = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', directory], { encoding: 'utf8' }));
  const tarball = join(directory, pack[0].filename);
  execFileSync('npm', ['install', '--prefix', directory, '--prefer-offline', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', tarball], { stdio: 'pipe', timeout: 45_000 });
  const server = createServer((req, res) => {
    if (req.url === '/01.md') res.end('NIP-01 fixture over real HTTP');
    else if (req.url === '/README.md') res.end('| `1` | note |');
    else { res.writeHead(404); res.end('Not found'); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve(directory, 'node_modules/@nostrbook/mcp/dist/mcp')],
    cwd: directory,
    env: { ...Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)), NIPS_URL_TEMPLATE: `http://127.0.0.1:${address.port}/{nip}.md` },
    stderr: 'pipe',
  });
  let stderr = '';
  transport.stderr?.on('data', (data) => { stderr += data.toString(); });
  const client = new Client({ name: 'package-test', version: '1' });
  t.after(() => client.close());
  await client.connect(transport);
  assert.equal((await client.listTools()).tools.length, 8);
  assert.deepEqual((await client.callTool({ name: 'read_nip', arguments: { nip: '01' } })).content,
    [{ type: 'text', text: 'NIP-01 fixture over real HTTP' }]);
  assert.equal((await client.callTool({ name: 'read_nip', arguments: { nip: 'FF' } })).isError, true);
  assert.notEqual((await client.callTool({ name: 'generate_kind', arguments: { range: 'addressable' } })).isError, true);
  const pid = transport.pid;
  assert.ok(pid);
  await client.close();
  assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  assert.equal(stderr, '');
});
