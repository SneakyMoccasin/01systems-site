#!/usr/bin/env python3
"""Fabricated training fixture only. Never creates a real customer's confirmation."""
import argparse
from copy import deepcopy
import hashlib
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from bridge import read_bundle, write_bundle, digest, encode, equal
import pilot_contract as C

NOTES = '''FABRICERAT ÖVNINGSEXEMPEL – ingen verklig kund eller verksamhet har granskat detta.
P förbereder. N levererar när förberedelse är klar. U levererar när förberedelse
är klar och externt besked är approved. Exakt ett av N/U måste väljas. P måste
alltid väljas. En plan med två beslut försöker dem vid 0 respektive 2. Alla
ordningar prövas. Inget retry. Tom plan är förbjuden. Budgetkonto saknas;
alla regelkostnader är 0 och inget beslut schemalägger events.
prepared, done och aux_done börjar false, safe true, response waiting.
response kan bli approved, rejected eller waiting (vid absent). Inga andra
effekter. Eventet finns initialt och är schemalagt vid 0, due antas vara 1.
Scenarierna approved/rejected/absent är en deklarerad mängd utan sannolikheter.
Horisonten är inklusivt 0..5 i syntetiska steg, events sker före beslut.
Mål: done vid horisonten, done senast 2 och safe i alla modellerade snapshots
till och med 5. Alla valda försök ska accepteras. U/N har ingen kostnadsranking.
Ingen fysisk kapacitet, fortsatt drift eller verklig leveranssäkerhet modelleras.
Alla övriga dokumentära fält och formatval är den manuella övningsmodellens
uttryckliga representation. Detta är underlag för kontraktstest, inte källbevis.
'''


def draft_fixture(directory, max_cells=12):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=False)
    materials = directory / 'materials'
    materials.mkdir()
    (materials / 'notes.txt').write_text(NOTES, encoding='utf-8')
    p = read_bundle(ROOT / 'fixtures/optional-decisions-problem.json')
    p['purpose'] = C.PURPOSE
    del p['model']['decisions']['X']
    p['search']['optional_decision_ids'] = ['N', 'U']
    p['search']['slots'] = [0, 2]
    p['model']['metadata']['time_basis'] = 'Övning: slots 0/2, due antas 1; inklusiv horisont 5.'
    values = C.targets(p)
    uncertain = '/model/initial_events/0/due'
    ref = {'source_id': 'training-notes', 'source_version': '1', 'start': 0, 'end': len(NOTES), 'quote': NOTES}
    explanations = {
        'model': 'Övningsmodell: P förbereder, N levererar efter P och U kräver dessutom approved. Se noter för initialvärden, regler och tidsbetydelse.',
        'sources': 'Replaymodellens sources är tom. Pilotens bevarade övningsunderlag och dess faktiska bytes finns i den separata evidensförteckningen.',
        'search': 'P är obligatoriskt, exakt ett av N/U väljs. De valda besluten försöks en gång i samtliga ordningar vid 0 och 2. Ingen tom plan eller retry.',
        'observation': 'Leverans ska vara klar vid horisonten och nådd senast 2. Safe gäller hela tiden till 5. Alla valda försök ska accepteras på alla eventbanor.',
        'scenario_set': 'Approved, rejected och absent är separata externa utfall. Samma fasta plan används i varje scenario. Absent håller response waiting.'}
    mappings = [{'targets': sorted(k for k in values if k.startswith('/' + section + '/') or k == '/' + section),
                 'explanation': explanation, 'refs': [deepcopy(ref)], 'assumption_ids': []}
                for section, explanation in explanations.items()]
    mappings[0]['targets'].remove(uncertain)
    mappings.append({'targets': [uncertain], 'explanation': 'Beskedets tid är hypotetiskt 1. En annan tid kräver separat fryst modell.',
                     'refs': [], 'assumption_ids': ['time-hypothesis']})
    draft = {'schema_version': 'ce3-pilot-draft/2', 'case_id': 'fabricated-training-case', 'revision': 1,
             'classification': {'case_kind': 'fabricated_exercise', 'receipt_origin': 'fabricated_test'},
             'analysis': {'question': 'Vilka fasta övningsplaner når leveransmålet i varje deklarerat scenario?',
                          'intended_use': 'Öva manuell granskning och teknisk pilotantagning. Inget kundbeslut.',
                          'includes': ['Förberedelse, leveransväg, externt besked och hårda mål i övningen.'],
                          'excludes': ['Fysisk kapacitet och fortsatt drift.', 'Kostnadsranking och verklighetsprediktion.'],
                          'decision_authority': 'I övningen får operatören välja och försöka P, N och U enligt grammatiken.',
                          'time_unit': p['model']['clock']['unit'], 'limitations': ['Helt fabricerat fall; ingen verklig domängranskning.'],
                          'ranking': 'none'},
             'translator': {'stated_person': 'Övningsförfattare (fiktiv)', 'method_version': 'manual-training/1'},
             'problem': p, 'evidence': [{'id': 'training-notes', 'version': '1', 'title': 'Fabricerade övningsnoter',
                                        'original': C.descriptor(materials, 'notes.txt'), 'extract': C.descriptor(materials, 'notes.txt'),
                                        'extraction': 'verbatim_utf8', 'extraction_note': 'Samma UTF-8-bytes; inte verklig källdata.'}],
             'mapping': mappings,
             'assumptions': [{'id': 'time-hypothesis', 'statement': 'Beskedet antas inträffa vid steg 1.',
                              'reason': 'Hypotetisk tid för övningen, ingen observerad leveranstid.', 'targets': [uncertain]}],
             'issues': [],
             'controls': [{'order': ['P', 'N'], 'scenario_label': 'rejected', 'expected_goal': True,
                           'rationale': 'P vid 0 gör prepared sant. N vid 2 levererar oberoende av response; safe ändras inte.'},
                          {'order': ['P', 'U'], 'scenario_label': 'rejected', 'expected_goal': False,
                           'rationale': 'U vid 2 blockeras av rejected. Done förblir false trots korrekt replay.'}],
             'execution': {'limits': dict(C.LIMITS), 'max_cells': max_cells}}
    def issue(**kwargs):
        base = dict(id='', kind='', question='', owner='Övningsförfattare', impact='blocks_analysis', targets=[],
                    disposition='', reason='', refs=[], assumption_ids=[], scenario_event=None,
                    excluded_scope_index=None, previous_scope=None)
        base.update(kwargs)
        return base
    draft['issues'] = [
        issue(id='time', kind='uncertain_time', question='När kommer beskedet?', targets=[uncertain],
              disposition='hypothetical', reason='Analysen är villkorad på tid 1.', assumption_ids=['time-hypothesis']),
        issue(id='outcome', kind='future_outcome', question='Vilket besked kommer?',
              targets=['/scenario_set/members/' + str(i) + '/outcomes/response' for i in range(3)],
              disposition='scenarios', scenario_event='response', reason='Pröva alla tre deklarerade utfall utan sannolikhetsanspråk.'),
        issue(id='capacity', kind='model_gap', question='Räcker fysisk kapacitet?', disposition='scope_excluded',
              impact='outside_scope', excluded_scope_index=0, previous_scope='Ursprunglig fråga inkluderade fysisk genomförbarhet.',
              reason='Frågan har minskats till logisk beslutstillåtlighet; ingen slutsats om fysisk genomförbarhet får dras.'),
        issue(id='priority', kind='unresolved_priority', question='Vilken väg är bäst?', disposition='open', impact='ranking_only',
              reason='Ingen ranking görs; värdekriterium saknas.')]
    write_bundle(draft, directory / 'draft.json')
    return draft


def fabricated_receipts(prepared):
    """For tests/training ONLY: self-reported, obviously fictitious receipts."""
    prepared = Path(prepared)
    snapshot = read_bundle(prepared / 'snapshot.json')
    equal(snapshot['schema_version'], 'ce3-pilot-snapshot/2', 'Training receipts require a new /2 snapshot')
    equal(snapshot['classification'], {'case_kind': 'fabricated_exercise', 'receipt_origin': 'fabricated_test'},
          'Fabricated receipts cannot confirm a declared real case')
    snapshot_id = digest(snapshot)
    shown = hashlib.sha256((prepared / 'review.html').read_bytes()).hexdigest()
    receipts = []
    for kind in ('domain_review', 'customer_confirmation'):
        person = 'FIKTIV övningsperson ' + kind
        statement = 'FABRICERAT TESTKVITTO: jag godtar övningsmodellens angivna scope, antaganden och begränsningar.'
        record = 'confirmation/' + kind + '.json'
        supporting = 'confirmation/' + kind + '.txt'
        path = C.safe_path(prepared / 'materials', record)
        path.parent.mkdir(parents=True, exist_ok=True)
        receipt = {'schema_version': 'ce3-pilot-receipt/2', 'kind': kind, 'decision': 'approved', 'snapshot_id': snapshot_id,
                   'classification': deepcopy(snapshot['classification']),
                   'presentation_sha256': shown, 'stated_person': person, 'stated_role': 'Fiktiv ' + kind,
                   'recorded_by': 'Fiktiv registrerare', 'recorded_at': '2026-10-22T12:00:00+02:00',
                   'statement': statement, 'acknowledgements': C.ACKNOWLEDGEMENTS[:],
                   'assumption_ids': sorted(a['id'] for a in snapshot['assumptions'])}
        with C.safe_path(prepared / 'materials', supporting).open('xb') as stream:
            stream.write(('FABRICERADE ÖVNINGSANTECKNINGAR: inget faktiskt kundsvar.\n' + statement + '\n').encode('utf-8'))
        receipt['supporting_records'] = [C.descriptor(prepared / 'materials', supporting)]
        confirmation = dict(receipt, schema_version='ce3-pilot-confirmation-record/1')
        with path.open('xb') as stream:
            stream.write(encode(confirmation))
        receipt['record'] = C.descriptor(prepared / 'materials', record)
        receipts.append(receipt)
    return receipts


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--fabricated-receipts-for', type=Path)
    args = parser.parse_args()
    if args.fabricated_receipts_for:
        from pilot_runner import new_json
        new_json(args.output, fabricated_receipts(args.fabricated_receipts_for))
    else:
        draft_fixture(args.output)
