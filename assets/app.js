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

  // Provenance of the evidence each progress score rests on.
  var VERIFICATION = {
    'independent':        'independently measured',
    'maintainer-checked': 'checked by the operator',
    'self-reported':      'self-reported',
    'unmeasured':         'never administered'
  };

  var CRIT_LABEL = {
    met:        'Met:',
    partial:    'Partially met:',
    unmet:      'Not met:',
    untestable: 'No test exists:'
  };

  var CRIT_MARK = {
    met:        '●',
    partial:    '◐',
    unmet:      '○',
    untestable: '×'
  };

  var NUMBER_WORD = {
    1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight',
    9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen'
  };

  var state = { data: null, category: 'all', sort: 'live-first' };

  // A criterion is 'stated' when its proposer tied the threshold to AGI, and
  // 'proxy' when the field reads it that way but the author never claimed it.
  // The two groups render into separate sections.
  function isStated(d) { return d.claim !== 'proxy'; }

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

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function monthYear(iso) {
    var p = String(iso || '').split('-');
    var m = parseInt(p[1], 10);
    return (m ? MONTHS[m - 1] + ' ' : '') + p[0];
  }

  // A number is only as current as the run that produced it. `measured` is
  // "YYYY-MM", or "YYYY" when only the year is sourced, in which case it is
  // read as December so the age reported is the smallest one consistent with it.
  function measuredAge(d) {
    if (!d.measured) return null;
    var parts = String(d.measured).split('-');
    var y = parseInt(parts[0], 10);
    var m = parts.length > 1 ? parseInt(parts[1], 10) : 12;
    if (!y || !m) return null;

    var exact = parts.length > 1;
    var label = exact ? MONTHS[m - 1] + ' ' + y : String(y);

    var upd = (state.data && state.data.meta && state.data.meta.updated) || '';
    var uy = parseInt(upd.slice(0, 4), 10);
    var um = parseInt(upd.slice(5, 7), 10);
    if (!uy || !um) return { label: label, months: 0, exact: exact };

    return { label: label, months: (uy - y) * 12 + (um - m), exact: exact };
  }

  /* ---------- dashboard ---------- */

  // Scoped to stated definitions: averaging in the proxies would report progress
  // toward AGI thresholds that nobody actually set.
  function renderDashboard(all) {
    var host = document.getElementById('dashboard');
    host.innerHTML = '';

    var defs = all.filter(isStated);
    var scoreable = defs.filter(function (d) { return d.status !== 'unfalsifiable'; });
    var met = defs.filter(function (d) { return d.status === 'passed'; }).length;
    var nearly = defs.filter(function (d) { return d.status === 'nearly'; }).length;

    // Averaged over criteria that have actually been measured. Note this is a
    // survivorship-biased sample: the never-administered ones are unmeasured
    // largely because they are physical or open-ended, which is where progress
    // is slowest. The sub-line carries their mean so the gap stays visible.
    var measured = scoreable.filter(function (d) { return d.verification !== 'unmeasured'; });
    var estimatedOnly = scoreable.filter(function (d) { return d.verification === 'unmeasured'; });
    var avg = function (list) {
      return list.length
        ? Math.round(list.reduce(function (a, d) { return a + (d.progress || 0); }, 0) / list.length)
        : 0;
    };
    var mean = avg(measured);

    var withDeadline = defs.filter(function (d) { return d.deadline; }).length;

    var unmeasured = defs.filter(function (d) { return d.verification === 'unmeasured'; }).length;

    // The one crowd forecast on the page, carried on the criterion it belongs to.
    var fc = null;
    all.forEach(function (d) { if (d.forecast && !fc) fc = d.forecast; });

    var stats = [
      { v: defs.length, l: 'Stated definitions' },
      { v: met,         l: met === 1 ? 'Criterion met' : 'Criteria met', accent: met > 0 },
      { v: mean + '%',
        l: 'Mean progress across ' + measured.length + ' of ' + defs.length + ' measured criteria',
        sub: avg(estimatedOnly) + '% across the ' + estimatedOnly.length + ' never administered',
        accent: true }
    ];

    if (fc) {
      stats.splice(2, 0, {
        v: monthYear(fc.date),
        l: fc.label || 'Crowd forecast',
        sub: [fc.forecasters ? fc.forecasters + ' forecasts' : null,
              fc.as_of ? 'read ' + monthYear(fc.as_of) : null].filter(Boolean).join(' · '),
        accent: true,
        wide: true
      });
    }

    stats.forEach(function (s) {
      var box = el('div', 'stat' + (s.wide ? ' stat-wide' : ''));
      box.appendChild(el('span', 'stat-value' + (s.accent ? ' is-accent' : ''), String(s.v)));
      box.appendChild(el('span', 'stat-label', s.l));
      if (s.sub) box.appendChild(el('span', 'stat-sub', s.sub));
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
        // flip state in place: rebuilding the row would drop keyboard focus to <body>
        host.querySelectorAll('.filter-btn').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.dataset.category === key));
        });
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
    h.id = d.slug + '-title';
    h.textContent = d.name;
    head.appendChild(h);
    card.appendChild(head);
    card.setAttribute('aria-labelledby', h.id);

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
    // A tilde on the number, because the striped bar that used to be the only
    // marker of an editorial estimate measures 1.22:1 against its own fill.
    var shown = d.status === 'unfalsifiable' ? '—'
      : (d.estimated ? '~' : '') + d.progress + '%';
    var pct = el('span', 'progress-pct s-' + st.cls, shown);
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

    // A resolved or void criterion cannot go stale; a live one can.
    var age = measuredAge(d);
    if (age) {
      var live = d.status !== 'passed' && d.status !== 'unfalsifiable';
      var stale = live && age.months > 6;
      var m = el('p', 'measured' + (stale ? ' is-stale' : ''));
      m.appendChild(document.createTextNode('measured ' + age.label));
      if (stale) {
        m.appendChild(el('span', 'age',
          ' · ' + (age.exact ? '' : 'at least ') + age.months + ' months old'));
      }
      card.appendChild(m);
    }

    // chips
    var chips = el('div', 'chips');
    var sChip = el('span', 'chip chip-status s-' + st.cls, st.label);
    chips.appendChild(sChip);
    chips.appendChild(el('span', 'chip chip-cat', CATEGORIES[d.category] || d.category));
    if (d.deadline) chips.appendChild(el('span', 'chip chip-deadline', 'Deadline ' + d.deadline));
    if (d.stake) chips.appendChild(el('span', 'chip', d.stake));
    if (d.estimated) chips.appendChild(el('span', 'chip chip-est', 'editorial estimate'));
    if (d.verification) {
      var vLabel = VERIFICATION[d.verification] || d.verification;
      // Was a title= tooltip: invisible to keyboard users and entirely absent on
      // touch, so phone visitors could not reach the provenance reason at all.
      if (d.verification_note) {
        var vBtn = el('button', 'chip chip-verif v-' + d.verification, vLabel);
        vBtn.type = 'button';
        vBtn.setAttribute('aria-expanded', 'false');
        var note = el('p', 'verif-note', d.verification_note);
        note.hidden = true;
        vBtn.addEventListener('click', function () {
          var open = vBtn.getAttribute('aria-expanded') === 'true';
          vBtn.setAttribute('aria-expanded', String(!open));
          note.hidden = open;
        });
        chips.appendChild(vBtn);
        card.appendChild(chips);
        card.appendChild(note);
      } else {
        chips.appendChild(el('span', 'chip chip-verif v-' + d.verification, vLabel));
        card.appendChild(chips);
      }
    } else {
      card.appendChild(chips);
    }

    // why this one sits below the line
    if (d.claim === 'proxy' && d.claim_note) {
      var cn = el('div', 'claim-note');
      cn.appendChild(el('b', null, 'Not framed as an AGI test'));
      var cnt = el('span');
      cnt.innerHTML = prose(d.claim_note);
      cn.appendChild(cnt);
      card.appendChild(cn);
    }

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

    // sub-criteria checklist, for criteria stated as a conjunction of parts
    if (d.criteria && d.criteria.length) {
      var cl = el('div', 'criteria');
      cl.appendChild(el('h4', null, 'Property by property'));
      var ul = el('ul');
      d.criteria.forEach(function (c) {
        var li = el('li', 'crit c-' + c.state);
        var mark = el('span', 'crit-mark', CRIT_MARK[c.state] || '?');
        mark.setAttribute('aria-hidden', 'true');
        li.appendChild(mark);
        li.appendChild(el('span', 'vh', CRIT_LABEL[c.state] || c.state));
        var body = el('span', 'crit-body');
        body.appendChild(el('span', 'crit-label', c.label));
        if (c.note) body.appendChild(el('span', 'crit-note', c.note));
        li.appendChild(body);
        ul.appendChild(li);
      });
      cl.appendChild(ul);
      card.appendChild(cl);
    }

    // assessment
    var a = el('div', 'assessment');
    a.appendChild(el('h4', null, 'Where things stand'));
    String(d.status_today).split(/\n{2,}/).forEach(function (para) {
      var p = el('p');
      p.innerHTML = prose(para);
      a.appendChild(p);
    });
    card.appendChild(a);

    // what would change this verdict
    if (d.flip_condition) {
      var flip = el('div', 'flip');
      flip.appendChild(el('b', null, 'What would change this'));
      flip.appendChild(el('span', null, d.flip_condition));
      card.appendChild(flip);
    }

    // drift
    if (d.drift) {
      var drift = el('div', 'drift');
      var b = el('b', null, 'Definition drift');
      drift.appendChild(b);
      var dtxt = el('span');
      dtxt.innerHTML = prose(d.drift);
      drift.appendChild(dtxt);
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
    // Every status needs a rank: a missing key makes the comparator return NaN,
    // which leaves the whole list in an arbitrary order.
    var RANK = { nearly: 0, 'in-progress': 1, early: 2, failed: 3, passed: 4, unfalsifiable: 5 };
    function rankOf(d) { var r = RANK[d.status]; return r == null ? 99 : r; }
    var out = list.slice();
    out.sort(function (a, b) {
      switch (s) {
        case 'live-first': {
          var ra = rankOf(a), rb = rankOf(b);
          if (ra !== rb) return ra - rb;
          return (b.progress || 0) - (a.progress || 0);
        }
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

  function fill(host, list) {
    host.innerHTML = '';
    sortDefs(list).forEach(function (d) { host.appendChild(buildCard(d)); });
  }

  function renderCards() {
    var empty = document.getElementById('emptyState');
    var proxySection = document.getElementById('proxies');

    var list = state.data.definitions.filter(function (d) {
      return state.category === 'all' || d.category === state.category;
    });

    var stated = list.filter(isStated);
    var proxies = list.filter(function (d) { return !isStated(d); });

    fill(document.getElementById('cards'), stated);
    fill(document.getElementById('proxyCards'), proxies);

    // Each section disappears rather than sitting empty under a heading.
    empty.hidden = list.length > 0;
    document.getElementById('cards').hidden = stated.length === 0;
    proxySection.hidden = proxies.length === 0;

    var count = document.getElementById('resultCount');
    if (count) {
      var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
      count.textContent = plural(stated.length, 'stated definition', 'stated definitions') +
        ' and ' + plural(proxies.length, 'proxy', 'proxies') + ' shown' +
        (state.category === 'all' ? '' : ' in ' + (CATEGORIES[state.category] || state.category));
    }
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

  /* ---------- submission form ---------- */

  // Builds a pre-filled GitHub issue. Nothing leaves the browser until the user
  // clicks through, and they see the whole issue before it posts.
  var REPO = 'https://github.com/yashvardhansharmaa/agi-progress';

  function initForm() {
    var form = document.getElementById('submitForm');
    if (!form) return;
    var hint = document.getElementById('submitHint');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var name = (f.get('name') || '').trim();

      var body = [
        '### The criterion', name,
        '', '### Who proposed it', (f.get('proposer') || '').trim() +
          (f.get('year') ? ' (' + String(f.get('year')).trim() + ')' : ''),
        '', '### What counts as passing', (f.get('threshold') || '').trim(),
        '', '### Primary source', (f.get('source') || '').trim(),
        '', '### Where it stands today', (f.get('status') || '').trim() || '_not stated_',
        '', '---', 'Submitted via the form on the site.'
      ].join('\n');

      var url = REPO + '/issues/new?title=' +
        encodeURIComponent('Criterion: ' + name) +
        '&body=' + encodeURIComponent(body);

      if (url.length > 8000) {
        hint.textContent = 'That is too long to pass through a URL. Please open a blank issue and paste it in.';
        return;
      }
      hint.textContent = 'Opening GitHub in a new tab. Nothing is submitted until you press Create on that page.';
      window.open(url, '_blank', 'noopener');
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

    var nUnmeasured = data.definitions.filter(function (x) {
      return isStated(x) && x.verification === 'unmeasured';
    }).length;
    var nEl = document.getElementById('unmeasuredCount');
    if (nEl) nEl.textContent = NUMBER_WORD[nUnmeasured] || String(nUnmeasured);

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

  // Append rather than replace: the prerendered criteria live inside #cards, so
  // overwriting it would leave a JS visitor with a network blip strictly worse
  // off than one with JS disabled.
  function fail(err) {
    var main = document.createElement('div');
    document.getElementById('cards').parentNode.insertBefore(
      main, document.getElementById('cards'));
    main.innerHTML =
      '<div class="load-error"><strong>Could not load the dataset.</strong><br>' +
      'If you are opening this file directly from disk, the browser blocks the fetch. ' +
      'Serve it instead: <code>python3 -m http.server</code> in the repo root, then visit ' +
      '<code>localhost:8000</code>.<br><br>' + esc(err && err.message ? err.message : String(err)) +
      '</div>';
  }

  initTheme();
  initForm();

  fetch('data/definitions.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' fetching data/definitions.json');
      return r.json();
    })
    .then(boot)
    .catch(fail);
})();
