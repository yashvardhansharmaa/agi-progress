#!/usr/bin/env python3
"""Structural checks on data/definitions.json. Run by CI; stdlib only."""

import json
import re
import sys

ENUMS = {
    'claim':        {'stated', 'proxy'},
    'status':       {'passed', 'nearly', 'in-progress', 'early', 'failed', 'unfalsifiable'},
    'category':     {'economic', 'benchmark', 'bet', 'lab', 'academic', 'policy'},
    'verification': {'independent', 'maintainer-checked', 'self-reported', 'unmeasured'},
    'confidence':   {'high', 'medium', 'low'},
}
REQUIRED = ('slug', 'name', 'proposer', 'year', 'category', 'claim',
            'status', 'progress', 'status_today', 'source_url', 'verification')
CRIT_STATES = {'met', 'partial', 'unmet', 'untestable'}

data = json.loads(open('data/definitions.json', encoding='utf-8').read())
defs = data['definitions']
errors, seen = [], set()

for d in defs:
    slug = d.get('slug', '<no slug>')
    for f in REQUIRED:
        if f not in d:
            errors.append('%s: missing required field %r' % (slug, f))
    for f, allowed in ENUMS.items():
        if f in d and d[f] not in allowed:
            errors.append('%s: %s=%r not in %s' % (slug, f, d[f], sorted(allowed)))
    if slug in seen:
        errors.append('%s: duplicate slug' % slug)
    seen.add(slug)
    if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', slug or ''):
        errors.append('%s: slug is not kebab-case' % slug)
    if not isinstance(d.get('progress'), int) or not 0 <= d.get('progress', -1) <= 100:
        errors.append('%s: progress must be an int 0-100' % slug)
    if 'measured' in d and not re.fullmatch(r'\d{4}(-\d{2})?', str(d['measured'])):
        errors.append('%s: measured=%r must be YYYY or YYYY-MM' % (slug, d['measured']))
    for c in d.get('criteria', []):
        if c.get('state') not in CRIT_STATES:
            errors.append('%s: sub-criterion state=%r invalid' % (slug, c.get('state')))
    # build.py strips markup with a regex; a bare "<" would silently eat text.
    for f in ('name', 'proposer', 'quote', 'progress_note'):
        if '<' in str(d.get(f, '')):
            errors.append('%s: %s contains "<", which the pre-renderer would strip' % (slug, f))

if errors:
    print('\n'.join('  ' + e for e in errors), file=sys.stderr)
    sys.exit('validate.py: %d error(s) in %d records' % (len(errors), len(defs)))
print('validate.py: %d records, no errors' % len(defs))
