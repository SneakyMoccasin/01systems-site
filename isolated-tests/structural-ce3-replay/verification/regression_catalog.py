"""Read-only case selection. Expected values never enter a normalized run."""
from copy import deepcopy
from core.history import read_bundle, digest
from adapters.factory_v1 import adapt as factory_adapt
from adapters.transport_t1 import adapt as transport_adapt
from verification.checkpoint_checks import ROOT, FACTORY, TRANSPORT, input_sources, require

SAME = TRANSPORT / "same-parking-week14"


def factory_probes(candidate):
    def script(steps):
        value = deepcopy(candidate)
        value["decisions_by_week"] = steps
        return value
    late = deepcopy(candidate)
    del late["decisions_by_week"]["10"], late["decisions_by_week"]["12"]
    late["decisions_by_week"].update({"24": ["D6"], "26": ["D8"]})
    return {
        "once_only": script({"0": ["D9", "D9"]}),
        "lease_week_4": script({"4": ["D2"]}),
        "lease_week_5": script({"5": ["D2"]}),
        "secure_week_6": script({"6": ["D9"]}),
        "secure_week_7": script({"7": ["D9"]}),
        "quality_then_d8_at_horizon": late,
        "lease_loss_at_horizon": script({"0": ["D9"], "18": ["D10"]}),
        "effect_beyond_horizon": script({"0": ["D9"], "26": ["D10"]}),
        "modernization_timer": script({"0": ["D9", "D11"]}),
        "both_machines_allowed": script({"0": ["D1", "D2", "D7"], "2": ["D3", "D4", "D5"],
                                         "10": ["D6"], "12": ["D8"]}),
        "auditor_reference": deepcopy(candidate),
    }


def catalog():
    fm = read_bundle(FACTORY / "model.json")
    candidate = read_bundle(FACTORY / "candidate.json")
    mf = ROOT / "cases/factory/metadata.json"
    mt = ROOT / "cases/transport/metadata.json"
    contract = FACTORY / "sources/structural-ce-v1-frozen.txt"
    bank = read_bundle(FACTORY / "bank-rejection-ab/scripts.json")
    specs = []

    def factory(package, name, script, reference, files, groups, target=None, source=None, main=True):
        old = read_bundle(reference)
        require(digest(old["script"]) == digest(script), f"Saved script mismatch: {package}/{name}")
        run = factory_adapt(fm, script, read_bundle(mf), input_sources([
            FACTORY / "model.json", FACTORY / "sources/factory-assumed.txt", mf, contract, *files]), source)
        specs.append(dict(package=package, name=name, run=run, reference=reference, model=fm,
                          script=script, groups=groups, target=target, main=main, family="factory"))

    base = {"2": ["E_BANK", "E_PL_PREMISES"]}
    for scenario in read_bundle(FACTORY / "scenarios.json"):
        script = deepcopy(candidate)
        script["external_outcomes"].update(scenario["outcome_overrides"])
        script["decisions_by_week"] = {w: [scenario["replace_decisions"].get(d, d) for d in ds]
                                       for w, ds in script["decisions_by_week"].items()}
        groups = deepcopy(base)
        if scenario["id"] == "machine_moved":
            groups["6"] = ["E_PL_TEAM", "E_MOVED_MACHINE"]
        factory("factory", scenario["id"], script, FACTORY / f'results/histories/{scenario["id"]}.json',
                [FACTORY / "candidate.json", FACTORY / "scenarios.json"], groups, scenario["expected"])
    for name in ("A", "B"):
        groups = deepcopy(base)
        if name == "B":
            groups.update({"6": ["E_PL_TEAM", "E_MOVED_MACHINE"], "8": ["E_SE_TEAM_LEAVES", "E_QUALITY"]})
        factory("bank", name, bank[name], FACTORY / f"bank-rejection-ab/results/{name}-histories.json",
                [FACTORY / "bank-rejection-ab/scripts.json"], groups, source=bank["source"])
    for name, script in factory_probes(candidate).items():
        groups = {}
        if name in ("quality_then_d8_at_horizon", "both_machines_allowed", "auditor_reference"):
            groups.update(base)
        if name == "both_machines_allowed":
            groups["6"] = ["E_PL_TEAM", "E_MOVED_MACHINE"]
        factory("factory_probes", name, script, FACTORY / f"results/histories/probes/{name}.json",
                [FACTORY / "candidate.json", FACTORY / "checks.py"], groups, main=False)

    tm = read_bundle(TRANSPORT / "model.json")
    scripts_original = read_bundle(TRANSPORT / "scripts.json")
    exact = deepcopy(scripts_original)
    exact["A"]["decisions_by_week"]["0"] = [e for e in exact["A"]["decisions_by_week"]["0"] if e["id"] != "T12"]
    exact["A"]["decisions_by_week"]["12"].append({"id": "T12", "only_if_not_taken": False})
    require(read_bundle(SAME / "scripts.json") == exact, "Same-parking script changed beyond authorized T12 move")
    for package, folder in (("transport", TRANSPORT), ("same_parking", SAME)):
        scripts = read_bundle(folder / "scripts.json")
        expected = read_bundle(folder / "expected.json")
        def transport(name, model, script, external, reference, groups, target, main):
            old = read_bundle(reference)
            require(digest(old["model"]) == digest(model) and digest(old["script"]) == digest(script)
                    and old["external"] == external, f"Saved input mismatch: {package}/{name}")
            run = transport_adapt(model, script, external, read_bundle(mt), input_sources([
                TRANSPORT / "model.json", folder / "scripts.json", TRANSPORT / "sources/transport-t1-user.txt",
                folder / "run-spec.txt", TRANSPORT / "checks.py", mt, contract]))
            specs.append(dict(package=package if main else package + "_probes", name=name, run=run,
                              reference=reference, model=model, script=script, groups=groups, target=target,
                              main=main, family="transport"))
        for name, target in expected["scenarios"].items():
            transport(name, tm, scripts[target["arm"]], {"E_T2": target["outcome"]},
                      folder / f"results/run-1/histories/{name}.json.gz",
                      expected["event_groups"][target["arm"]], target, True)
        repeated = {"decisions_by_week": {"0": [{"id": "T1", "only_if_not_taken": False}] * 2},
                    "source": "Supplementary once-only probe"}
        limited = deepcopy(tm)
        limited["initial"]["budget"] = 7
        unfunded = {"decisions_by_week": {"0": [{"id": "T1", "only_if_not_taken": False}]},
                    "source": "Supplementary budget boundary; initial budget 7 only in this probe"}
        for name, model, script in (("once_only", tm, repeated), ("insufficient_budget", limited, unfunded)):
            transport(name, model, script, {"E_T2": "ready"}, folder / f"results/run-1/probes/{name}.json.gz", {}, None, False)
    return specs
