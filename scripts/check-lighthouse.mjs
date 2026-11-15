import { readFile, writeFile } from 'node:fs/promises';
const file = process.argv[2] || 'docs/lighthouse-mobile.json';
const report = JSON.parse(await readFile(file, 'utf8'));
const scores = Object.fromEntries(
  Object.entries(report.categories).map(([key, category]) => [
    key,
    Math.round(category.score * 100),
  ]),
);
console.log(scores);
if (Object.values(scores).some((score) => score < 90)) process.exitCode = 1;
