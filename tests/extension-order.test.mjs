import test from 'node:test';
import assert from 'node:assert/strict';
import { sortExtensions } from '../src/extension-order.js';

const row = (id, label = id) => ({ key: `id:${id}`, label, element: { id } });

test('orders the synthetic more group separately from native columns', () => {
  const rows = [
    row('jd-bookshelf-settings', '砚台 · 角色书架'),
    row('yt-interface-settings', '砚台 · 界面整理'),
    row('yt-memory-settings', '砚台 · 叙事记忆'),
    row('yt-sync-settings', '砚台 · 存档同步'),
    row('vectors_container', '向量存储'),
    row('regex_container', '正则'),
    row('tavern-helper-settings', '酒馆助手'),
  ];
  assert.deepEqual(sortExtensions(rows).map(x => x.element.id), [
    'regex_container', 'vectors_container', 'tavern-helper-settings',
    'yt-sync-settings',
    'yt-memory-settings', 'yt-interface-settings', 'jd-bookshelf-settings',
  ]);
});

test('keeps unknown extensions after the known groups', () => {
  const rows = [row('third-party-b', 'B'), row('third-party-a', 'A')];
  assert.deepEqual(sortExtensions(rows).map(x => x.element.id), ['third-party-a', 'third-party-b']);
});
