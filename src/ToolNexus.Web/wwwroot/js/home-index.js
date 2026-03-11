const RECENT_TOOLS_KEY = 'toolnexus.recent.tools';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

const renderHighlightedText = (node, originalText, query) => {
  if (!node) return;

  node.replaceChildren();
  if (!query) {
    node.textContent = originalText;
    return;
  }

  const regex = new RegExp(escapeRegExp(query), 'ig');
  let lastIndex = 0;
  const fragment = document.createDocumentFragment();
  let match = regex.exec(originalText);

  while (match) {
    if (match.index > lastIndex) {
      fragment.append(document.createTextNode(originalText.slice(lastIndex, match.index)));
    }

    const mark = document.createElement('mark');
    mark.textContent = match[0];
    fragment.append(mark);
    lastIndex = match.index + match[0].length;
    match = regex.exec(originalText);
  }

  if (lastIndex < originalText.length) {
    fragment.append(document.createTextNode(originalText.slice(lastIndex)));
  }

  node.append(fragment);
};

const buildToolChip = (tool) => {
  const chip = document.createElement('a');
  chip.className = 'tool-discovery__chip';
  chip.href = `/tools/${tool.slug}`;
  chip.textContent = tool.title;
  return chip;
};

const renderDiscoveryChips = (container, tools, emptyLabel) => {
  if (!container) return;

  container.replaceChildren();

  if (!tools.length) {
    const emptyNode = document.createElement('span');
    emptyNode.className = 'tool-discovery__empty';
    emptyNode.textContent = emptyLabel;
    container.append(emptyNode);
    return;
  }

  const fragment = document.createDocumentFragment();
  tools.forEach((tool) => fragment.append(buildToolChip(tool)));
  container.append(fragment);
};

const readRecentTools = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_TOOLS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRecentTools = (tools) => {
  localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(tools.slice(0, 5)));
};

const initTypewriter = () => {
  const typewriterText = document.getElementById('heroTypewriter');
  if (!typewriterText) return;

  const tools = ['JSON Formatter', 'Regex Tester', 'Base64 Encoder', 'SQL Formatter', 'Text Diff'];
  let toolIndex = 0;
  let charIndex = 0;
  let direction = 1;

  const tick = () => {
    const current = tools[toolIndex];
    charIndex += direction;
    typewriterText.textContent = current.slice(0, charIndex);

    if (charIndex === current.length) {
      direction = -1;
      setTimeout(tick, 1300);
      return;
    }

    if (charIndex === 0) {
      direction = 1;
      toolIndex = (toolIndex + 1) % tools.length;
      setTimeout(tick, 280);
      return;
    }

    setTimeout(tick, direction > 0 ? 85 : 45);
  };

  tick();
};

const initCounters = () => {
  const counterNodes = Array.from(document.querySelectorAll('[data-counter]'));
  if (!counterNodes.length) return;

  const animateCounter = (node) => {
    const targetValue = Number(node.dataset.target || 0);
    const decimals = Number(node.dataset.decimals || 0);
    if (!Number.isFinite(targetValue)) return;

    const duration = 1400;
    const startTime = performance.now();

    const render = (timestamp) => {
      const elapsed = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - (1 - elapsed) ** 3;
      const value = targetValue * eased;
      node.textContent = value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });

      if (elapsed < 1) requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.35 });

  counterNodes.forEach((node) => observer.observe(node));
};

const initSearchAndDiscovery = () => {
  const searchBox = document.getElementById('toolSearch');
  const cards = Array.from(document.querySelectorAll('#featuredGrid .card'));
  if (!searchBox || !cards.length) return;

  const trendingToolsContainer = document.getElementById('trendingTools');
  const recentToolsContainer = document.getElementById('recentTools');
  const recentRow = document.getElementById('recentRow');

  const normalizedCards = cards.map((card) => {
    const titleNode = card.querySelector('h3');
    const descriptionNode = card.querySelector('.card__description');
    const title = card.dataset.title || titleNode?.textContent || '';
    const description = card.dataset.description || descriptionNode?.textContent || '';

    return { card, titleNode, descriptionNode, title, description, searchable: `${title} ${description}`.toLowerCase() };
  });

  const applySearch = (rawQuery) => {
    const query = rawQuery.toLowerCase().trim();

    requestAnimationFrame(() => {
      normalizedCards.forEach((entry) => {
        const matches = !query || entry.searchable.includes(query);
        entry.card.classList.toggle('is-hidden', !matches);
        entry.card.setAttribute('aria-hidden', String(!matches ? true : false));
        renderHighlightedText(entry.titleNode, entry.title, query);
        renderHighlightedText(entry.descriptionNode, entry.description, query);
      });
    });
  };

  searchBox.addEventListener('input', (event) => {
    debouncedSearch(event.target.value || '');
  });

  const debouncedSearch = debounce(applySearch, 250);

  const topTools = cards
    .slice(0, 5)
    .map((card) => ({
      title: card.dataset.title || card.querySelector('h3')?.textContent || 'Tool',
      slug: card.dataset.toolSlug || ''
    }))
    .filter((tool) => tool.slug);

  renderDiscoveryChips(trendingToolsContainer, topTools, 'Ranking in progress');

  const recentTools = readRecentTools();
  renderDiscoveryChips(recentToolsContainer, recentTools, 'No tools launched yet — your recently used tools will appear here.');

  if (recentRow) {
    recentRow.classList.toggle('is-empty', recentTools.length === 0);
  }

  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const slug = card.dataset.toolSlug;
      if (!slug) return;

      const title = card.dataset.title || card.querySelector('h3')?.textContent || 'Tool';
      const nextTools = [{ slug, title }, ...readRecentTools().filter((tool) => tool.slug !== slug)];
      writeRecentTools(nextTools);
    });
  });
};

initTypewriter();
initCounters();
initSearchAndDiscovery();
