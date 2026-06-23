'use strict';

const { parseJsonFromText } = require('../anthropicClient');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function run() {
  const clean = parseJsonFromText('{"summary":"ok","advice":["a"]}');
  assert(clean.summary === 'ok', 'plain JSON');

  const fenced = parseJsonFromText('```json\n{"summary":"fenced"}\n```');
  assert(fenced.summary === 'fenced', 'fenced JSON');

  const truncated =
    '{"summary":"x","primaryResources":[{"title":"a","url":"https://x.com","why":"y"},{"title":"b","url":"https://y.com","why":"z"';
  const repaired = parseJsonFromText(truncated);
  assert(repaired.summary === 'x', 'truncated JSON repair');
  assert(Array.isArray(repaired.primaryResources), 'truncated array repaired');

  const trailingComma = parseJsonFromText('{"a":[1,2,], "b": "c",}');
  assert(trailingComma.a.length === 2, 'trailing comma fix');

  console.log('Unit OK — JSON repair');
}

try {
  run();
} catch (e) {
  console.error('Unit FAILED:', e.message);
  process.exit(1);
}
