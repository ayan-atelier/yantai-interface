import test from 'node:test';
import assert from 'node:assert/strict';
import { extensionStyles } from '../src/extension-layout.js';

test('keeps native regex title and actions together on narrow screens and preserves regex grouping plugins', () => {
  assert.match(extensionStyles, /@media \(max-width:600px\)/);
  assert.match(extensionStyles, /\.flex-container:not\(\.checkbox\):not\(\.bai-bai-regex-group-title\):not\(\.regex_script_buttons\)/);
  assert.match(extensionStyles, /\.checkbox\.flex-container\{[\s\S]*?width:auto!important[\s\S]*?flex:0 0 auto!important/);
  assert.match(extensionStyles, /\.flex-container:not\(\.regex-script-label\):not\(\.regex_script_buttons\):not\(\.flexnowrap\):not\(\.regex-script-container\):not\(\.flexFlowColumn\):not\(\.bai-bai-regex-group-body\):not\(\.regex_bulk_operations\):not\(\.checkbox\)/);
  assert.match(extensionStyles, /\.regex-script-container\{[\s\S]*?flex-flow:column nowrap!important[\s\S]*?height:auto!important/);
  assert.match(extensionStyles, /\.bai-bai-regex-group-title\{[\s\S]*?flex:1 1 0%!important[\s\S]*?min-width:0!important/);
  assert.match(extensionStyles, /\.bai-bai-regex-group-collapsed > \.bai-bai-regex-group-body\{[\s\S]*?display:grid!important;grid-template-rows:0fr!important/);
  assert.match(extensionStyles, /\.regex-script-label:not\(\.pcm-ng-hidden\):not\(\[hidden\]\)\{[\s\S]*?flex-wrap:nowrap!important/);
  assert.match(extensionStyles, /\.regex_script_buttons\{[\s\S]*?flex-wrap:nowrap!important/);
  assert.match(extensionStyles, /#regex_container\{[\s\S]*?display:block!important;overflow-x:hidden!important/);
  assert.match(extensionStyles, /\.regex-script-label > \.flex-container:last-child > \.regex_script_buttons\{[\s\S]*?width:max-content!important/);
  assert.match(extensionStyles, /#regex_container input,[\s\S]*?#regex_container textarea/);
});
