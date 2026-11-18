const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'components', 'RecipeModal.js'),
  'utf8'
);
const match = source.match(
  /const normalizeSteps = (\(value\) => \{[\s\S]*?\n  \});/
);
assert.ok(match, 'RecipeModal.js must define normalizeSteps');
const normalizeSteps = vm.runInNewContext(match[1], { String, Array });

assert.deepEqual(Array.from(normalizeSteps('Ugotuj ryż | Dodaj kurczaka\nPodawaj ciepłe')), [
  'Ugotuj ryż',
  'Dodaj kurczaka',
  'Podawaj ciepłe'
]);
assert.deepEqual(Array.from(normalizeSteps([' Jeden ', '', 'Dwa'])), ['Jeden', 'Dwa']);
assert.deepEqual(Array.from(normalizeSteps(undefined)), []);
assert.deepEqual(Array.from(normalizeSteps(null)), []);
assert.deepEqual(Array.from(normalizeSteps('')), []);

console.log('PASS: legacy recipe steps normalize from string and array values');
