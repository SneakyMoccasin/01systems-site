"""Declared timing plans over the frozen factory, not a conditional-policy engine."""
from copy import deepcopy
from pathlib import Path
import hashlib
from factory_plans import factory_comparison
from service import plan


def timing_comparison(scenario='base'):
    p = factory_comparison(scenario)  # verifies frozen model and sources
    common = {'0': ['D1', 'D2', 'D9', 'D7'], '2': ['D3']}
    early = deepcopy(common)
    early['2'].append('D5')
    early.update({'6': ['D6'], '8': ['D8']})
    late = deepcopy(common)
    late.update({'6': ['D5'], '10': ['D6'], '12': ['D8']})
    note = 'Samma åtgärder; D5 2→6, D6 6→10, D8 8→12. Övriga försök oförändrade.'
    if scenario == 'customer_absent':
        del late['6'], late['10']
        note = ('Separat deklarerad väntplan för uteblivet kundbesked: inga D5- eller D6-försök inom horisonten. '
                'D8 vecka 12 behålls som diagnostiskt startförsök. Ingen villkorsstyrning i motorn.')
    def script(steps, source):
        return {'schema_version': 'ce3-script/1', 'source': source,
                'steps': {k: [{'decision': d, 'mode': 'attempt'} for d in rows] for k, rows in steps.items()}}
    outcomes = p['plans'][0]['outcomes']
    p['plans'] = [plan('Tidig flytt · vecka 2', script(early, 'Deklarerad tidig flytt: D5 v2, D6 v6, D8 v8.'), deepcopy(outcomes)),
                  plan('Senare flytt · vecka 6' if scenario == 'base' else 'Senare flytt · avsiktlig väntan',
                       script(late, note), deepcopy(outcomes))]
    p['factory_comparison'] = 'factory-timing/1'
    p['name'] = 'Fabriken · flyttidpunkt · ' + ('grundscenario' if scenario == 'base' else 'uteblivet kundbesked')
    source = Path(__file__)
    p['sources'][str(source.relative_to(source.parents[2]))] = hashlib.sha256(source.read_bytes()).hexdigest()
    return p
