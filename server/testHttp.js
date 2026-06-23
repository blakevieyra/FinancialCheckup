'use strict';

const http = require('http');

/** Minimal HTTP client for smoke/stress with shared cookie jar (httpOnly session auth). */
function createTestClient(port) {
  let cookieJar = '';

  function ingestCookies(headers) {
    const setCookie = headers['set-cookie'];
    if (!setCookie) return;
    const parts = (Array.isArray(setCookie) ? setCookie : [setCookie]).map((c) => c.split(';')[0]);
    const map = Object.fromEntries(
      cookieJar
        .split('; ')
        .filter(Boolean)
        .map((pair) => {
          const eq = pair.indexOf('=');
          return eq === -1 ? [pair, ''] : [pair.slice(0, eq), pair.slice(eq + 1)];
        }),
    );
    for (const part of parts) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      map[part.slice(0, eq)] = part.slice(eq + 1);
    }
    cookieJar = Object.entries(map)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  function req(method, pathname, jsonBody, bearer) {
    return new Promise((resolve, reject) => {
      const body =
        jsonBody === undefined ? null : typeof jsonBody === 'string' ? jsonBody : JSON.stringify(jsonBody);

      const opts = {
        hostname: '127.0.0.1',
        port,
        path: pathname,
        method,
        headers: {},
      };

      if (body !== null && body !== '') {
        opts.headers['Content-Type'] = 'application/json';
        opts.headers['Content-Length'] = Buffer.byteLength(body);
      }
      if (cookieJar) opts.headers.Cookie = cookieJar;
      if (bearer) opts.headers.Authorization = `Bearer ${bearer}`;

      const client = http.request(opts, (res) => {
        ingestCookies(res.headers);
        let raw = '';
        res.on('data', (c) => {
          raw += c;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      });
      client.on('error', reject);
      if (body) client.write(body);
      client.end();
    });
  }

  return { req, getCookieJar: () => cookieJar };
}

module.exports = { createTestClient };
