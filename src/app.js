import { createHost } from '../shared/host.js';
import { createPanel, node, button } from '../shared/ui.js';
import { installEntries } from '../shared/entries.js';
import { createSettings, MENU_CHOICES, EXTENSION_DEFAULTS, USER_SECTIONS } from './settings.js';
import { createController } from './controller.js';

export async function createInterfaceApp() {
  const host=createHost(),panel=createPanel('yt-interface-dialog','界面整理',{version:'0.3.1'});
  let controller,applyChanges=true,alive=true,query='',rowNumber=0;
  const opened=new Set(['menus']);
  const settings=createSettings(host,()=>{if(applyChanges)controller?.apply();});
  function update(patch,apply=true){
    applyChanges=apply;
    try{return settings.update(patch);}
    catch(error){host.toast(error.message||'设置未能保存，请刷新后重试。','error');}
    finally{applyChanges=true;}
  }
  controller=createController(settings.get,update,host);
  function change(patch){update(patch);render();}
  function changeChoice(key,value,checked){const set=new Set(settings.get()[key]);checked?set.add(value):set.delete(value);change({[key]:[...set]});}
  function toggle(label,checked,fn,detail){
    const wrap=node('label',undefined,'yt-if-setting'),check=node('input');check.type='checkbox';check.checked=checked;check.id='yt-if-setting-'+(++rowNumber);
    check.addEventListener('change',()=>fn(check.checked));
    const copy=node('span');copy.append(node('span',label));if(detail)copy.append(node('small',detail));
    wrap.append(check,copy);wrap.dataset.search=(label+' '+(detail||'')).toLowerCase();return wrap;
  }
  function section(key,title,description,count){
    const e=node('details',undefined,'yt-if-category');e.dataset.category=key;e.open=opened.has(key);
    const summary=node('summary'),copy=node('span');copy.append(node('strong',title));if(count)copy.append(node('small',count));summary.append(copy);
    const body=node('div',undefined,'yt-if-category-body');body.append(node('p',description,'yt-muted'));
    e.append(summary,body);e.addEventListener('toggle',()=>{if(e.isConnected&&!query){e.open?opened.add(key):opened.delete(key);}});
    e.dataset.search=(title+' '+description).toLowerCase();return {e,body};
  }
  function filterSections(){
    const word=query.trim().toLowerCase();
    for(const e of panel.content.querySelectorAll('.yt-if-category')){
      const sectionMatch=e.dataset.search.includes(word),rows=[...e.querySelectorAll('.yt-if-setting')];
      for(const row of rows)row.hidden=!!word&&!sectionMatch&&!row.dataset.search.includes(word);
      const matched=!word||sectionMatch||rows.some(r=>!r.hidden);
      e.hidden=!matched;e.open=word?matched:opened.has(e.dataset.category);
    }
    const empty=panel.content.querySelector('.yt-if-no-match');if(empty)empty.hidden=!word||[...panel.content.querySelectorAll('.yt-if-category')].some(e=>!e.hidden);
  }
  function restore(){
    update({enabled:false,hiddenTop:[],foldMenu:false,foldPresets:false,hiddenWand:[],foldExtensions:false,foldUserSettings:false});
    if(panel.dialog.open)render();host.toast('已恢复原来的入口和设置显示。','success');
  }
  function render(){
    if(!alive)return;
    const target=panel.content,scroll=target.scrollTop,focused=document.activeElement?.id;
    const s=settings.get();target.replaceChildren();rowNumber=0;
    target.append(node('p','按按钮所在的位置整理界面。只收起入口和设置区域，插件仍会运行；需要停用插件时，请到「扩展 → 管理扩展」。','yt-muted'));
    if(document.getElementById('yantai-dialog'))target.append(node('p','旧版砚台仍在运行，可能同时调整界面。请先停用旧版并刷新。','yt-notice'));
    target.append(toggle('开启界面整理',s.enabled,checked=>change({enabled:checked})));
    const actions=node('div',undefined,'yt-inline');
    actions.append(button('恢复原界面',restore),button('重新识别入口',()=>{controller.apply();render();host.toast('已重新读取当前菜单和扩展列表。','success');}));target.append(actions);
    const search=node('input',undefined,'yt-input yt-if-search');search.type='search';search.placeholder='搜索设置项或插件名称';search.setAttribute('aria-label','搜索界面整理设置');search.id='yt-if-search';search.value=query;
    search.addEventListener('input',()=>{query=search.value;filterSections();});target.append(search);

    const choices=controller.topChoices();
    const top=section('top','顶部按钮','位置：屏幕顶部的一排图标。勾选＝显示，取消勾选＝隐藏。全部隐藏后会收起空栏；可随时从三横菜单回到这里恢复。',choices.length+' 个入口');
    if(!choices.length)top.body.append(node('p','未找到原生顶部栏，当前主题可能使用了其他结构。','yt-notice'));
    const grid=node('div',undefined,'yt-if-choices');
    for(const c of choices)grid.append(toggle(c.label,!s.hiddenTop.includes(c.key),show=>changeChoice('hiddenTop',c.key,!show)));
    top.body.append(grid,button('全部显示',()=>change({hiddenTop:[]})));target.append(top.e);

    const menu=section('menus','三横菜单','位置：输入栏左侧的三条横线。勾选的工具会收进「更多工具」，展开后照常使用。','常用操作留在外面');
    menu.body.append(toggle('收起不常用工具',s.foldMenu,checked=>change({foldMenu:checked})));
    for(const [id,label] of MENU_CHOICES)menu.body.append(toggle('收起「'+label+'」',s.foldedTools.includes(id),checked=>changeChoice('foldedTools',id,checked)));
    target.append(menu.e);

    const wandChoices=controller.inventory.wandChoices();
    const wand=section('wand','魔法棒入口','位置：输入栏左侧的魔法棒。勾选＝显示，取消勾选＝隐藏。入口隐藏后，插件的后台功能仍可能继续运行。',wandChoices.length+' 个已识别入口');
    if(!wandChoices.length)wand.body.append(node('p','暂时没有识别到入口。可先展开一次魔法棒，再点上方「重新识别入口」。','yt-muted'));
    for(const c of wandChoices)wand.body.append(toggle(c.label,!s.hiddenWand.includes(c.key),show=>changeChoice('hiddenWand',c.key,!show)));
    wand.body.append(button('全部显示',()=>change({hiddenWand:[]})));target.append(wand.e);

    const extChoices=controller.inventory.extensionChoices();
    const ext=section('extensions','扩展页收纳','位置：顶部拼图／积木图标打开的扩展设置页。「更多扩展设置」在上方，其后为系统工具、酒馆助手和砚台。勾选＝收进「更多」，取消勾选＝留在外面。',extChoices.length+' 组已识别设置');
    ext.body.append(toggle('启用扩展页收纳',s.foldExtensions,checked=>change({foldExtensions:checked})));
    if(document.getElementById('extensions_url'))ext.body.append(toggle('收起旧扩展 API（已弃用）',s.foldExtras,checked=>change({foldExtras:checked}),'放进同一个「更多扩展设置」；已有连接设置保持原样。'));
    if(!extChoices.length)ext.body.append(node('p','暂时没有找到可收纳的原生折叠栏。未知布局会保持原样。','yt-muted'));
    for(const c of extChoices)ext.body.append(toggle(c.label,s.foldedExtensions.includes(c.key),checked=>changeChoice('foldedExtensions',c.key,checked)));
    const extActions=node('div',undefined,'yt-inline');extActions.append(button('全部留在外面',()=>change({foldedExtensions:[]})),button('使用建议收纳',()=>change({enabled:true,foldExtensions:true,foldedExtensions:[...EXTENSION_DEFAULTS],extensionsExpanded:false})));
    ext.body.append(extActions,node('p','其他第三方插件按首次识别顺序记住，新增项接在后面。这不是安装日期；刷新不会按加载快慢重新排序。「界面整理」本身始终保留，方便恢复。','yt-muted'));target.append(ext.e);

    const preset=section('presets','预设与生成参数','位置：顶部最左侧的回复参数与预设页。参数折成两行，提示词列表仍能直接操作。','生成参数 / 高级设置');
    preset.body.append(toggle('折叠聊天补全参数区',s.foldPresets,checked=>change({foldPresets:checked}),'展开状态会记住；折叠不会改变参数或提示词开关。'));
    if(controller.status().presets<2)preset.body.append(node('p','部分原生参数区域尚未找到，无法识别的区域保持原样。','yt-muted'));
    const lab=document.getElementById('enableLabMode');
    if(lab){
      const note=node('div',undefined,'yt-notice');note.append(node('strong','疯狂实验室模式：'+(lab.checked?'已开启':'未开启')),
        node('p','这是酒馆的参数范围解锁开关，主题也可能带入这项设置。想关闭时，在原生设置里取消勾选即可。'));
      note.append(button('定位疯狂实验室开关',()=>{panel.close();if(!controller.userFolds.revealLabMode())host.toast('当前未找到原生开关。请在用户设置中搜索「疯狂实验室」。','info');}));preset.body.append(note);
    }
    target.append(preset.e);

    const available=new Set(controller.userFolds.available().map(c=>c.key));
    const users=section('user','用户设置分组','位置：顶部用户设置图标。把较长的选项按用途折叠，点标题展开；搜索原生设置时会暂时展开。','主题 / 角色卡 / 聊天 / 其他偏好');
    users.body.append(toggle('简化用户设置页面',s.foldUserSettings,checked=>change({foldUserSettings:checked})));
    for(const item of USER_SECTIONS)if(available.has(item.key))users.body.append(toggle('折叠「'+item.label+'」',s.foldedUserSections.includes(item.key),checked=>changeChoice('foldedUserSections',item.key,checked),item.description));
    if(!available.size)users.body.append(node('p','当前未找到标准用户设置分组，其他功能仍可使用。','yt-muted'));
    users.body.append(node('p','主题选择、账号、语言和搜索仍在原处。更深层的原生折叠栏继续按酒馆自己的方式展开。','yt-muted'));target.append(users.e);
    target.append(node('p','没有匹配项，可换个名称搜索。','yt-if-no-match yt-muted'));
    filterSections();target.scrollTop=scroll;
    if(focused?.startsWith('yt-if-setting-'))document.getElementById(focused)?.focus({preventScroll:true});
  }
  function open(){controller.apply();panel.open();render();}
  const entries=installEntries({id:'yt-interface',label:'界面整理',glyph:'fa-sliders',order:90,open,host,extraActions:[['恢复原界面',restore]]});
  document.addEventListener('yantai:interface:open',open);
  return {open,close:panel.close,settings,controller,restore,destroy(){alive=false;controller.destroy();entries.destroy();document.removeEventListener('yantai:interface:open',open);panel.destroy();}};
}
