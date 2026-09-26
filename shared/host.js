/** Native SillyTavern bridge. No Tavern Helper dependency or credentials access. */
export function createHost() {
  const context = () => globalThis.SillyTavern?.getContext?.() || null;
  function currentChat() {
    const c = context();
    if (!c) return null;
    const id = c.chatId ?? c.getCurrentChatId?.();
    const isGroup = c.groupId !== undefined && c.groupId !== null && c.groupId !== '';
    const hasChar = c.characterId !== undefined && c.characterId !== null && c.characterId !== '';
    if ((!isGroup && !hasChar) || !id) return null;
    const char = hasChar ? c.characters?.[c.characterId] : null;
    const group = isGroup ? c.groups?.find(g => String(g.id) === String(c.groupId)) : null;
    const avatar = isGroup ? String(c.groupId) : char?.avatar;
    return { key: JSON.stringify([avatar || '', id]), id, name: group?.name || char?.name || c.name2 || '当前故事', avatar,
      characterId: c.characterId, isGroup, messages: c.chat || [], metadata: c.chatMetadata || {}, context: c };
  }
  async function request(path, options = {}) {
    const target = new URL(path, location.origin);
    if (target.origin !== location.origin) throw new Error('此接口只接受当前酒馆的地址。');
    const method = options.method || 'POST';
    const body = options.body;
    const response = await fetch(target, {
      ...options, method, credentials: 'same-origin', cache: 'no-store',
      headers: { ...(context()?.getRequestHeaders?.() || { 'Content-Type': 'application/json' }), ...options.headers },
      ...(body === undefined ? {} : { body: typeof body === 'string' || body instanceof Blob || body instanceof FormData ? body : JSON.stringify(body) }),
    });
    if (!response.ok) throw new Error(`酒馆接口返回 HTTP ${response.status}，请检查酒馆是否仍在运行。`);
    if (response.status === 204) return null;
    const data = await response.text();
    if (!data) return null;
    try { return JSON.parse(data); } catch { throw new Error('酒馆接口没有返回有效的 JSON。'); }
  }
  function on(name, handler) {
    const c = context(); const types = c?.eventTypes || c?.event_types;
    const event = types?.[name]; const source = c?.eventSource;
    if (!event || !source?.on) return () => {};
    source.on(event, handler);
    return () => (source.removeListener || source.off)?.call(source, event, handler);
  }
  function toast(message, kind = 'info') {
    if (globalThis.toastr?.[kind]) globalThis.toastr[kind](String(message), '砚台', { escapeHtml: true });
    else {
      const el = document.createElement('div'); el.className = 'yt-toast'; el.role = 'status'; el.textContent = String(message);
      document.body.append(el); setTimeout(() => el.remove(), 7000);
    }
  }
  function download(filename, data, mime = 'text/plain;charset=utf-8') {
    const blob = data instanceof Blob ? data : new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: mime });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = filename.replace(/[\\/:*?"<>|]/g, '-'); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function saveMetadata() {
    const c = context();
    if (!currentChat()) throw new Error('请先打开一个聊天。');
    if (typeof c.saveMetadata === 'function') await c.saveMetadata();
    else if (typeof c.saveChat === 'function') await c.saveChat();
    else throw new Error('当前酒馆没有提供聊天保存接口。');
    // ST catches its own errors. Callers requiring durable binding must read back.
  }
  function capabilities() {
    const c = context() || {};
    return { context: !!context(), settings: !!c.extensionSettings && typeof c.saveSettingsDebounced === 'function',
      worldbook: typeof c.loadWorldInfo === 'function', chat: typeof c.saveMetadata === 'function' || typeof c.saveChat === 'function',
      mainApi: !!c.ChatCompletionService, events: !!c.eventSource, bookshelf: typeof c.selectCharacterById === 'function' };
  }
  return { context, currentChat, request, on, toast, download, saveMetadata, capabilities };
}
