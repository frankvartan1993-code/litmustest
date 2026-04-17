'use strict';
const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');

function req(port, opts, body) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, ...opts }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

test('server smoke: /health returns 200', async (t) => {
  const port = 3456;
  const env = { ...process.env, PORT: String(port), APP_PASSWORD: 'x', SESSION_SECRET: 'x', DATABASE_URL: '' };
  const child = spawn('node', [path.join(__dirname, '..', 'server.js')], { env, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  t.after(() => child.kill());
  const res = await req(port, { path: '/health', method: 'GET' });
  assert.equal(res.status, 200);
});

test('server smoke: root redirects to /login when unauthed', async (t) => {
  const port = 3457;
  const env = { ...process.env, PORT: String(port), APP_PASSWORD: 'x', SESSION_SECRET: 'x', DATABASE_URL: '' };
  const child = spawn('node', [path.join(__dirname, '..', 'server.js')], { env, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  t.after(() => child.kill());
  const res = await req(port, { path: '/', method: 'GET' });
  assert.equal(res.status, 302);
  assert.match(res.headers.location, /\/login/);
});
