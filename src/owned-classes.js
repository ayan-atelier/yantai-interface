// Add only our own classes. Do not replace theme classes or inline styles.
export function createClassOwner() {
  const owned = new Map();
  function sync(wanted = new Map()) {
    for (const [element, record] of owned) {
      for (const name of record.names) if (!wanted.get(element)?.has(name)) {
        element.classList.remove(name); record.names.delete(name);
      }
      if (!record.names.size) {
        if (!record.hadClass && !element.classList.length) element.removeAttribute('class');
        owned.delete(element);
      }
    }
    for (const [element, names] of wanted) for (const name of names) {
      if (element.classList.contains(name)) continue;
      let record = owned.get(element);
      if (!record) { record = {hadClass:element.hasAttribute('class'),names:new Set()}; owned.set(element,record); }
      record.names.add(name); element.classList.add(name);
    }
  }
  return {sync,clear:()=>sync()};
}

export function wantClass(wanted, element, name) {
  if (!element) return;
  if (!wanted.has(element)) wanted.set(element,new Set());
  wanted.get(element).add(name);
}
