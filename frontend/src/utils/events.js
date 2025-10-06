const authListeners = new Set();
const analyticsQueue = [];
let analyticsEnabled = true;

export function onAuthChanged(listener) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

export function emitAuthChanged() {
  authListeners.forEach((fn) => {
    try { fn(); } catch {}
  });
}

// Minimal analytics: logs to console and keeps a small queue for future backend send
export function track(event, props = {}) {
  try {
    const payload = {
      event,
      props,
      ts: Date.now()
    };
    analyticsQueue.push(payload);
    if (analyticsQueue.length > 100) analyticsQueue.shift();
    if (analyticsEnabled) {
      console.log('ANALYTICS', JSON.stringify(payload));
    }
  } catch {}
}

export function getAnalyticsBuffer() {
  return [...analyticsQueue];
}


