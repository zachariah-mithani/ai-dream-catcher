const authListeners = new Set();

export function onAuthChanged(listener) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

export function emitAuthChanged() {
  authListeners.forEach((fn) => {
    try { fn(); } catch {}
  });
}


