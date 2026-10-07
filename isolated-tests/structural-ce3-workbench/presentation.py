"""Model-bound presentation data. Never imported by replay, audit or run_input."""
from copy import deepcopy
from pathlib import Path
import re

from core.history import digest, read_bundle

CATALOG = read_bundle(Path(__file__).with_name('presentations.json'))


def empty():
    return dict(decisions={}, events={}, fields={}, values={}, outcomes={}, statements={},
                budget_unit='', budget_note='Budgeten saknar deklarerad enhet.', summary='', sources={}, provenance={})


def decorate(project, known=None):
    project = deepcopy(project)
    identity = digest(project['model'])
    project['model_identity'] = identity
    if 'presentation' not in project:
        entry = empty()
        catalog = CATALOG.get(identity)
        # Older saved examples are recognized by exact model AND original source
        # hash. An arbitrary imported model with matching IDs is never inferred.
        sourced = catalog and any(path.endswith('/model.json') and project.get('sources', {}).get(path) == sha
                                 for path, sha in catalog['sources'].items())
        if catalog and (known is True or (known is None and sourced)):
            entry = deepcopy(catalog)
        for id, text in project.get('display', {}).items():
            if id in project['model']['decisions']:
                # Preserve hand-written legacy names, while updating the old stock labels.
                old = (catalog or {}).get('legacy_labels', {}).get(id)
                if not catalog or text != old:
                    entry['decisions'][id] = text
        project['presentation'] = {identity: entry}
    project['presentation'].setdefault(identity, empty())
    return project


def validate_presentation(project):
    data = project.get('presentation', {})
    if not isinstance(data, dict):
        raise ValueError('Visningsetiketterna måste vara knutna till en modellidentitet.')
    def texts(value):
        return isinstance(value, dict) and all(isinstance(k, str) and isinstance(v, str) for k, v in value.items())
    for identity, entry in data.items():
        if not re.fullmatch('[a-f0-9]{64}', identity) or not isinstance(entry, dict):
            raise ValueError('Ogiltig modellidentitet för visningsetiketterna.')
        for group in ('decisions', 'events', 'fields'):
            if not texts(entry.get(group, {})):
                raise ValueError('Visningsnamn måste vara text.')
        for group in ('values', 'outcomes', 'statements'):
            value = entry.get(group, {})
            if not isinstance(value, dict) or not all(isinstance(k, str) and texts(v) for k, v in value.items()):
                raise ValueError('Etiketter för kategorivärden måste vara text.')
        for key in ('budget_unit', 'budget_note', 'summary'):
            if key in entry and not isinstance(entry[key], str):
                raise ValueError('Presentationstext måste vara text.')
