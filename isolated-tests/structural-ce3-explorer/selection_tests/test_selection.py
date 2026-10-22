"""Literal and mathematical oracles; real CLI artifacts, adversarial verification."""
from copy import deepcopy
from itertools import combinations
from math import factorial
from pathlib import Path
import builtins
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bridge import ROOT, digest, encode, read_bundle, write_bundle
from contracts import LIMITS
import contracts as single_contracts
import scenario_contracts as contracts
import scenario_runner as runner
import selection
import observe
import core.replay as replay_module


def fixture():
    return read_bundle(ROOT / 'fixtures/optional-decisions-problem.json')


def small(n=1, optional=True, empty=True):
    p = fixture()
    m = p['model']
    m.update(decisions={chr(65+i): {'requires': [], 'effects': {'set': {}, 'add': {}},
                                  'cost': 0, 'schedule': None, 'source': 'Synthetic no-op.'} for i in range(n)},
             events={}, initial_events=[], reference_event_order=[])
    m['clock']['horizon'] = max(n-1, 2)
    s = p['search']
    s.update(required_decision_ids=[] if optional else list(m['decisions']),
             optional_decision_ids=list(m['decisions']) if optional else [],
             choice_groups=[], slots=list(range(n)), allow_empty=empty)
    p['scenario_set']['members'] = [{'label': 'only', 'outcomes': {}}]
    p['observation']['all'] = [{'id': 'safe', 'operator': 'terminal', 'equals': {'safe': True}}]
    return p


def timer(p, name, time, field, value, guards=None):
    m = p['model']
    m['events'][name] = {'kind': 'timer', 'requires': guards or [], 'absent': None,
                         'outcomes': {'apply': {'set': {field: value}, 'add': {}}}, 'source': 'Synthetic timer.'}
    m['initial_events'].append({'id': name, 'due': time, 'scheduled_at': m['clock']['start']})
    m['reference_event_order'].append(name)


def tree(root):
    return {str(p.relative_to(root)): (p.read_bytes(), p.stat().st_mtime_ns)
            for p in root.rglob('*') if p.is_file()}


def rebind(root, *, budget=None, manifest=None):
    """Repair all outer identities after an attack; real input/history/audit remain."""
    spec = read_bundle(root / 'batch.json')
    if budget is not None:
        spec['max_cells'] = budget
    if manifest is not None:
        write_bundle(manifest, root / 'manifest.json')
        pins = read_bundle(root / 'pins.json'); pins['manifest_id'] = digest(manifest)
        write_bundle(pins, root / 'pins.json'); spec['manifest_id'] = digest(manifest)
        spec['search_size'] = deepcopy(manifest['search_size'])
    write_bundle(spec, root / 'batch.json')
    attempt = read_bundle(root / 'attempt.json'); attempt['batch_spec_id'] = digest(spec)
    write_bundle(attempt, root / 'attempt.json')
    for d in (root / 'runs').iterdir():
        for filename in ('started.json', 'record.json'):
            if not (d / filename).exists():
                continue
            value = read_bundle(d / filename); value['batch_spec_id'] = digest(spec)
            if filename == 'record.json':
                obs = read_bundle(d / 'observation.json'); obs['batch_spec_id'] = digest(spec)
                write_bundle(obs, d / 'observation.json'); value['observation_id'] = digest(obs)
            write_bundle(value, d / filename)
    result = read_bundle(root / 'result.json'); result['batch_spec_id'] = digest(spec)
    if manifest is not None:
        kept = {c['cell_id'] for c in manifest['cells']}
        result['manifest_id'] = digest(manifest)
        result['search_size'] = deepcopy(manifest['search_size'])
        result['cells'] = [c for c in result['cells'] if c['cell_id'] in kept]
        result['candidates'] = [c for c in result['candidates'] if c['candidate_id'] in
                                {p['candidate_id'] for p in manifest['candidates']}]
        for c in result['candidates']:
            c['cell_ids'] = [key for key in c['cell_ids'] if key in kept]
            c['expected_scenarios'] = c['certified_cells'] = len(c['cell_ids'])
        result['cell_coverage'].update(expected=len(kept), certified=len(kept), uncertified=[])
        result['enumeration_coverage'].update(expected=len(kept), observed=len(kept))
        result['candidate_coverage'].update(expected=len(manifest['candidates']), certified_represented=len(manifest['candidates']))
    result.pop('result_id'); result['result_id'] = digest(result)
    write_bundle(result, root / 'result.json')


class SelectedPlans(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='ce3-selected-tests-')
        cls.base = Path(cls.temp.name)
        cls.p = fixture(); cls.expected = read_bundle(ROOT / 'fixtures/optional-decisions-expected.json')
        cls.manifest, cls.pins = contracts.freeze(cls.p)
        cls.full = cls.base / 'full'
        original = runner.cli_process
        calls = []
        def traced(command, *args):
            calls.append(command)
            return original(command, *args)
        with patch.object(runner, 'cli_process', side_effect=traced):
            cls.result = runner.run(cls.p, cls.manifest, cls.pins, cls.full)
        assert calls == ['replay', 'audit'] * 48

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        self.root = self.base / self.id().split('.')[-1]; self.root.mkdir()
        self.serial = 0

    def destination(self):
        self.serial += 1
        return self.root / str(self.serial)

    def clone(self):
        dest = self.destination(); shutil.copytree(self.full, dest); return dest

    def execute(self, p, **kwargs):
        dest = self.destination(); manifest, pins = contracts.freeze(p)
        return dest, runner.run(p, manifest, pins, dest, **kwargs), pins

    def verify(self, root, pins=None):
        before = tree(root)
        real_open = builtins.open
        def readonly(file, mode='r', *args, **kwargs):
            if any(c in mode for c in 'wax+'):
                raise AssertionError('verify wrote a file')
            return real_open(file, mode, *args, **kwargs)
        with patch.object(runner, 'cli_process', side_effect=AssertionError('CLI during verify')), \
             patch.object(subprocess, 'run', side_effect=AssertionError('subprocess during verify')), \
             patch.object(replay_module, 'replay', side_effect=AssertionError('replay during verify')), \
             patch.object(runner, 'write_bundle', side_effect=AssertionError('write during verify')), \
             patch('builtins.open', side_effect=readonly):
            result = runner.verify(root, self.pins if pins is None else pins)
        self.assertEqual(before, tree(root)); return result

    def projection(self, root, cell):
        return read_bundle(root / 'runs' / cell['cell_id'] / 'observation.json')['projection']

    def mutate_observation(self, root, cell, mutate):
        directory = root / 'runs' / cell['cell_id']
        obs = read_bundle(directory / 'observation.json'); mutate(obs['projection'])
        write_bundle(obs, directory / 'observation.json')
        record = read_bundle(directory / 'record.json'); record['observation_id'] = digest(obs)
        write_bundle(record, directory / 'record.json')

    def ordered_ids(self):
        # Literal oracle, not production enumeration or order helper.
        labels = ['approved', 'rejected', 'absent']
        cells = {(''.join(c['order']), c['scenario_label']): c['cell_id'] for c in self.result['cells']}
        return [cells[(w, s)] for w in sorted(self.expected['orders'], key=lambda w: (len(w), w)) for s in labels]

    def test_01_full_literal_matrix_and_direct_inputs(self):
        self.assertEqual(self.result['cell_coverage']['status'], 'COMPLETE')
        self.assertEqual({''.join(c['order']) for c in self.manifest['candidates']}, set(self.expected['orders']))
        self.assertEqual(len(self.manifest['candidates']), 16)
        self.assertEqual(len(self.result['cells']), 48)
        self.assertEqual(sum(c['goal_satisfied'] for c in self.result['cells']), 8)
        self.assertEqual({''.join(c['order']) for c in self.result['candidates'] if c['robust']=='TRUE'}, {'PN','PNX'})
        for cell in self.result['cells']:
            w, label = ''.join(cell['order']), cell['scenario_label']
            self.assertEqual(cell['goal_satisfied'], w in self.expected['positive'][label])
            self.assertEqual(cell['run_status'], 'CERTIFIED')
            self.assertEqual(cell['event_path_coverage'], {'status':'COMPLETE','audited_paths':1})
            direct = {'schema_version':'ce3-run/1','profile':'fixed-replay/0.1','model':self.p['model'],
                      'sources':{},'outcomes':{'response':label},'script':{'schema_version':'ce3-script/1',
                      'source':'CE3 selected fixed plan: one attempt per selected decision, prefix slots.',
                      'steps':{str([0,2,4][i]):[{'decision':d,'mode':'attempt'}] for i,d in enumerate(w)}}}
            self.assertEqual(read_bundle(self.full/'runs'/cell['cell_id']/'input.json'), direct)
            obs = self.projection(self.full, cell)
            self.assertEqual(obs['schema_version'], 'ce3-goal-observation/3')
            self.assertEqual(obs['selection_evidence']['selected_ids'], sorted(w))
            self.assertEqual(obs['selection_evidence']['omitted_ids'], sorted(set('PUNX')-set(w)))
        self.assertEqual(self.result, self.verify(self.full))

    def test_02_at_most_one_literal_extension(self):
        p=fixture();p['search']['choice_groups'][0]['kind']='at_most_one'
        root,result,pins=self.execute(p)
        self.assertEqual(len(result['cells']),57)
        self.assertEqual({''.join(c['order']) for c in result['candidates']}, set(self.expected['orders'])|{'P','PX','XP'})
        self.assertEqual(sum(c['goal_satisfied'] for c in result['cells']),8)
        self.assertEqual({''.join(c['order']) for c in result['candidates'] if c['robust']=='TRUE'},{'PN','PNX'})
        self.assertEqual(result,self.verify(root,pins))

    def test_03_free_optionals_empty_and_no_empty_counts(self):
        for allow,count in [(True,27),(False,26)]:
            p=fixture();s=p['search'];s.update(required_decision_ids=[],optional_decision_ids=['P','U','N','X'],allow_empty=allow)
            s['choice_groups'][0]['kind']='at_most_one'
            m,_=contracts.freeze(p)
            self.assertEqual(len(m['candidates']),count)
            self.assertEqual(any(not c['order'] for c in m['candidates']),allow)
        p=small(2);root,result,pins=self.execute(p)
        self.assertEqual({tuple(c['order']) for c in result['candidates']},{(),('A',),('B',),('A','B'),('B','A')})
        self.assertTrue(all(c['goal_satisfied'] for c in result['cells']))
        self.assertEqual(result,self.verify(root,pins))

    def test_04_empty_initial_success_later_loss(self):
        p=small();p['model']['initial']['done']=True
        timer(p,'drop',1,'done',False)
        p['observation']['all']=[{'id':'end','operator':'terminal','equals':{'done':True}},
            {'id':'reach','operator':'reach_by','equals':{'done':True},'deadline':2},
            {'id':'always','operator':'always','equals':{'done':True},'through':2}]
        root,result,_=self.execute(p)
        cell=next(c for c in result['cells'] if not c['order']);obs=self.projection(root,cell)
        self.assertFalse(cell['goal_satisfied']);self.assertTrue(obs['all_attempts_accepted'])
        comps=obs['paths'][0]['components']
        self.assertEqual([c['satisfied'] for c in comps],[False,True,False])
        self.assertEqual(comps[1]['evidence']['witness']['row_index'],0)
        self.assertEqual(comps[1]['evidence']['witness']['side'],'before')
        self.assertEqual(obs['selection_evidence']['expected_entries'],[])
        self.assertEqual(read_bundle(root/'runs'/cell['cell_id']/'input.json')['script']['steps'],{})

    def test_05_omitted_versus_selected_blocked_and_prefix(self):
        p=fixture();p['observation']['all']=[{'id':'end','operator':'terminal','equals':{'done':True}}]
        root,result,_=self.execute(p)
        by={(tuple(c['order']),c['scenario_label']):c for c in result['cells']}
        for word,accepted in [('PN',True),('PXN',False)]:
            cell=by[(tuple(word),'approved')];obs=self.projection(root,cell)
            self.assertTrue(obs['components_satisfied']);self.assertEqual(obs['all_attempts_accepted'],accepted)
        pu=by[(tuple('PU'),'approved')];pxu=by[(tuple('PXU'),'approved')]
        scripts=[read_bundle(root/'runs'/c['cell_id']/'input.json')['script']['steps'] for c in [pu,pxu]]
        self.assertEqual(scripts[0],{'0':[{'decision':'P','mode':'attempt'}],'2':[{'decision':'U','mode':'attempt'}]})
        self.assertEqual(scripts[1]['4'],[{'decision':'U','mode':'attempt'}])

    def test_06_omitted_schedule_keeps_full_bindings_and_validation(self):
        p=small();p['model']['events']=deepcopy(self.p['model']['events']);p['model']['reference_event_order']=['response']
        p['model']['decisions']['A']['schedule']={'event':'response','delay':1}
        p['scenario_set']['members']=deepcopy(self.p['scenario_set']['members'])
        root,result,_=self.execute(p)
        for c in result['cells']:
            data=read_bundle(root/'runs'/c['cell_id']/'input.json');history=read_bundle(root/'runs'/c['cell_id']/'history.json.gz')
            self.assertEqual(data['model'],p['model']);self.assertEqual(len(data['outcomes']),1)
            if not c['order']:
                self.assertEqual(history['paths'][0]['unused_outcomes'],['response'])
                self.assertEqual(history['paths'][0]['snapshot']['pending'],[])
        p['model']['events']['response']['outcomes']['rejected']['set']['unknown']=True
        with self.assertRaises(ValueError):contracts.freeze(p)
        p=small();p['scenario_set']['members'][0]['outcomes']={'unused':'absent'}
        with self.assertRaises(ValueError):contracts.freeze(p)

    def test_07_invalid_partitions_groups_and_flags(self):
        cases=[]
        def change(fn):
            p=fixture();fn(p['search']);cases.append(p)
        change(lambda s:s['required_decision_ids'].append('U'))
        change(lambda s:s['optional_decision_ids'].remove('X'))
        change(lambda s:s['optional_decision_ids'].append('Z'))
        change(lambda s:s['optional_decision_ids'].append('X'))
        change(lambda s:s['choice_groups'].append({'id':'overlap','kind':'at_most_one','members':['U','X']}))
        change(lambda s:s['choice_groups'][0].update(members=['P','N']))
        change(lambda s:s['choice_groups'][0].update(members=['U']))
        change(lambda s:s['choice_groups'][0].update(members=['U','U']))
        change(lambda s:s['choice_groups'][0].update(kind='conditional'))
        change(lambda s:s['choice_groups'][0].update(id=' '))
        change(lambda s:s.update(allow_empty=1))
        change(lambda s:s.update(retry=0))
        change(lambda s:s.update(early_stop=0))
        change(lambda s:s.update(mode='if_not_taken'))
        change(lambda s:s.update(depends_on=[]))
        for p in cases:
            with self.subTest(search=p['search']),self.assertRaises(ValueError):contracts.freeze(p)
        for word in [[],['U'],['P','U','N'],['P','P','U'],['P'],['P','Z']]:
            with self.subTest(word=word),self.assertRaises(ValueError):contracts.candidate(fixture(),word)

    def test_08_all_slot_types_bounds_and_negative_times(self):
        for slots in ([0,2], [0,2,True],[0,2,4.0],[0,2,'4'],[0,2,2],[0,4,2],[-1,2,4],[0,2,6]):
            p=fixture();p['search']['slots']=slots
            with self.subTest(slots=slots),self.assertRaises(ValueError):contracts.freeze(p)
        p=small();p['model']['clock'].update(start=-3,horizon=-3);p['search']['slots']=[-3]
        _,result,_=self.execute(p);self.assertTrue(all(c['goal_satisfied'] for c in result['cells']))

    def test_09_size_gate_before_materialization(self):
        for p in [small(6),small(7),small(1000)]:
            with self.subTest(n=len(p['model']['decisions'])):
                with patch.object(contracts,'candidate',side_effect=AssertionError('candidate constructed')), \
                     patch.object(single_contracts,'materialize',side_effect=AssertionError('input constructed')), \
                     patch.object(selection,'expected_orders',side_effect=AssertionError('enumerated')), \
                     patch.object(selection,'generated_orders',side_effect=AssertionError('generated')):
                    with self.assertRaisesRegex(ValueError,'Unsupported search size'):contracts.freeze(p)
                    with self.assertRaisesRegex(ValueError,'Unsupported search size'):contracts.generate(p)
                    dest=self.destination()
                    with self.assertRaisesRegex(ValueError,'Unsupported search size'):runner.run(p,{}, {},dest,max_cells=0)
                    self.assertFalse(dest.exists())
                # The direct helper boundary must reject too, before copying the model.
                with patch.object(single_contracts,'deepcopy',side_effect=AssertionError('model copied')):
                    with self.assertRaisesRegex(ValueError,'Unsupported search size'):
                        single_contracts.materialize(contracts.effective_problem(p,p['scenario_set']['members'][0]),['A'])
                with self.assertRaisesRegex(ValueError,'Unsupported search size'):contracts.candidate(p,['A'])
        p=small(6,False);p['scenario_set']['members']=[{'label':str(i),'outcomes':{}} for i in range(3)]
        m,_=contracts.freeze(p);self.assertEqual((len(m['candidates']),len(m['cells'])),(720,2160))
        p['scenario_set']['members'].append({'label':'four','outcomes':{}})
        with patch.object(contracts,'candidate',side_effect=AssertionError('materialized')):
            with self.assertRaisesRegex(ValueError,'2160'):contracts.freeze(p)
        with self.assertRaisesRegex(ValueError,'2160'):contracts.materialize(p,m['candidates'][0],m['scenarios'][0])
        self.assertEqual(selection.search_size(small(5))['candidates'],326)

    def test_10_independent_algorithms_and_math(self):
        p=fixture()
        with patch.object(selection,'generated_orders',side_effect=AssertionError('generator used')), \
             patch.object(selection,'permutations',side_effect=AssertionError('permutations used')), \
             patch.object(selection,'product',side_effect=AssertionError('product used')):
            m,_=contracts.freeze(p);self.assertEqual(len(m['candidates']),16)
        with patch.object(selection,'expected_orders',side_effect=AssertionError('oracle used')), \
             patch.object(selection,'factorial_orders',side_effect=AssertionError('factorial oracle used')):
            self.assertEqual(len(contracts.generate(p)),48)
        # Independent sum over explicitly chosen subsets for each n; no production enumeration as oracle.
        for n in range(1,6):
            p=small(n)
            expected=sum(sum(1 for _ in combinations(range(n),k))*factorial(k) for k in range(n+1))
            self.assertEqual(selection.search_size(p)['candidates'],expected)
            self.assertEqual(len(selection.expected_orders(p)),expected)
            self.assertEqual(len(selection.generated_orders(p)),expected)

    def test_11_canonical_identities_and_version_isolation(self):
        p=fixture();q=deepcopy(p);q['search']['optional_decision_ids'].reverse();q['search']['choice_groups'][0]['members'].reverse()
        self.assertEqual(contracts.candidate(p,['P','N']),contracts.candidate(q,['P','N']))
        self.assertNotEqual(contracts.freeze(p)[1],contracts.freeze(q)[1])
        q=deepcopy(p);q['search']['allow_empty']=True
        self.assertNotEqual(contracts.search_identity(p),contracts.search_identity(q))
        self.assertEqual(contracts.candidate(p,['P','N'])['plan_id'],contracts.candidate(q,['P','N'])['plan_id'])
        q=deepcopy(p);q['observation']['all'][1]['deadline']=3
        self.assertEqual(contracts.search_identity(p),contracts.search_identity(q));self.assertNotEqual(contracts.freeze(p)[1],contracts.freeze(q)[1])
        for version in ['1','2','3']:
            q=deepcopy(p);q['schema_version']='ce3-scenario-problem/'+version
            with self.assertRaises((ValueError,KeyError)):contracts.freeze(q)
        for change in [('schema_version','ce3-history-goal/1'),('acceptance_scope','model_decisions'),('all_attempts_accepted',False)]:
            q=deepcopy(p);q['observation'][change[0]]=change[1]
            with self.assertRaises(ValueError):contracts.freeze(q)
        q=deepcopy(p);q['purpose']='bounded_real_pilot'
        with self.assertRaisesRegex(ValueError,'Only technical'):contracts.freeze(q)

    def test_12_whole_selection_or_cell_removed_with_rehashed_package(self):
        for whole in [True,False]:
            root=self.clone();m=read_bundle(root/'manifest.json')
            if whole:
                plans={c['candidate_id'] for c in m['candidates'] if set(c['order'])==set('PN')}
                removed={c['cell_id'] for c in m['cells'] if c['candidate_id'] in plans}
                m['candidates']=[c for c in m['candidates'] if c['candidate_id'] not in plans]
                # Lie consistently about polynomial/population counts too.
                m['search_size'].update(subsets_by_length=[0,0,1,2],candidates=14,cells=42)
            else:removed={m['cells'][0]['cell_id']}
            m['cells']=[c for c in m['cells'] if c['cell_id'] not in removed]
            enumeration=[c for c in read_bundle(root/'enumeration.json') if c['cell_id'] not in removed]
            write_bundle(enumeration,root/'enumeration.json')
            for key in removed:shutil.rmtree(root/'runs'/key)
            rebind(root,manifest=m)
            self.assertEqual(contracts.check_population(m,enumeration)['status'],'COMPLETE')
            # Even newly recomputed external pins cannot authorize a false population of the same problem.
            with self.assertRaisesRegex(ValueError,'Trusted problem/manifest'):self.verify(root,read_bundle(root/'pins.json'))

    def test_13_duplicate_missing_extra_and_wrong_content_enumeration(self):
        for kind in ['duplicate','missing','extra','content']:
            root=self.clone();e=read_bundle(root/'enumeration.json')
            if kind=='duplicate':e[-1]=deepcopy(e[0])
            elif kind=='missing':e.pop()
            elif kind=='extra':e.append(dict(e[0],cell_id='f'*64))
            else:e[0]['input_identity']='0'*64
            write_bundle(e,root/'enumeration.json');result=self.verify(root)
            self.assertEqual(result['cell_coverage']['status'],'INCOMPLETE' if kind=='missing' else 'INVALID')
            self.assertEqual(sum(c['run_status']=='CERTIFIED' for c in result['cells']),48)

    def test_14_forged_selection_evidence_and_candidate_length(self):
        cell=next(c for c in self.result['cells'] if c['order']==['P','N'])
        mutations=[lambda p:p['selection_evidence'].update(selected_ids=['P','N','X']),
                   lambda p:p['selection_evidence'].update(required_ids=[]),
                   lambda p:p['selection_evidence']['groups'][0].update(selected_ids=['N','U']),
                   lambda p:p['selection_evidence']['expected_entries'].pop(),
                   lambda p:p['selection_evidence'].update(selection_satisfied=False),
                   lambda p:p['selection_evidence'].update(candidate_id='0'*64)]
        for mutate in mutations:
            root=self.clone();self.mutate_observation(root,cell,mutate);result=self.verify(root)
            bad=next(c for c in result['cells'] if c['cell_id']==cell['cell_id'])
            self.assertEqual(bad['goal_status'],'UNKNOWN');self.assertIn('Observation mismatch',bad['reason'])
        for field,value in [('order',['P']),('selected_ids',['P']),('script',{'schema_version':'ce3-script/1','source':'wrong','steps':{}})]:
            plan=deepcopy(next(p for p in self.manifest['candidates'] if p['order']==['P','N']));plan[field]=value
            with self.assertRaises(ValueError):contracts.materialize(self.p,plan,self.manifest['scenarios'][0])

    def test_15_wrong_script_with_fresh_valid_replay_is_not_accepted(self):
        root=self.clone();cell=next(c for c in self.result['cells'] if c['order']==['P','N']);d=root/'runs'/cell['cell_id']
        value=read_bundle(d/'input.json');value['script']['steps'].pop('0');write_bundle(value,d/'input.json')
        # Valid replay, but it omits mandatory P and no longer belongs to the frozen candidate.
        for command,args in [('replay',('--input',d/'input.json','--output',d/'history.json.gz')),
                             ('audit',('--history',d/'history.json.gz','--trusted-input',d/'input.json','--output',d/'audit.json'))]:
            self.assertEqual(runner.cli_process(command,*args)['exit_code'],0)
        record=read_bundle(d/'record.json');record.update(runner.artifact_record({},d));write_bundle(record,d/'record.json')
        result=self.verify(root);bad=next(c for c in result['cells'] if c['cell_id']==cell['cell_id'])
        self.assertEqual(bad['goal_status'],'UNKNOWN');self.assertIn('Stored input differs',bad['reason'])
        with self.assertRaises(ValueError):selection.script_evidence(self.p,value['script'])

    def test_16_budget_prefix_and_reordered_enumeration(self):
        ids=self.ordered_ids()
        for keep in [ids[:4],ids[1:5]]:
            root=self.clone();rebind(root,budget=4)
            for d in (root/'runs').iterdir():
                if d.name not in keep:shutil.rmtree(d)
            e=read_bundle(root/'enumeration.json');e.reverse();write_bundle(e,root/'enumeration.json')
            result=self.verify(root)
            self.assertEqual(result['cell_coverage']['status'],'INCOMPLETE' if keep==ids[:4] else 'INVALID')
            self.assertEqual(sum(c['run_status']=='CERTIFIED' for c in result['cells']),4)
        root=self.clone();rebind(root,budget=0);result=self.verify(root)
        self.assertEqual(result['cell_coverage']['status'],'INVALID')
        self.assertEqual(sum(c['goal_satisfied'] for c in result['cells']),8)

    def test_17_partial_empty_failed_attempts_consume_budget(self):
        ids=self.ordered_ids()
        for retained in [None,'input.json','started.json','failure.json']:
            root=self.clone();rebind(root,budget=2)
            for d in (root/'runs').iterdir():
                if d.name not in ids[:2]:shutil.rmtree(d)
            d=root/'runs'/ids[1]
            for file in d.iterdir():
                if file.name!=retained:file.unlink()
            if retained=='failure.json':write_bundle({'status':'UNVERIFIED'},d/retained)
            self.assertEqual(self.verify(root)['cell_coverage']['status'],'INCOMPLETE')
            rebind(root,budget=1)
            self.assertEqual(self.verify(root)['cell_coverage']['status'],'INVALID')
            shutil.rmtree(root/'runs'/ids[0])
            # One failed/empty attempt fits budget=1 but is outside its prefix.
            self.assertEqual(self.verify(root)['cell_coverage']['status'],'INVALID')

    def test_18_real_failure_and_zero_budget_do_not_shrink_population(self):
        original=runner.cli_process;count=0
        def timeout(command,*args):
            nonlocal count
            if command=='replay':
                count+=1
                if count==2:raise subprocess.TimeoutExpired('injected',60)
            return original(command,*args)
        with patch.object(runner,'cli_process',side_effect=timeout):
            root,result,pins=self.execute(fixture(),max_cells=2)
        self.assertEqual(count,2);self.assertEqual(len(result['cells']),48)
        self.assertEqual(len(list((root/'runs').iterdir())),2)
        self.assertEqual(sum(c['run_status']=='CERTIFIED' for c in result['cells']),1)
        self.assertEqual(result,self.verify(root,pins))
        root,result,pins=self.execute(fixture(),max_cells=0)
        self.assertTrue(all(c['goal_satisfied'] is None for c in result['cells']))
        self.assertTrue(all(c['robust']=='UNKNOWN' for c in result['candidates']))
        self.assertEqual(result,self.verify(root,pins))

    def test_19_candidate_length_order_and_scenario_order(self):
        p=fixture();p['scenario_set']['members'].reverse()
        root,result,_=self.execute(p,max_cells=13)
        actual={(tuple(c['order']),c['scenario_label']) for c in result['cells'] if c['run_status']=='CERTIFIED'}
        expected=[(tuple(w),s) for w in sorted(self.expected['orders'],key=lambda w:(len(w),w))
                  for s in ['absent','rejected','approved']][:13]
        self.assertEqual(actual,set(expected))
        # A lexicographic-only prefix would put three-decision NPX before PN.
        self.assertIn((tuple('PN'),'approved'),actual)
        p=small();_,result,_=self.execute(p,max_cells=1)
        self.assertEqual([c['order'] for c in result['cells'] if c['run_status']=='CERTIFIED'],[[]])

    def test_20_all_event_paths_and_missing_negative_path(self):
        p=small();timer(p,'clear',1,'safe',False,[{'field':'done','op':'eq','value':False}]);timer(p,'lock',1,'done',True)
        root,result,pins=self.execute(p)
        self.assertTrue(all(c['goal_satisfied'] is False for c in result['cells']))
        for c in result['cells']:
            self.assertEqual(c['event_path_coverage']['audited_paths'],2)
            self.assertEqual(sorted(x['goal_satisfied'] for x in self.projection(root,c)['paths']),[False,True])
        cell=result['cells'][0];d=root/'runs'/cell['cell_id'];bundle=read_bundle(d/'history.json.gz')
        bundle['paths']=[p for p in bundle['paths'] if p['snapshot']['state']['safe']]
        write_bundle(bundle,d/'history.json.gz');record=read_bundle(d/'record.json');record.update(runner.artifact_record({},d));write_bundle(record,d/'record.json')
        result=self.verify(root,pins)
        self.assertIsNone(next(c for c in result['cells'] if c['cell_id']==cell['cell_id'])['goal_satisfied'])

    def test_21_limits_model_error_and_gzip_are_unknown(self):
        p=small();timer(p,'a',1,'safe',False);timer(p,'b',1,'safe',True)
        for field in LIMITS:
            limits=dict(LIMITS);limits[field]=1
            root,result,_=self.execute(p,limits=limits)
            self.assertTrue(all(c['goal_satisfied'] is None for c in result['cells']))
        p=small();p['model']['domains']['count']={'integer':[0,0]};p['model']['initial']['count']=0
        timer(p,'overflow',1,'safe',True);p['model']['events']['overflow']['outcomes']['apply']['add']={'count':1}
        root,result,_=self.execute(p)
        self.assertTrue(all(c['goal_satisfied'] is None for c in result['cells']))
        self.assertFalse(list(root.rglob('observation.json')))
        root=self.clone();cell=self.result['cells'][0];d=root/'runs'/cell['cell_id'];file=d/'history.json.gz';file.write_bytes(file.read_bytes()[:-8])
        result=self.verify(root);bad=next(c for c in result['cells'] if c['cell_id']==cell['cell_id'])
        self.assertIsNone(bad['goal_satisfied']);self.assertEqual(sum(c['run_status']=='CERTIFIED' for c in result['cells']),47)

    def test_22_readonly_summary_ignored_and_robust_unknown(self):
        root=self.clone();(root/'result.json').write_text('not JSON')
        self.assertEqual(self.verify(root),self.result)
        pn=next(c for c in self.result['cells'] if c['order']==['P','N'])
        shutil.rmtree(root/'runs'/pn['cell_id']);result=self.verify(root)
        self.assertEqual(next(c for c in result['candidates'] if c['order']==['P','N'])['robust'],'UNKNOWN')
        self.assertEqual(result['candidate_coverage']['status'],'COMPLETE')
        self.assertEqual(result['scenario_coverage']['status'],'COMPLETE')
        self.assertEqual(result['cell_coverage']['status'],'INCOMPLETE')

    def test_23_direct_observer_rejects_unauthorized_script(self):
        p=fixture();cell=next(c for c in self.result['cells'] if c['order']==['P','N']);d=self.full/'runs'/cell['cell_id']
        value=read_bundle(d/'input.json');value['script']['steps']={}
        bundle=replay_module.replay(value);audit=observe.audit_bundle(bundle,digest(value))
        self.assertEqual(audit['status'],'PASS')
        effective={k:v for k,v in p.items() if k!='scenario_set'};effective['outcomes']=value['outcomes']
        with self.assertRaises(ValueError):observe.observe(effective,bundle,value,audit,'runtime','build')
        # Correct cardinality but wrong decision/time must not satisfy candidate attempts.
        evidence=selection.script_evidence(p,read_bundle(d/'input.json')['script'])
        rows=read_bundle(d/'history.json.gz')['paths'][0]['history']
        rows=deepcopy(rows);next(r for r in rows if r['kind']=='decision_executed')['action']='U'
        with self.assertRaises(ValueError):selection.accepted_attempts(evidence,rows)

    def test_24_multiple_disjoint_groups_and_renaming(self):
        p=small(5);p['search'].update(choice_groups=[{'id':'a','kind':'exactly_one','members':['A','B']},
            {'id':'b','kind':'at_most_one','members':['C','D']}],slots=[0,1,2])
        # 2z(1+2z)(1+z)=2z+6z²+4z³ => 2+12+24=38.
        m,_=contracts.freeze(p);self.assertEqual(len(m['candidates']),38)
        self.assertEqual(len(contracts.generate(p)),38)
        q=deepcopy(p);q['search']['choice_groups'].reverse()
        for g in q['search']['choice_groups']:g['members'].reverse()
        self.assertEqual(contracts.search_identity(p),contracts.search_identity(q))
        p=fixture();rename={'P':'prepare','U':'upgrade','N':'purchase','X':'check'}
        p['model']['decisions']={rename[k]:v for k,v in p['model']['decisions'].items()}
        for key in ('required_decision_ids','optional_decision_ids'):p['search'][key]=[rename[k] for k in p['search'][key]]
        p['search']['choice_groups'][0]['members']=[rename[k] for k in ['U','N']]
        _,result,_=self.execute(p)
        self.assertEqual(sum(c['goal_satisfied'] for c in result['cells']),8)
        self.assertEqual({tuple(c['order']) for c in result['candidates'] if c['robust']=='TRUE'},
                         {('prepare','purchase'),('prepare','purchase','check')})

    def test_25_all_required_matches_legacy_operational_history_and_goals(self):
        p=small(2,False,False)
        p['model']['decisions']['A']['requires']=[{'field':'done','op':'eq','value':True}]
        p['model']['decisions']['B']['effects']['set']={'done':True}
        timer(p,'drop',2,'safe',False)
        p['observation']['all']=[{'id':'end','operator':'terminal','equals':{'safe':False}},
            {'id':'reach','operator':'reach_by','equals':{'done':True},'deadline':1},
            {'id':'safe','operator':'always','equals':{'safe':True},'through':1}]
        old=deepcopy(p);old['schema_version']='ce3-scenario-problem/3'
        old['search']={'kind':'permutations_once/2','decision_ids':['A','B'],'slots':[0,1],
                       'mode':'attempt','retry':False,'early_stop':False}
        old['observation']['schema_version']='ce3-history-goal/1'
        del old['observation']['acceptance_scope']
        newroot,newresult,_=self.execute(p)
        oldroot,oldresult,oldpins=self.execute(old)
        for root,result in [(newroot,newresult),(oldroot,oldresult)]:
            self.assertEqual({''.join(c['order']):c['goal_satisfied'] for c in result['cells']},
                             {'AB':False,'BA':True})
            self.assertEqual(result['cell_coverage']['status'],'COMPLETE')
        for newcell in newresult['cells']:
            oldcell=next(c for c in oldresult['cells'] if c['order']==newcell['order'])
            self.assertNotEqual(newcell['candidate_id'],oldcell['candidate_id'])
            self.assertEqual(read_bundle(newroot/'runs'/newcell['cell_id']/'history.json.gz')['paths'],
                             read_bundle(oldroot/'runs'/oldcell['cell_id']/'history.json.gz')['paths'])
            self.assertEqual(self.projection(newroot,newcell)['paths'],self.projection(oldroot,oldcell)['paths'])
        self.assertEqual(oldresult,self.verify(oldroot,oldpins))


if __name__ == '__main__':
    unittest.main()
