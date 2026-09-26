export const TOP_LABELS = Object.freeze({
  'ai-config-button':'回复参数与预设', 'sys-settings-button':'API 连接',
  'advanced-formatting-button':'回复格式', 'WI-SP-button':'世界书',
  'user-settings-button':'用户设置', 'backgrounds-button':'背景图片',
  'extensions-settings-button':'扩展', 'persona-management-button':'用户人设', 'rightNavHolder':'角色卡与群聊'
});
export const MENU_CHOICES = Object.freeze([
  ['option_toggle_AN','作者注释'], ['option_toggle_CFG','CFG 缩放'],
  ['option_toggle_logprobs','Token 概率'], ['option_convert_to_group','转换为群聊'], ['option_impersonate','AI 帮答']
]);
export const EXTENSION_DEFAULTS = Object.freeze(['assets_container','expressions_container','sd_container','tts_container','qr_container','translation_container','caption_container','summarize_container'].map(id=>'id:'+id));
export const USER_SECTIONS = Object.freeze([
  {key:'theme',selector:'#UI-Theme-Block > [name="themeElements"]',label:'主题细节与显示开关',description:'头像样式、颜色、字号、模糊和疯狂实验室模式'},
  {key:'character',selector:'#UI-Customization > [name="CharacterHandlingToggles"]',label:'角色卡相关',description:'角色列表、标签导入、角色提示词与头像'},
  {key:'misc',selector:'#UI-Customization > [name="MiscellaneousToggles"]',label:'其他偏好与自定义样式',description:'流式显示、音效、界面移动和自定义 CSS'},
  {key:'chat',selector:'#power-user-option-checkboxes > [name="ChatMessageHandlingToggles"]',label:'聊天与消息设置',description:'历史加载、流式刷新、消息操作和自动续写'},
  {key:'script',selector:'#power-user-option-checkboxes > [name="STscriptToggles"]',label:'脚本与高级选项',description:'宏和脚本解析相关开关'}
]);
export const DEFAULTS = Object.freeze({ enabled:true, hiddenTop:[], foldMenu:true,
  foldedTools:MENU_CHOICES.map(x=>x[0]), toolsExpanded:false, foldPresets:true,
  generationOpen:false, advancedOpen:false, hiddenWand:[],
  foldExtensions:true, foldedExtensions:EXTENSION_DEFAULTS, extensionsExpanded:false, foldExtras:true, extensionOrder:[],
  foldUserSettings:true, foldedUserSections:USER_SECTIONS.map(x=>x.key), userOpen:{} });
export function normalize(value = {}) {
  const data = value && typeof value === 'object' ? value : {};
  const out = { ...DEFAULTS, ...data };
  for (const key of ['enabled','foldMenu','toolsExpanded','foldPresets','generationOpen','advancedOpen','foldExtensions','extensionsExpanded','foldExtras','foldUserSettings']) out[key] = typeof out[key] === 'boolean' ? out[key] : DEFAULTS[key];
  for (const key of ['hiddenTop','hiddenWand','foldedExtensions','extensionOrder']) out[key] = [...new Set((Array.isArray(out[key]) ? out[key] : DEFAULTS[key]).filter(x=>typeof x === 'string' && x.length < 500))].slice(0,500);
  out.foldedTools = MENU_CHOICES.map(x=>x[0]).filter(x=>(Array.isArray(data.foldedTools) ? data.foldedTools : DEFAULTS.foldedTools).includes(x));
  out.foldedUserSections = USER_SECTIONS.map(x=>x.key).filter(x=>(Array.isArray(data.foldedUserSections) ? data.foldedUserSections : DEFAULTS.foldedUserSections).includes(x));
  out.userOpen = Object.fromEntries(USER_SECTIONS.map(x=>[x.key,data.userOpen?.[x.key] === true]));
  return out;
}
export function createSettings(host, onChange) {
  const c = host.context();
  if (!c?.extensionSettings || typeof c.saveSettingsDebounced !== 'function') throw new Error('酒馆设置尚未就绪，请刷新后再试。');
  let data = c.extensionSettings.yantaiInterface;
  if (!data) {
    const legacy = c.extensionSettings.yantai?.focus;
    const oldNames = { backgrounds:'backgrounds-button',advanced:'advanced-formatting-button',persona:'persona-management-button',worldbook:'WI-SP-button',generation:'ai-config-button' };
    data = normalize(legacy?.enabled ? { hiddenTop:(legacy.hidden || []).map(k=>oldNames[k]).filter(Boolean) } : {});
  } else data = normalize(data);
  c.extensionSettings.yantaiInterface = data;
  return { get:()=>data, update(patch) {
    data = normalize({ ...data, ...patch }); host.context().extensionSettings.yantaiInterface = data;
    onChange?.(data); host.context().saveSettingsDebounced(); return data;
  } };
}
