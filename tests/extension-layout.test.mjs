import test from 'node:test';
import assert from 'node:assert/strict';
import { extensionStyles } from '../src/extension-layout.js';

test('keeps native regex title and actions together on narrow screens', () => {
  assert.match(extensionStyles, /@media \(max-width:600px\)/);
  assert.match(extensionStyles, /\.flex-container:not\(\.regex-script-label\):not\(\.regex_script_buttons\):not\(\.flexnowrap\)/);
  assert.match(extensionStyles, /\.regex-script-label\{[\s\S]*?flex-wrap:nowrap!important/);
  assert.match(extensionStyles, /\.regex_script_buttons\{[\s\S]*?flex-wrap:nowrap!important/);
  assert.match(extensionStyles, /#regex_container\{[\s\S]*?display:block!important;overflow-x:hidden!important/);
  assert.match(extensionStyles, /\.regex-script-label > \.flex-container:last-child > \.regex_script_buttons\{[\s\S]*?width:max-content!important/);
  assert.match(extensionStyles, /#regex_container input,[\s\S]*?#regex_container textarea/);
});
