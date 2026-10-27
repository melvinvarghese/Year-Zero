// Audit runtime asset paths and module syntax with Node alone.
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=resolve(new URL('..',import.meta.url).pathname);
const sources=['index.html','styles.css','app.js','simulation.mjs','world-geometry.mjs','living-scene.mjs','sw.js'];
let references=0;
for(const file of sources){
 const source=readFileSync(resolve(root,file),'utf8');
 const pattern=file.endsWith('.html')?/(?:src|href)="([^"#]+)"/g:file.endsWith('.css')?/url\(['"]?([^'"\)]+)['"]?\)/g:/from\s+['"]([^'"]+)['"]/g;
 for(const match of source.matchAll(pattern)){
  const target=match[1];if(target.startsWith('http')||target.startsWith('data:'))continue;
  assert.ok(!target.startsWith('/'),`Absolute path in ${file}: ${target}`);
  assert.ok(existsSync(resolve(root,dirname(file),target)),`Missing ${target}`);references++;
 }
 if(/\.(?:mjs|js)$/.test(file))execFileSync(process.execPath,['--check',resolve(root,file)]);
}
assert.ok(existsSync(resolve(root,'.nojekyll')));
const sw=readFileSync(resolve(root,'sw.js'),'utf8');
for(const [,file] of sw.matchAll(/['"]\.\/([^'"]*)['"]/g))assert.ok(existsSync(resolve(root,file)),`Cache reference missing: ${file}`);
console.log(`PASS: ${sources.length} runtime files; ${references} local references; module syntax; cache assets; .nojekyll.`);
