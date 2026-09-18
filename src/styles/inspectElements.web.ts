const applyClasses = (element: Element) => {
  const names = element.getAttribute(`data-vc-class`)?.split(/\s+/).filter(Boolean) ?? [];
  const missing = names.filter(name => !element.classList.contains(name));
  if (missing.length) element.classList.add(...missing);
};

const labelTree = (element: Element) => {
  applyClasses(element);
  element.querySelectorAll(`[data-vc-class]`).forEach(applyClasses);
};

// React Native Web replaces className with generated styles; retain authored inspector names.
if (typeof document !== `undefined`) {
  const registry = globalThis as typeof globalThis & { visitCollectorClassObserver?: MutationObserver };
  registry.visitCollectorClassObserver?.disconnect();
  labelTree(document.documentElement);
  const observer = new MutationObserver(records => {
    const changed = new Set<Element>();
    records.forEach(record => {
      if (record.type === `attributes` && record.target instanceof Element) changed.add(record.target);
      else record.addedNodes.forEach(node => {
        if (node instanceof Element) labelTree(node);
      });
    });
    changed.forEach(applyClasses);
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: [`class`, `data-vc-class`] });
  registry.visitCollectorClassObserver = observer;
}

export {};
