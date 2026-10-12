"""Two explicit plans over the unchanged assumed factory case. No engine rules."""
from copy import deepcopy
import hashlib
from service import HERE, example, plan, require
from core.history import read_bundle, digest

MODEL = 'b2db6772571c4c3e6c198cdfd97d1a48413515cb567a7654a8817087407d7c8f'
PINS = {
    'model.json': 'be6506fd0655ad2f6ef66db710f086591d70e168cd4ce56a88b8f06b748f7ec8',
    'candidate.json': 'e7da23a9e34a360a6a85f1251c0880d689f2338da3bf855a79737998650e20f0',
    'scenarios.json': 'ad75c497a7b705d3025a79e702f1f0bc505e86aa7e4d79ebf3228a8669076518',
    'sources/factory-assumed.txt': '85387b224f5896554a2f5562a94f7eb9fe23a3ebf02f6f5e57670c8bfca9add8',
}


def factory_comparison(scenario='base'):
    require(scenario in ('base', 'customer_absent'), 'Okänt fabriksscenario.')
    folder = HERE.parent / 'structural-ce-v1-factory-witness'
    for name, expected in PINS.items():
        require(hashlib.sha256((folder / name).read_bytes()).hexdigest() == expected,
                'Fabriksunderlaget har ändrats: ' + name)
    project = example('factory')
    require(digest(project['model']) == MODEL, 'Den normaliserade fabriksmodellen har ändrats.')
    original = project['plans'][0]['script']
    moved = deepcopy(original)
    # Frozen machine_moved scenario: only D4 -> D5, same position and week.
    for rows in moved['steps'].values():
        for row in rows:
            if row['decision'] == 'D4':
                row['decision'] = 'D5'
    outcomes = read_bundle(folder / 'candidate.json')['external_outcomes']
    if scenario == 'customer_absent':
        scenarios = read_bundle(folder / 'scenarios.json')
        outcomes.update(next(s['outcome_overrides'] for s in scenarios if s['id'] == scenario))
    project['factory_comparison'] = 'factory-plans/1'
    project['name'] = 'Fabriken · ' + ('grundjämförelse' if scenario == 'base' else 'uteblivet kundbesked')
    project['plans'] = [plan('Flytta svensk maskin', moved, deepcopy(outcomes)),
                        plan('Ny maskin · behåll Sverige', original, deepcopy(outcomes))]
    # Sources are shared; expected results are never submitted to replay.
    project['sources'].update({str((folder / name).relative_to(HERE.parents[1])): sha for name, sha in PINS.items()})
    return project
