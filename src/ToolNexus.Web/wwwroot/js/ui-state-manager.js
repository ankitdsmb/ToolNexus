const KEYS = {
  usage: 'toolnexus.toolUsage',
  sessions: 'toolnexus.totalSessions',
  recents: 'toolnexus.recentTools',
  theme: 'toolnexus-theme'
};

class UiStateManager {
  constructor() {
    this.state = {
      toolUsage: this.readJson(KEYS.usage, {}),
      totalSessions: this.readNumber(KEYS.sessions, 0),
      recents: this.readJson(KEYS.recents, []),
      loadTimeMs: Math.round(performance.now()),
      theme: document.documentElement.getAttribute('data-theme') || 'dark'
    };
  }

  boot() {
    this.incrementSessions();
    this.emit('toolnexus:statechange', { ...this.state });
  }

  readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // no-op
    }
  }

  readNumber(key, fallback) {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) ? value : fallback;
  }

  incrementSessions() {
    this.state.totalSessions += 1;
    localStorage.setItem(KEYS.sessions, String(this.state.totalSessions));
  }

  recordToolUsage(slug) {
    if (!slug) return;
    const usage = this.state.toolUsage;
    usage[slug] = (usage[slug] || 0) + 1;
    this.writeJson(KEYS.usage, usage);

    this.state.recents = [slug, ...this.state.recents.filter((s) => s !== slug)].slice(0, 8);
    this.writeJson(KEYS.recents, this.state.recents);
    this.emit('toolnexus:statechange', { ...this.state });
  }

  getUsage(slug) {
    return this.state.toolUsage[slug] || 0;
  }

  getSortedByUsage(tools = []) {
    return [...tools].sort((a, b) => (this.getUsage(b.slug) - this.getUsage(a.slug)) || a.title.localeCompare(b.title));
  }

  getPerformanceBadge() {
    const ms = this.state.loadTimeMs;
    if (ms < 250) return { label: 'Fast', tone: 'fast', value: ms };
    if (ms < 700) return { label: 'Stable', tone: 'stable', value: ms };
    return { label: 'Degraded', tone: 'intensive', value: ms };
  }

  syncTheme(theme) {
    this.state.theme = theme;
    this.emit('toolnexus:theme', { theme });
    this.emit('toolnexus:statechange', { ...this.state });
  }

  emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

export const uiStateManager = new UiStateManager();
uiStateManager.boot();
