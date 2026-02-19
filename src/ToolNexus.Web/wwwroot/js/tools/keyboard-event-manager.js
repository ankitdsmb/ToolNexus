const DEFAULT_EVENT_TYPE = 'keydown';

class KeyboardEventManager {
  constructor(documentRef = document) {
    this.documentRef = documentRef;
    this.registry = new Map();
    this.listenerByEventType = new Map();
    this.nextHandlerId = 1;
  }

  register({ root, onKeydown }) {
    if (!root || typeof onKeydown !== 'function') {
      return () => {};
    }

    const handlerId = this.nextHandlerId++;
    const registration = {
      handlerId,
      root,
      handlers: {
        [DEFAULT_EVENT_TYPE]: onKeydown
      }
    };

    this.registry.set(handlerId, registration);
    this.ensureListener(DEFAULT_EVENT_TYPE);

    return () => {
      this.unregister(handlerId);
    };
  }

  unregister(handlerId) {
    const registration = this.registry.get(handlerId);
    if (!registration) {
      return;
    }

    this.registry.delete(handlerId);
    this.releaseListenerIfUnused(DEFAULT_EVENT_TYPE);
  }

  ensureListener(eventType) {
    if (this.listenerByEventType.has(eventType)) {
      return;
    }

    const listener = (event) => {
      this.handleEvent(eventType, event);
    };

    this.listenerByEventType.set(eventType, listener);
    this.documentRef.addEventListener(eventType, listener);
  }

  releaseListenerIfUnused(eventType) {
    const hasRemainingHandlers = Array.from(this.registry.values())
      .some((registration) => typeof registration.handlers[eventType] === 'function');

    if (hasRemainingHandlers) {
      return;
    }

    const listener = this.listenerByEventType.get(eventType);
    if (!listener) {
      return;
    }

    this.documentRef.removeEventListener(eventType, listener);
    this.listenerByEventType.delete(eventType);
  }

  handleEvent(eventType, event) {
    const eventTarget = event.target;
    const activeElement = this.documentRef.activeElement;

    for (const registration of this.registry.values()) {
      if (!registration.root?.isConnected) {
        this.unregister(registration.handlerId);
        continue;
      }

      if (!this.isEventWithinRoot(registration.root, eventTarget, activeElement)) {
        continue;
      }

      const handler = registration.handlers[eventType];
      if (typeof handler === 'function') {
        handler(event);
      }
    }
  }

  isEventWithinRoot(root, eventTarget, activeElement) {
    return root.contains(eventTarget) || root.contains(activeElement);
  }

  getRegisteredHandlerCount() {
    return this.registry.size;
  }

  getActiveGlobalListenerCount() {
    return this.listenerByEventType.size;
  }

  resetForTesting() {
    for (const [eventType, listener] of this.listenerByEventType.entries()) {
      this.documentRef.removeEventListener(eventType, listener);
    }

    this.listenerByEventType.clear();
    this.registry.clear();
    this.nextHandlerId = 1;
  }
}

let globalKeyboardEventManager;

export function getKeyboardEventManager() {
  if (!globalKeyboardEventManager) {
    globalKeyboardEventManager = new KeyboardEventManager();
  }

  return globalKeyboardEventManager;
}

export function resetKeyboardEventManagerForTesting() {
  if (!globalKeyboardEventManager) {
    return;
  }

  globalKeyboardEventManager.resetForTesting();
  globalKeyboardEventManager = undefined;
}
