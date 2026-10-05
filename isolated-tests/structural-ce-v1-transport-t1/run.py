#!/usr/bin/env python3
"""Run the six frozen T1 cases; standard library only, Python >= 3.9."""
import argparse
import csv
import gzip
import hashlib
import json
from itertools import permutations, product
from pathlib import Path

from audit_history import audit, require
from checks import run_checks
from observe import compare, current, decision_space, observe
from replay import replay

ROOT = Path(__file__).resolve().parent


def read(path):
    if path.suffix == ".gz":
        with gzip.open(path, "rt", encoding="utf-8") as stream:
            return json.load(stream)
    return json.loads(path.read_text(encoding="utf-8"))


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = (json.dumps(value, ensure_ascii=False, sort_keys=True,
                          indent=None if path.suffix == ".gz" else 2) + "\n").encode("utf-8")
    if path.suffix == ".gz":
        # Empty filename and fixed mtime remove path/time dependence.
        with path.open("wb") as stream:
            with gzip.GzipFile(filename="", fileobj=stream, mode="wb", mtime=0) as zipped:
                zipped.write(encoded)
    else:
        path.write_bytes(encoded)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_freeze():
    freeze = read(ROOT / "freeze.json")
    for name, expected in freeze["sha256"].items():
        require(digest(ROOT / name) == expected, "Frozen input changed: " + name)
    return freeze


def verify_expected(actual, expected, label):
    """Compare separately recorded pre-run expectations; never derive from replay."""
    for field, value in expected.items():
        if field in ("arm", "outcome", "path_count"):
            continue
        if field == "budget_after_decision_weeks":
            for week, balance in value.items():
                require(actual[field][week] == balance, label + " budget deviation at " + week)
        else:
            require(actual[field] == value,
                    label + " expected-value deviation: " + field + ": "
                    + repr(actual[field]) + " != " + repr(value))


def verify_coverage(paths, groups):
    groups = sorted((int(week), events) for week, events in groups.items())
    expected = set(product(*[[(week, order) for order in permutations(events)] for week, events in groups]))
    seen = []
    for path in paths:
        actual = {}
        for row in path["history"]:
            if row["kind"] in ("event", "event_skipped"):
                actual.setdefault(row["week"], []).append(row["action"])
        seen.append(tuple((week, tuple(events)) for week, events in sorted(actual.items()) if len(events) > 1))
    require(set(seen) == expected and len(seen) == len(expected), "Incomplete/duplicate event permutations")
    return len(expected)


def timeline(path, history, model):
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream, delimiter="\t", lineterminator="\n")
        writer.writerow(["index", "week", "kind", "action", "outcome", "budget", "grid", "parking_removed",
                         "traffic_authorized", "cycle_open", "failed_conditions", "decision_space", "source"])
        for row in history:
            state = row["after"]["state"]
            writer.writerow([row["index"], row["week"], row["kind"], row["action"], row.get("outcome", ""),
                             state["budget"], state["grid"], state["parking_removed"], state["traffic_authorized"],
                             state["cycle_open"], json.dumps(row.get("failures", []), ensure_ascii=False),
                             ",".join(decision_space(row["after"], model)), row["source"]])


def report(summary):
    lines = ["Transportfall T1 – mekanisk kontroll", "",
             "PASS: de sex fasta fallen överensstämmer med fryst körspecifikation och kontrollvärden.",
             "Inga avvikelser mot de frysta kontrollvärdena påvisades.", "",
             "Omfattning: användarens konstruerade ASSUMED-premisser, veckor 0–26 inklusive.",
             "Inga slutsatser om faktisk drift, trafikminskning, resande, utsläpp, optimal ordning,",
             "generell säkringsbarhet, hela v1, CE2 eller produktvärde. Befintliga alternativ kvarstår.", "",
             "METOD", "Varje historieartefakt sparades som deterministisk JSON.gz och lästes tillbaka.",
             "audit_history.py importerar ingen uppspelningskod och rekonstruerar alla övergångar.",
             "Kontroller: full före/efter-state, budgetdomän och separat kostnadsbokföring, exakta",
             "förvillkorsfel, engångsregel, accepterade eventursprung, positiv ledtid, event före",
             "beslut, hela skriptet och varje vecka. Avvisade försök får inga effekter eller events.",
             "Avsiktliga blockeringar är diagnostik, inte testfel. B:s redan genomförda T7 hoppas",
             "över vecka 20 endast i ready-grenen; det är inte ett nytt avvisat försök.", "",
             "A: fyra eventordningar per utfall. B: 96 eventordningar per utfall.",
             "Varje kombination kontrolleras mot samma frysta förväntningar; ingen historik slås ihop.",
             f"Totalt {summary['main_paths']} huvudhistoriker, {summary['main_rows']} historikrader och",
             f"{summary['main_snapshots']} granskade före-/eftersnapshots per komplett körning.", "",
             "HUVUDRESULTAT", "Fall | parkering borta | T7-villkor | T7 genomfört | cykel öppnad | bussgap | cykelgap | slutbudget"]
    for name, entry in summary["scenarios"].items():
        def time(value):
            return "ej inom 26" if value is None else str(value)
        gap = entry["traffic_gap"]
        lines.append(f"{name} | {entry['parking_week']} | {time(entry['t7_requirements_week'])} | "
                     f"{time(entry['t7_execution_week'])} | {entry['cycle_open_week']} | "
                     f"{gap['weeks']}" + (" veckor, kvarstår vid 26" if gap["unresolved_at_horizon"] else " veckor")
                     + f" | {entry['cycle_gap']['weeks']} veckor | {entry['final_budget']} Mkr")
    lines += ["", "BORTTAGNING OCH ÅTERSTÅENDE FÄRDIGSTÄLLANDEN",
              "Färdigstatus mäts direkt efter E_T12; borttagning är inte beställningsbeslutet.",
              "Varje rad nedan anger: markör = status vid borttagning; första vecka; gap därefter.",
              "Gap 0 betyder att markören redan uppnåtts. Kvarstår betyder endast observerad väntan",
              "till vecka 26, inte en beräknad slutlig väntetid."]
    labels = {"buses_delivered": "Bussar levererade", "depot_ready": "Depå tillgänglig",
              "charger_delivered": "Laddutrustning levererad", "charger_installed": "Laddning installerad",
              "drivers_ready": "Chaufförer tillgängliga", "signal_ready": "Signalprioritering färdig",
              "cycle_ready": "Cykelstråk färdigt", "cycle_parking_ready": "Cykelparkering tillgänglig",
              "cycle_open": "Cykelstråk öppnat", "grid_ready": "Elanslutning färdig",
              "traffic_authorized": "Trafikökning godkänd"}
    for name, entry in summary["scenarios"].items():
        lines += ["", name + f": 100 platser borta vecka {entry['parking_week']}; elstatus " + entry["at_parking"]["grid_status"]]
        for marker, week in entry["milestones"].items():
            gap = entry["all_marker_gaps"][marker]
            lines.append(f"  {labels[marker]}: {'ja' if entry['at_parking'][marker] else 'nej'}; "
                         f"vecka {week if week is not None else 'ej inom horisonten'}; {gap['weeks']} veckor"
                         + (", kvarstår" if gap["unresolved_at_horizon"] else ""))
        lines.append("  Blockerade försök: " + ("; ".join(f"{r['decision']} vecka {r['week']}: {', '.join(r['missing'])}"
                                                         for r in entry["blocked"]) or "inga"))
        lines.append("  Elstatus vid horisonten: " + entry["final_grid"] + "; eventkö: tom.")
    lines += ["", "JÄMFÖRELSE A/B INOM SAMMA ELUTFALL"]
    for outcome, entry in summary["comparisons"].items():
        lines.append(f"{outcome}: {entry['pair_count']} A/B-par kontrollerade. Samma start; första skillnad vecka "
                     f"{entry['first_difference_week']} efter A:T1 respektive B:T3. "
                     f"Första fulla likvärdighet vid veckoslut: {entry['first_week_end_full_equivalence']}. "
                     f"Likvärdiga vid vecka 26: {entry['final_equivalent']}.")
    lines += ["Likvärdighet jämför verksamhetsstate inklusive budget, samma tid, mängden tagna",
              "beslut och aktuell eventkö. Historikerna är olika och ändras inte. Decision Space",
              "är också lika vid horisonten. comparisons.json redovisar veckoslut och första commitments.",
              "I avslag/uteblivet genomförs T12 i B trots blockerat T7; borttagning sker vecka 14.",
              "Vid avslag finns inget positivt besked. Vid absent består explicit vänteläge utan",
              "ytterligare prövning. Båda saknar trafikgodkännande vid horisonten.", "",
              "KONTROLLVÄRDEN OCH KOMPLETTERANDE PROBER",
              "expected.json och övriga frysta indata har verifierats före och efter körningen.",
              "Alla frysta förväntningar kontrollerades för varje huvudhistorik. Inga facit ändrades."]
    for item in summary["supplementary_checks"]:
        lines.append("PASS " + item["id"] + (": " + item["detected"] if "detected" in item else ""))
    lines += ["", "ARTEFAKTER", "histories/: samtliga huvudhistoriker; audits/: separat granskning och observationer.",
              "timelines/: läsbara referensordningar, inte ersättning för permutationskontrollen.",
              "probes/: sparade och återlästa separata gränsprober. comparisons.json: alla A/B-par.",
              "summary.json: resultat och verktygs-/indatahashar. Reproducerbarhet redovisas separat",
              "av reproduce.py efter två kompletta körningar och filvis SHA-256-jämförelse.", ""]
    return "\n".join(lines)


def main(output):
    output.mkdir(parents=True, exist_ok=True)
    save(output / "summary.json", {"status": "RUNNING"})
    (output / "report.txt").write_text("Kontroll pågår. Inget slutresultat.\n", encoding="utf-8")
    freeze = check_freeze()
    model, scripts, expected = [read(ROOT / name) for name in ("model.json", "scripts.json", "expected.json")]
    require(sum(r["cost"] for r in model["decisions"].values()) == 29, "Wrong total commitment cost")
    for script in scripts.values():
        require({entry["id"] for entries in script["decisions_by_week"].values() for entry in entries}
                == set(model["decisions"]), "Different action sets")
    require(model["decisions"]["T12"]["requires"] == [["budget", "ge", 1]], "Extra parking precondition")

    def persisted(name, case_model, script, external, probe=False):
        folder = "probes" if probe else "histories"
        file = output / folder / (name + ".json.gz")
        save(file, {"model": case_model, "script": script, "external": external,
                    "paths": replay(case_model, script, external)})
        # Use the read-back objects, never live replay objects, in every check below.
        saved = read(file)
        require(saved["model"] == case_model and saved["script"] == script and saved["external"] == external,
                "Persisted input mismatch")
        audits = [audit(p["history"], p["snapshot"], saved["model"], saved["script"], saved["external"])
                  for p in saved["paths"]]
        return saved["paths"], audits

    all_paths, summaries = {}, {}
    rows_checked = snapshots_checked = 0
    for name, target in expected["scenarios"].items():
        arm, outcome = target["arm"], target["outcome"]
        paths, audits = persisted(name, model, scripts[arm], {"E_T2": outcome})
        count = verify_coverage(paths, expected["event_groups"][arm])
        require(count == target["path_count"], "Wrong path count")
        observations = []
        for path, check in zip(paths, audits):
            observed = observe(path["history"], model)
            observed.update(blocked=check["blocked"], skipped=check["skipped"])
            verify_expected(observed, target, name)
            observations.append(observed)
            rows_checked += check["rows_checked"]
            snapshots_checked += check["snapshots_checked"]
        require(all(o == observations[0] for o in observations), "Order-sensitive reported observation")
        save(output / "audits" / (name + ".json.gz"), [{"path_index": i, "audit": a, "observation": o}
                                                      for i, (a, o) in enumerate(zip(audits, observations))])
        (output / "timelines").mkdir(exist_ok=True)
        timeline(output / "timelines" / (name + ".tsv"), paths[0]["history"], model)
        summaries[name] = {"status": "PASS", "paths": count, "all_event_orders_checked": True,
                           "order_sensitive_for_reported_observations": False, **observations[0]}
        all_paths[name] = paths

    comparisons = {}
    for outcome, target in expected["comparisons"].items():
        pairs = [compare(a["history"], b["history"], model)
                 for a, b in product(all_paths["A_" + outcome], all_paths["B_" + outcome])]
        for comparison in pairs:
            verify_expected(comparison, target, outcome)
            require(comparison["initial_equal"] and comparison["final_decision_space_equal"], "Unequal boundaries")
            require(not comparison["histories_equal"], "Unexpected equal histories")
        require(all(p == pairs[0] for p in pairs), "Order-sensitive A/B comparison")
        comparisons[outcome] = {"pair_count": len(pairs), **pairs[0]}
    save(output / "comparisons.json", comparisons)

    def probe(name, case_model, script):
        paths, audits = persisted(name, case_model, script, {"E_T2": "ready"}, probe=True)
        save(output / "probes" / (name + "-audits.json"), audits)
        return paths, audits

    checks = run_checks(model, all_paths["A_ready"][0], scripts["A"], probe)
    require(check_freeze() == freeze, "Freeze changed during run")
    inputs = [*ROOT.glob("*.py"), *ROOT.glob("*.json"), *ROOT.glob("*.txt"), *ROOT.glob("sources/*")]
    summary = {"status": "PASS", "scope": "Six fixed scripts; no operational simulation or strategy search.",
               "frozen_sha256": freeze["sha256"],
               "input_sha256": {str(p.relative_to(ROOT)): digest(p) for p in sorted(inputs) if p.is_file()},
               "main_paths": sum(len(paths) for paths in all_paths.values()), "main_rows": rows_checked,
               "main_snapshots": snapshots_checked, "scenarios": summaries, "comparisons": comparisons,
               "supplementary_checks": checks, "deviations": []}
    save(output / "summary.json", summary)
    (output / "report.txt").write_text(report(summary), encoding="utf-8")
    print(json.dumps({"status": "PASS", "main_paths": summary["main_paths"], "main_rows": rows_checked,
                      "supplementary_checks": len(checks)}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "results/run-1")
    out = parser.parse_args().output.resolve()
    try:
        main(out)
    except Exception as error:
        out.mkdir(parents=True, exist_ok=True)
        save(out / "summary.json", {"status": "FAIL", "error": str(error)})
        (out / "report.txt").write_text("FAIL: " + str(error) + "\nFrysta kontrollvärden är oförändrade.\n", encoding="utf-8")
        raise
