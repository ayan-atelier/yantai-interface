import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERFACE_VERSION,
  compareVersions,
  repositoryURL,
  releaseCatalog,
  versionSnapshot,
  createVersionManager,
} from '../versions.js';
import fs from 'node:fs';

const catalog = JSON.parse(fs.readFileSync(new URL('../versions.json', import.meta.url), 'utf8'));

test('interface release metadata is valid and sortable', () => {
  assert.equal(INTERFACE_VERSION, '0.2.9');
  assert.equal(compareVersions('0.2.8', '0.2.7'), 1);
  assert.equal(compareVersions('0.2.8-dev1', '0.2.8'), -1);
  assert.equal(repositoryURL('https://github.com/ayan-atelier/yantai-interface/'), 'https://github.com/ayan-atelier/yantai-interface');
  assert.equal(releaseCatalog(catalog).latest, '0.2.9');
  assert.throws(() => repositoryURL('https://github.com/ayan-atelier/yantai-interface?x=1'), /仓库网址/);
});

test('versionSnapshot omits transient manager fields', () => {
  const snapshot = versionSnapshot({ enabled: true, versionBackup: { old: true }, updateState: { repository: 'x' } }, '0.2.6');
  assert.equal(snapshot.version, '0.2.6');
  assert.deepEqual(snapshot.settings, { enabled: true });
});

test('main branch updates use Tavern update endpoint and verify manifest', async () => {
  const settings = { enabled: true };
  let versionCalls = 0;
  let updateCalls = 0;
  let flushCalls = 0;
  const saved = [];
  const targetCommit = 'cb5a32c1fc839d70d350ebf546b96f7ca9dde8f3';
  const body = value => ({ ok: true, text: async () => typeof value === 'string' ? value : JSON.stringify(value) });
  const fetcher = async (address) => {
    const url = String(address);
    if (url.endsWith('/api/extensions/discover')) return body([{ name: 'third-party/yantai-interface', type: 'local' }]);
    if (url.endsWith('/api/extensions/version')) {
      versionCalls++;
      return body({ remoteUrl: 'https://github.com/ayan-atelier/yantai-interface', currentBranchName: 'main', currentCommitHash: versionCalls < 3 ? 'oldcommit0000000' : targetCommit });
    }
    if (url.endsWith('/version')) return body({ pkgVersion: '1.16.0' });
    if (url.endsWith('/api/extensions/branches')) return body([{ name: 'main', commit: targetCommit }, { name: 'origin/main', commit: targetCommit }]);
    if (url.endsWith('/api/extensions/update')) { updateCalls++; return body({ shortCommitHash: targetCommit.slice(0, 7) }); }
    if (url.endsWith('/manifest.json')) return body({ version: '0.2.9' });
    if (url.includes('raw.githubusercontent.com/ayan-atelier/yantai-interface/main/versions.json')) return body(catalog);
    throw new Error(`unexpected request ${url}`);
  };
  const manager = createVersionManager({
    settings: () => settings,
    save: () => { saved.push('save'); },
    flush: async () => { flushCalls++; },
    context: () => ({ getRequestHeaders: () => ({}) }),
    moduleURL: 'http://localhost:8000/scripts/extensions/third-party/yantai-interface/index.js',
    manifestURL: new URL('http://localhost:8000/manifest.json'),
    apiRoot: new URL('http://localhost:8000/'),
    fetcher,
    currentVersion: '0.2.6',
  });
  const checked = await manager.check();
  assert.equal(checked.latest.version, '0.2.9');
  assert.equal(checked.latest.branch, 'main');
  await manager.apply(checked, checked.latest);
  assert.equal(updateCalls, 1);
  assert.equal(settings.versionBackup.version, '0.2.6');
  assert.equal(manager.reloadNeeded, true);
  assert.ok(flushCalls >= 2);
  assert.ok(saved.length >= 1);
  manager.dispose();
});
