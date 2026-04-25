const p = require('../../package.json');
const checks = ['bin', 'engines', 'files', 'repository', 'keywords'];
checks.forEach(c => {
  const val = p[c];
  const ok = val && (Array.isArray(val) ? val.length > 0 : Object.keys(val).length > 0);
  console.log(c + ': ' + (ok ? 'PASS' : 'FAIL') + ' -> ' + JSON.stringify(val));
});
console.log('keywords_count: ' + p.keywords.length + (p.keywords.length >= 10 ? ' PASS' : ' FAIL'));
console.log('version: ' + p.version + (p.version === '3.0.0' ? ' PASS' : ' FAIL'));
console.log('main_preserved: ' + p.main + (p.main === 'dist/index.js' ? ' PASS' : ' FAIL'));
console.log('types_preserved: ' + p.types + (p.types === 'dist/index.d.ts' ? ' PASS' : ' FAIL'));
console.log('exports_preserved: ' + (p.exports ? Object.keys(p.exports).length + ' entries PASS' : ' FAIL'));
console.log('scripts_preserved: ' + (p.scripts.build === 'tsc' && p.scripts.test === 'jest' ? 'PASS' : 'FAIL'));
console.log('deps_unchanged: ' + (p.dependencies.yaml ? 'PASS' : 'FAIL'));
