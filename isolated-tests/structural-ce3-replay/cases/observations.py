"""Post-audit business observations. Never called by adapters or replay.

The original pure transport observation/comparison functions are deliberately
reused read-only, with their source hashes pinned by the preservation manifest.
They inspect a format view of CE3 rows, not operational inputs or legacy replay.
"""
from copy import deepcopy
import importlib.util
from core.history import encode, read_bundle
from verification.checkpoint_checks import FACTORY, TRANSPORT, require
from verification.semantic_compare import KINDS, diagnostics, signature


def load_observer():
    spec = importlib.util.spec_from_file_location("frozen_transport_observe", TRANSPORT / "observe.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


TRANSPORT_OBSERVER = load_observer()


def legacy_view(path, factory=False):
    def snap(s):
        s = deepcopy(s)
        s["week"] = s.pop("step")
        del s["phase"]
        for event in s["pending"]:
            event["origin"] = "initial" if event["origin"]["kind"] == "initial" else event["origin"]["id"]
        return s
    rows = []
    for row in path["history"]:
        if factory and row["kind"] == "decision_point":
            continue
        rows.append(dict(index=len(rows), week=row["step"], kind=KINDS.get(row["kind"], row["kind"]),
                         action=row["action"], before=snap(row["before"]), after=snap(row["after"]),
                         outcome=row["outcome"], failures=deepcopy(row["failures"]), source=row["source"]))
    return rows


def factory_observe(rows):
    first = None
    for row in rows:
        for side in ("before", "after"):
            s = row[side]["state"]
            missing = (["se_premises"] if not s["se_premises"] else [])
            missing += ["original_machine_in_use_in_sweden"] if s["original_machine"] != "sweden_in_use" else []
            missing += ["se_team"] if not s["se_team"] else []
            if missing and first is None:
                first = dict(week=row["week"], action=row["action"], side=side, missing=missing)
    blocked = [dict(week=r["week"], decision=r["action"], failures=diagnostics(r))
               for r in rows if r["kind"] == "rejected_attempt"]
    return dict(continuous_sweden=first is None, first_sweden_loss=first,
                executed=[dict(week=r["week"], decision=r["action"]) for r in rows if r["kind"] == "decision"],
                blocked=blocked, legal=not blocked,
                d8_weeks=[r["week"] for r in rows if r["kind"] == "decision" and r["action"] == "D8"],
                final_budget=rows[-1]["after"]["state"]["budget"],
                budgets={str(r["week"]): r["after"]["state"]["budget"] for r in rows if r["kind"] == "week_end"},
                pending=rows[-1]["after"]["pending"])


def expected(actual, target, label):
    for field, value in target.items():
        if field in ("arm", "outcome", "path_count", "at_parking_common", "parking_sensitive_fields", "cycle_ready_at_parking_values"):
            continue
        observed = actual[field]
        if field == "budget_after_decision_weeks":
            observed = {w: observed[w] for w in value}
        require(encode(observed) == encode(value), f"{label}: {field}: {observed!r} != {value!r}")


def transport_observe(rows, model):
    o = TRANSPORT_OBSERVER.observe(rows, model)
    # Failed predicates are a semantic set; display them in the frozen model's order.
    blocked = []
    for r in rows:
        if r["kind"] != "rejected_attempt":
            continue
        fields = {f["field"] for f in diagnostics(r)}
        order = ["once_only"] + [g[0] for g in model["decisions"][r["action"]]["requires"]]
        missing = [field for field in dict.fromkeys(order) if field in fields]
        require(set(missing) == fields, "Unknown blocked field")
        blocked.append(dict(week=r["week"], decision=r["action"], missing=missing))
    o.update(blocked=blocked, skipped=[dict(week=r["week"], decision=r["action"])
                                    for r in rows if r["kind"] == "script_skip"])
    return o


def unique(values):
    found = {}
    for value in values:
        found[encode(value)] = value
    return [found[k] for k in sorted(found)]


def check_factory_probe(name, path, o):
    final = path["snapshot"]
    state, taken = final["state"], final["taken"]
    checks = {
        "once_only": lambda: o["final_budget"] == 5 and len(o["blocked"]) == 1 and
            o["blocked"][0]["failures"] == [{"field": "once_only", "actual": "D9"}],
        "lease_week_4": lambda: "D2" in taken and state["pl_premises"],
        "lease_week_5": lambda: "D2" not in taken and len(o["blocked"]) == 1,
        "secure_week_6": lambda: "D9" in taken and o["continuous_sweden"],
        "secure_week_7": lambda: "D9" not in taken and not state["se_team"] and o["first_sweden_loss"]["week"] == 8,
        "quality_then_d8_at_horizon": lambda: o["legal"] and o["d8_weeks"] == [26] and o["continuous_sweden"],
        "lease_loss_at_horizon": lambda: o["legal"] and o["first_sweden_loss"]["week"] == 26,
        "effect_beyond_horizon": lambda: o["legal"] and o["continuous_sweden"] and o["pending"] ==
            [{"id": "E_SE_PREMISES_END", "due": 34, "origin": "D10", "scheduled_at": 26}],
        "modernization_timer": lambda: o["legal"] and o["final_budget"] == 0 and state["modernization_complete"],
        "both_machines_allowed": lambda: o["legal"] and o["d8_weeks"] == [12] and state["pl_machines"] == 2,
        "auditor_reference": lambda: o["legal"] and o["d8_weeks"] == [12] and o["continuous_sweden"],
    }
    require(checks[name](), "Factory probe: " + name)


def check_case(spec, bundle, old):
    package, name, target = spec["package"], spec["name"], spec["target"]
    observations = []
    old_paths = {signature(p, False): p for p in old["paths"]}
    for path in bundle["paths"]:
        rows = legacy_view(path, spec["family"] == "factory")
        old_rows = old_paths[signature(path, True)]["history"]
        for row in rows:
            if row["kind"] in ("rejected_attempt", "script_skip"):
                require(row["before"] == row["after"], "Blocked/skipped attempt changed state, right or queue")
        if spec["family"] == "factory":
            o = factory_observe(rows)
            require(o == factory_observe(old_rows), "Factory frozen observation mismatch")
            if package == "factory":
                expected(dict(paths=len(bundle["paths"]), legal=o["legal"], d8=bool(o["d8_weeks"]),
                              sweden=o["continuous_sweden"], budget=o["final_budget"],
                              rejected=[x["decision"] for x in o["blocked"]]), target, name)
                saved = next(x for x in read_bundle(FACTORY / "results/summary.json")["scenarios"] if x["id"] == name)
                first = deepcopy(saved["first_sweden_loss"])
                if first is not None:
                    first.pop("index")
                require(o["d8_weeks"] == saved["d8_weeks"] and o["first_sweden_loss"] == first,
                        "Factory frozen week/first loss mismatch")
            elif package == "bank":
                require(o["final_budget"] == 1 and o["legal"] == (name == "B") and
                        o["d8_weeks"] == ([] if name == "A" else [8]) and
                        o["continuous_sweden"] == (name == "A"), "Bank A/B observation mismatch")
                rejected = [x["decision"] for x in o["blocked"]]
                require(rejected == (["D5", "D6", "D8"] if name == "A" else []), "Bank rejected decisions")
                for r in rows:
                    for side in ("before", "after"):
                        require(not any(e["origin"] in rejected for e in r[side]["pending"]), "Event from rejected decision")
                if name == "A":
                    require(not any(r["action"] in ("E_QUALITY", "E_MOVED_MACHINE") for r in rows) and
                            path["snapshot"]["state"]["quality"] == "not_requested", "Unrequested bank-A event")
                else:
                    require(o["first_sweden_loss"] == dict(week=2, action="D5", side="after", missing=["original_machine_in_use_in_sweden"])
                            and not path["snapshot"]["state"]["se_team"], "Bank-B Sweden loss")
                    require([(r["week"], r["outcome"]) for r in rows if r["kind"] == "event" and r["action"] == "E_QUALITY"] == [(8, "approved")], "Bank quality timing")
            else:
                check_factory_probe(name, path, o)
        elif not spec["main"]:
            blocks = [r for r in rows if r["kind"] == "rejected_attempt"]
            require(len(bundle["paths"]) == len(blocks) == 1, "Transport probe paths/block count")
            reason, budget, events = ("once_only", 22, 1) if name == "once_only" else ("budget", 7, 0)
            require([f["field"] for f in diagnostics(blocks[0])] == [reason] and blocks[0]["action"] == "T1"
                    and blocks[0]["week"] == 0 and rows[-1]["after"]["state"]["budget"] == budget
                    and sum(r["kind"] == "event" for r in rows) == events
                    and not path["snapshot"]["pending"], "Transport probe result")
            o = dict(reason=reason, final_budget=budget, applied_events=events)
        else:
            o = transport_observe(rows, spec["model"])
            old_o = transport_observe(old_rows, spec["model"])
            require(encode(o) == encode(old_o), "Frozen per-path transport observation differs: " + name)
            expected(o, target, name)
            if package == "same_parking":
                require(all(o["at_parking"][k] == v for k, v in target["at_parking_common"].items()), "Common parking status")
                frozen = read_bundle(TRANSPORT / "results/run-1/summary.json")["scenarios"][name]
                require(o["milestones"] == frozen["milestones"], "Non-parking milestones changed")
                if target["arm"] == "A" or target["outcome"] != "ready":
                    require([(r["kind"], r["action"]) for r in rows if r["week"] == 12 and r["kind"] in ("decision", "rejected_attempt")]
                            == [("rejected_attempt", "T7"), ("decision", "T12")], "T12 after blocked T7")
                if target["arm"] == "A":
                    require(o["parking_snapshot"]["state"]["budget"] == 3 and o["budget_after_decision_weeks"]["14"] == 2, "Momentary/weekly budget")
        observations.append(dict(event_order=signature(path, True), observation=o))
    summary = {"status": "PASS", "paths": len(observations)}
    if spec["family"] == "transport" and spec["main"]:
        variants = unique([x["observation"]["at_parking"] for x in observations])
        sensitive = sorted(k for k in variants[0] if len(unique([v[k] for v in variants])) > 1)
        if package == "same_parking":
            require(sensitive == sorted(target["parking_sensitive_fields"]), "Wrong parking sensitivity")
            require(sorted({v["cycle_ready"] for v in variants}) == target["cycle_ready_at_parking_values"], "Missing cycle variant")
        stable = [{k: v for k, v in x["observation"].items() if k not in
                   ("at_parking", "parking_snapshot", "decision_space_at_parking")} for x in observations]
        require(all(encode(x) == encode(stable[0]) for x in stable), "Unexpected order-sensitive weekly observation")
        ends = [[r["after"]["state"] for r in p["history"] if r["kind"] == "step_end"] for p in bundle["paths"]]
        require(all(x == ends[0] for x in ends), "Order-sensitive week-end state")
        summary.update(parking_variants=variants, sensitive_fields=sensitive, reference=stable[0])
    else:
        summary["reference"] = observations[0]["observation"]
    return summary, observations
