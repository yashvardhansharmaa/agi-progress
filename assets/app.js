/* ---------------------------------------------------------------
   AGI Progress — renderer
   Reads data/definitions.json and renders the tracker. No build step.
   --------------------------------------------------------------- */

(function () {
  'use strict';

  var STATUS = {
    passed:      { label: 'Met',          cls: 'passed'   },
    nearly:      { label: 'Nearly met',   cls: 'nearly'   },
    'in-progress': { label: 'In progress', cls: 'progress' },
    early:       { label: 'Early',        cls: 'early'    },
    failed:      { label: 'Deadline missed', cls: 'failed' },
    unfalsifiable: { label: 'Unscoreable', cls: 'unfals'  }
  };

  var CATEGORIES = {
    economic:  'Economic',
    benchmark: 'Benchmark',
    bet:       'Bets & forecasts',
    lab:       'Labs & frameworks',
    academic:  'Formal & academic',
    policy:    'Policy & safety'
  };

  var state = { data: null, category: 'all', sort: 'progress-desc' };

  /* ---------- utilities ---------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Allows a small, fixed set of inline markup in prose fields: <strong> and <em>.
  function prose(s) {
    return esc(s)
      .replace(/&lt;strong&gt;/g, '<strong>').replace(/&lt;\/strong&gt;/g, '</strong>')
      .replace(/&lt;em&gt;/g, '<em>').replace(/&lt;\/em&gt;/g, '</em>');
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch (e) { return 'source'; }
  }

  function statusOf(d) { return STATUS[d.status] || STATUS.early; }

  /* ---------- dashboard ---------- */

  function renderDashboard(defs) {
    var host = document.getElementById('dashboard');
    host.innerHTML = '';

    var scoreable = defs.filter(function (d) { return d.status !== 'unfalsifiable'; });
    var met = defs.filter(function (d) { return d.status === 'passed'; }).length;
    var nearly = defs.filter(function (d) { return d.status === 'nearly'; }).length;

    var mean = scoreable.length
      ? Math.round(scoreable.reduce(function (a, d) { return a + (d.progress || 0); }, 0) / scoreable.length)
      : 0;

    var withDeadline = defs.filter(function (d) { return d.deadline; }).length;

    var oldest = defs.reduce(function (a, d) {
      return (d.status !== 'passed' && d.year && d.year < a) ? d.year : a;
    }, 9999);

    var stats = [
      { v: defs.length,       l: 'Criteria tracked' },
      { v: met,               l: 'Criteria met',  accent: met > 0 },
      { v: nearly,            l: 'Nearly met' },
      { v: mean + '%',        l: 'Mean progress', accent: true },
      { v: withDeadline,      l: 'Carry a hard deadline' },
      { v: oldest,            l: 'Oldest still unmet' }
    ];

    stats.forEach(function (s) {
      var box = el('div', 'stat');
      var v = el('span', 'stat-value' + (s.accent ? ' is-accent' : ''), String(s.v));
      box.appendChild(v);
      box.appendChild(el('span', 'stat-label', s.l));
      host.appendChild(box);
    });
  }

  /* ---------- filters ---------- */

  function renderFilters(defs) {
    var host = document.getElementById('categoryFilters');
    host.innerHTML = '';

    var counts = { all: defs.length };
    defs.forEach(function (d) { counts[d.category] = (counts[d.category] || 0) + 1; });

    var keys = ['all'].concat(Object.keys(CATEGORIES).filter(function (k) { return counts[k]; }));

    keys.forEach(function (key) {
      var btn = el('button', 'filter-btn');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(state.category === key));
      btn.dataset.category = key;
      btn.appendChild(document.createTextNode(key === 'all' ? 'All' : CATEGORIES[key]));
      var c = el('span', 'count', String(counts[key]));
      btn.appendChild(c);
      btn.addEventListener('click', function () {
        state.category = key;
        renderFilters(defs);
        renderCards();
      });
      host.appendChild(btn);
    });
  }

  /* ---------- cards ---------- */

  function buildCard(d) {
    var st = statusOf(d);
    var card = el('article', 'card');
    card.id = d.slug;

    // head
    var head = el('div', 'card-head');
    var h = el('h3');
    h.textContent = d.name;
    head.appendChild(h);
    card.appendChild(head);

    // meta line
    var meta = el('p', 'card-meta');
    var who = el('span', 'who', d.proposer);
    meta.appendChild(who);
    var tail = [];
    if (d.affiliation) tail.push(d.affiliation);
    if (d.year) tail.push(String(d.year));
    if (tail.length) meta.appendChild(document.createTextNode(' · ' + tail.join(' · ')));
    card.appendChild(meta);

    // progress
    var row = el('div', 'progress-row');
    var pct = el('span', 'progress-pct s-' + st.cls,
      d.status === 'unfalsifiable' ? '—' : (d.progress + '%'));
    row.appendChild(pct);
    row.appendChild(el('span', 'progress-caption',
      d.status === 'unfalsifiable' ? 'no measurable threshold' : (d.progress_note || 'toward stated threshold')));
    card.appendChild(row);

    var bar = el('div', 'bar');
    var fill = el('div', 'bar-fill bg-' + st.cls + (d.estimated ? ' striped' : ''));
    fill.style.width = (d.status === 'unfalsifiable' ? 100 : Math.max(1.5, d.progress)) + '%';
    if (d.status === 'unfalsifiable') fill.style.opacity = '.28';
    bar.appendChild(fill);
    card.appendChild(bar);

    // chips
    var chips = el('div', 'chips');
    var sChip = el('span', 'chip chip-status s-' + st.cls, st.label);
    chips.appendChild(sChip);
    chips.appendChild(el('span', 'chip chip-cat', CATEGORIES[d.category] || d.category));
    if (d.deadline) chips.appendChild(el('span', 'chip chip-deadline', 'Deadline ' + d.deadline));
    if (d.stake) chips.appendChild(el('span', 'chip', d.stake));
    if (d.falsifiability) chips.appendChild(el('span', 'chip', d.falsifiability + ' falsifiability'));
    card.appendChild(chips);

    // quote
    if (d.quote) {
      var q = el('blockquote', 'quote');
      q.appendChild(document.createTextNode('“' + d.quote + '”'));
      if (d.quote_source) {
        var cite = el('cite', null, d.quote_source);
        q.appendChild(cite);
      }
      card.appendChild(q);
    }

    // assessment
    var a = el('div', 'assessment');
    a.appendChild(el('h4', null, 'Where things stand'));
    var p = el('p');
    p.innerHTML = prose(d.status_today);
    a.appendChild(p);
    card.appendChild(a);

    // drift
    if (d.drift) {
      var drift = el('div', 'drift');
      var b = el('b', null, 'Definition drift');
      drift.appendChild(b);
      drift.appendChild(document.createTextNode(d.drift));
      card.appendChild(drift);
    }

    // footer
    var foot = el('div', 'card-foot');
    if (d.source_url) {
      var link = el('a', null, 'Primary source ↗');
      link.href = d.source_url;
      link.target = '_blank';
      link.rel = 'noopener';
      foot.appendChild(link);
    }
    (d.evidence || []).slice(0, 3).forEach(function (e) {
      var link = el('a', null, e.label || hostOf(e.url));
      link.href = e.url;
      link.target = '_blank';
      link.rel = 'noopener';
      foot.appendChild(link);
    });
    if (d.confidence) foot.appendChild(el('span', 'conf', d.confidence + ' confidence'));
    card.appendChild(foot);

    return card;
  }

  function sortDefs(list) {
    var s = state.sort;
    var out = list.slice();
    out.sort(function (a, b) {
      switch (s) {
        case 'progress-asc':  return (a.progress || 0) - (b.progress || 0);
        case 'year-desc':     return (b.year || 0) - (a.year || 0);
        case 'year-asc':      return (a.year || 0) - (b.year || 0);
        case 'name':          return a.name.localeCompare(b.name);
        case 'deadline': {
          var av = a.deadline ? parseInt(String(a.deadline).slice(-4), 10) : 9999;
          var bv = b.deadline ? parseInt(String(b.deadline).slice(-4), 10) : 9999;
          return av - bv;
        }
        default:              return (b.progress || 0) - (a.progress || 0);
      }
    });
    return out;
  }

  function renderCards() {
    var host = document.getElementById('cards');
    var empty = document.getElementById('emptyState');
    host.innerHTML = '';

    var list = state.data.definitions.filter(function (d) {
      return state.category === 'all' || d.category === state.category;
    });

    list = sortDefs(list);
    empty.hidden = list.length > 0;
    list.forEach(function (d) { host.appendChild(buildCard(d)); });
  }

  /* ---------- theme ---------- */

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('agi-theme'); } catch (e) { /* private mode */ }
    var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    var theme = saved || (prefersLight ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);

    document.getElementById('themeToggle').addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('agi-theme', next); } catch (e) { /* ignore */ }
    });
  }

  /* ---------- boot ---------- */

  function boot(data) {
    state.data = data;

    var d = document.getElementById('updatedDate');
    if (data.meta && data.meta.updated) {
      d.textContent = new Date(data.meta.updated + 'T00:00:00Z').toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
      });
      d.setAttribute('datetime', data.meta.updated);
    }

    renderDashboard(data.definitions);
    renderFilters(data.definitions);
    renderCards();

    document.getElementById('sortBy').addEventListener('change', function (e) {
      state.sort = e.target.value;
      renderCards();
    });

    // Deep-link to a card if the URL carries a hash.
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView({ block: 'center' });
    }
  }

  function fail(err) {
    var main = document.getElementById('cards');
    main.innerHTML =
      '<div class="load-error"><strong>Could not load the dataset.</strong><br>' +
      'If you are opening this file directly from disk, the browser blocks the fetch. ' +
      'Serve it instead: <code>python3 -m http.server</code> in the repo root, then visit ' +
      '<code>localhost:8000</code>.<br><br>' + esc(err && err.message ? err.message : String(err)) +
      '</div>';
  }

  initTheme();

  fetch('data/definitions.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' fetching data/definitions.json');
      return r.json();
    })
    .then(boot)
    .catch(fail);
})();
