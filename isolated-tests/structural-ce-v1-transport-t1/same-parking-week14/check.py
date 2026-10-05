#!/usr/bin/env python3
"""Separate comparison using the unchanged original model, replay and auditor."""
import argparse
from copy import deepcopy
from itertools import product
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
PARENT = ROOT.parent
sys.path.insert(0, str(PARENT))
from audit_history import audit, require
from replay import replay
from observe import observe, compare
from checks import run_checks
from run import read, save, digest, verify_expected, verify_coverage, timeline


def freeze_check():
    freeze = read(ROOT / "freeze.json")
    for name, expected in freeze["sha256"].items():
        require(digest(ROOT / name) == expected, "Changed frozen input: " + name)
    return freeze


def unique(values):
    result = []
    for value in values:
        if value not in result:
            result.append(value)
    return result


def write_report(summary):
    lines = ["Samma parkeringsdatum – mekanisk kontroll", "",
             "PASS för de sex fasta förloppen. Inga avvikelser mot användarens förväntade veckor, gap eller budget.",
             "A:s momentana cykelfärdigstatus vid borttagningen är ordningskänslig och redovisas separat.", "",
             "Endast A:s T12 har flyttats från vecka 0 till vecka 12 efter T7. B och modellen är oförändrade.",
             "Alla historiker sparades och återlästes före separat övergångsgranskning.",
             f"{summary['main_paths']} huvudhistoriker; {summary['main_rows']} rader; {summary['main_snapshots']} före-/eftersnapshots.",
             "A: 8 eventordningar per utfall. B: 96. Alla kombinationer kontrollerade.", "",
             "Fall | Bussar | T7-villkor | T7 genomfört | Parkering borta | Cykel öppnad | Bussgap | Cykelgap | Slutbudget"]
    for name, s in summary["scenarios"].items():
        lines.append(f"{name} | {s['milestones']['buses_delivered']} | {s['t7_requirements_week']} | {s['t7_execution_week']} | "
                     f"{s['parking_week']} | {s['cycle_open_week']} | {s['traffic_gap']['weeks']}"
                     + (" minst, kvarstår till vecka 26" if s['traffic_gap']['unresolved_at_horizon'] else " veckor")
                     + f" | {s['cycle_gap']['weeks']} | {s['final_budget']} Mkr")
    lines += ["None betyder inte inträffat inom horisonten, inte en framtida prognos.", "",
              "FÄRDIGSTÄLLANDEN OCH BLOCKERINGAR"]
    for name, s in summary["scenarios"].items():
        lines += ["", name, "Milstolpar: " + str(s["milestones"]),
                  "Blockeringar: " + str(s["blocked"]), "Budget vid varje veckoslut: " + str(s["budget_after_decision_weeks"]),
                  "Gemensam status precis vid borttagning: " + str(s["at_parking"]),
                  "Alla statusvarianter precis vid borttagning: " + str(s["at_parking_variants"])]
    lines += ["", "ORDNINGSKÄNSLIGHET",
              "I A vecka 14 kan cykelstråkets färdigställande inträffa före eller efter parkeringsborttagningen.",
              "cycle_ready är därför false eller true direkt efter borttagningseventet. null i sammanställningen",
              "betyder varierar mellan eventordningar. Ingen fysisk ordning är belagd. Samtliga varianter sparas.",
              "Även eventkön och det tekniskt avlästa beslutsutrymmet mitt i eventfasen kan skilja sig.",
              "Ledningen väljer först efter samtliga events; då är cykelstråket färdigt i alla ordningar.",
              "Cykelstråket öppnas först vecka 16; cykelglappet är två veckor oavsett ordning.",
              "Veckoslut, bussförutsättningar, faktiska godkännanden och rapporterade gap är ordningsoberoende.", "",
              "B:s sparade historiker är byteidentiska med originalets för respektive elutfall.",
              "A:s övriga beslutstidpunkter, färdigveckor och godkännanden är oförändrade.",
              "T12 genomförs efter blockerat T7 i A vecka 12 och i B:s negativa elutfall.",
              "Avvisade försök har inga kostnader, effekter eller events och innebär inte test-FAIL.", "",
              "JÄMFÖRELSE"]
    for outcome, c in summary["comparisons"].items():
        lines.append(f"{outcome}: {c['pair_count']} A/B-par. Första skillnad vecka {c['first_difference_week']}; "
                     f"likvärdiga veckoslut från {c['first_week_end_full_equivalence']}; likvärdiga vecka 26: {c['final_equivalent']}.")
    lines += ["Historikerna förblir olika. Likvärdighet avser aktuellt state/budget, tid, tagna beslut och kö.",
              "Kompletterande gräns-/felinjektionskontroller: " + str(len(summary["supplementary_checks"])) + " PASS.",
              "Konstruerat ASSUMED-exempel. Inga slutsatser om faktisk drift, optimal ordning eller trafikminskning.", ""]
    return "\n".join(lines)


def main(output):
    output.mkdir(parents=True, exist_ok=True)
    save(output / "summary.json", {"status": "RUNNING"})
    (output / "report.txt").write_text("Körning pågår.\n")
    freeze = freeze_check()
    model, scripts, expected = read(PARENT / "model.json"), read(ROOT / "scripts.json"), read(ROOT / "expected.json")
    original_scripts = read(PARENT / "scripts.json")
    exact = deepcopy(original_scripts)
    exact["A"]["decisions_by_week"]["0"] = [e for e in exact["A"]["decisions_by_week"]["0"] if e["id"] != "T12"]
    exact["A"]["decisions_by_week"]["12"].append({"id": "T12", "only_if_not_taken": False})
    require(scripts == exact, "Changes beyond the authorized T12 move")

    def persisted(name, case_model, script, external, probe=False):
        file = output / ("probes" if probe else "histories") / (name + ".json.gz")
        save(file, {"model": case_model, "script": script, "external": external,
                    "paths": replay(case_model, script, external)})
        saved = read(file)
        require(saved["model"] == case_model and saved["script"] == script and saved["external"] == external, "Persisted input mismatch")
        audits = [audit(p["history"], p["snapshot"], saved["model"], saved["script"], saved["external"]) for p in saved["paths"]]
        return saved["paths"], audits

    all_paths, summaries = {}, {}
    total_rows = total_snapshots = 0
    original_summary = read(PARENT / "results/run-1/summary.json")
    for name, target in expected["scenarios"].items():
        arm, outcome = target["arm"], target["outcome"]
        paths, audits = persisted(name, model, scripts[arm], {"E_T2": outcome})
        count = verify_coverage(paths, expected["event_groups"][arm])
        require(count == target["path_count"], "Wrong permutation count")
        observations = []
        simple_target = {k: v for k, v in target.items() if k not in ("at_parking_common", "parking_sensitive_fields", "cycle_ready_at_parking_values")}
        for path, checked in zip(paths, audits):
            o = observe(path["history"], model)
            o.update(blocked=checked["blocked"], skipped=checked["skipped"])
            verify_expected(o, simple_target, name)
            require(all(o["at_parking"][k] == v for k, v in target["at_parking_common"].items()), "Wrong common parking status")
            # The unchanged milestones must follow from replay, not from replacing outputs.
            require(o["milestones"] == original_summary["scenarios"][name]["milestones"], "Unintended non-parking milestone change")
            at_12 = [r for r in path["history"] if r["week"] == 12 and r["kind"] in ("decision", "rejected_attempt")]
            if arm == "A" or outcome != "ready":
                require([(r["kind"], r["action"]) for r in at_12] == [("rejected_attempt", "T7"), ("decision", "T12")],
                        "T12 missing or moved before blocked T7")
            observations.append(o)
            total_rows += checked["rows_checked"]
            total_snapshots += checked["snapshots_checked"]
        variants = unique([o["at_parking"] for o in observations])
        sensitive = [key for key in variants[0] if len(unique([v[key] for v in variants])) > 1]
        require(sensitive == target["parking_sensitive_fields"], "Unexpected parking sensitivity")
        require(sorted({v["cycle_ready"] for v in variants}) == target["cycle_ready_at_parking_values"], "Missing cycle-ready variant")
        moment_fields = ("at_parking", "parking_snapshot", "decision_space_at_parking")
        stable = [{k: v for k, v in o.items() if k not in moment_fields} for o in observations]
        require(all(s == stable[0] for s in stable), "Order-sensitive weekly result")
        # Also compare every week-end state across all event permutations.
        ends = [[r["after"]["state"] for r in p["history"] if r["kind"] == "week_end"] for p in paths]
        require(all(s == ends[0] for s in ends), "Order-sensitive week-end state")
        if arm == "B":
            require(digest(output / "histories" / (name + ".json.gz")) == digest(PARENT / "results/run-1/histories" / (name + ".json.gz")),
                    "Unchanged B differs from original")
        save(output / "audits" / (name + ".json.gz"), [{"path_index": i, "audit": a, "observation": o}
                                                      for i, (a, o) in enumerate(zip(audits, observations))])
        (output / "timelines").mkdir(exist_ok=True)
        timeline(output / "timelines" / (name + ".tsv"), paths[0]["history"], model)
        summaries[name] = {**observations[0], "status": "PASS", "paths": count, "all_event_orders_checked": True,
                           "order_sensitive_for_reported_observations": bool(sensitive), "order_sensitive_week_end": False,
                           "parking_sensitive_fields": sensitive, "at_parking_variants": variants,
                           "at_parking": {k: None if k in sensitive else v for k, v in variants[0].items()},
                           "parking_snapshot_reference_only": True,
                           "momentary_decision_space_variants": unique([o["decision_space_at_parking"] for o in observations])}
        all_paths[name] = paths

    comparisons = {}
    for outcome, target in expected["comparisons"].items():
        pairs = [compare(a["history"], b["history"], model) for a, b in product(all_paths["A_" + outcome], all_paths["B_" + outcome])]
        for c in pairs:
            verify_expected(c, target, outcome)
            require(c["initial_equal"] and c["final_decision_space_equal"] and not c["histories_equal"], "Wrong comparison boundaries")
        require(all(c == pairs[0] for c in pairs), "Order-sensitive comparison")
        comparisons[outcome] = {"pair_count": len(pairs), **pairs[0]}
    save(output / "comparisons.json", comparisons)

    def probe(name, case_model, script):
        paths, audits = persisted(name, case_model, script, {"E_T2": "ready"}, probe=True)
        save(output / "probes" / (name + "-audits.json"), audits)
        return paths, audits
    checks = run_checks(model, all_paths["A_ready"][0], scripts["A"], probe)
    require(freeze_check() == freeze, "Frozen data changed during run")
    summary = {"status": "PASS", "scope": "Same parking week, six fixed cases; instantaneous cycle status in A is order-sensitive.",
               "frozen_sha256": freeze["sha256"], "main_paths": sum(len(p) for p in all_paths.values()),
               "main_rows": total_rows, "main_snapshots": total_snapshots, "scenarios": summaries,
               "comparisons": comparisons, "supplementary_checks": checks, "deviations": [],
               "input_sha256": {p.name: digest(p) for p in sorted(ROOT.iterdir()) if p.is_file()}}
    save(output / "summary.json", summary)
    (output / "report.txt").write_text(write_report(summary), encoding="utf-8")
    print({"status": "PASS", "paths": summary["main_paths"], "rows": total_rows, "parking_sensitivity": "A cycle_ready only"})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "results/run-1")
    out = parser.parse_args().output.resolve()
    try:
        main(out)
    except Exception as error:
        out.mkdir(parents=True, exist_ok=True)
        save(out / "summary.json", {"status": "FAIL", "error": str(error)})
        (out / "report.txt").write_text("FAIL: " + str(error) + "\nInga verksamhetsregler eller kontrollvärden ändrades.\n")
        raise
