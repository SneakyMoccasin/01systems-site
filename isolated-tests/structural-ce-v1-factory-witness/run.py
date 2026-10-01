#!/usr/bin/env python3
"""Run with Python standard library only: python3 -B run.py [--output DIR]."""
import argparse
import csv
import hashlib
import json
import platform
from copy import deepcopy
from itertools import permutations, product
from pathlib import Path

from audit_history import audit_transitions, inspect_swedish_history, require
from checks import run_checks
from replay import replay

ROOT = Path(__file__).resolve().parent


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def save(path, data, compact=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=None if compact else 2) + "\n",
                    encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "results")
    output = parser.parse_args().output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    (output / "report.md").write_text("Körning pågår; inget slutresultat ännu.\n", encoding="utf-8")
    save(output / "summary.json", {"status": "RUNNING"})
    model, candidate, scenarios = [load(ROOT / name) for name in
                                   ("model.json", "candidate.json", "scenarios.json")]
    require(candidate["decisions_by_week"] == {
        "0": ["D1", "D2", "D9", "D7"], "2": ["D3", "D4"],
        "10": ["D6"], "12": ["D8"]}, "The agreed candidate changed")
    require(candidate["external_outcomes"] == {
        "E_BANK": "approved", "E_CUSTOMER": "approved", "E_QUALITY": "approved"},
        "The agreed candidate outcomes changed")

    def evaluate(name, script):
        paths = replay(model, script)
        file = output / "histories" / (name + ".json")
        save(file, {"script": script, "paths": paths}, compact=True)
        # The auditors operate on the SAVED AND RELOADED artifact, not live replay state.
        saved = load(file)
        audits = []
        for path in saved["paths"]:
            audit = audit_transitions(path["history"], model, saved["script"])
            require(path["snapshot"] == path["history"][-1]["after"], "Wrong terminal snapshot")
            audit["sweden"] = inspect_swedish_history(path["history"])
            audits.append(audit)
        save(output / "audits" / (name + ".json"), audits)
        return saved["paths"], audits

    summaries, main_audits = [], []
    reference = None
    for scenario in scenarios:
        script = deepcopy(candidate)
        script["external_outcomes"].update(scenario["outcome_overrides"])
        script["decisions_by_week"] = {week: [scenario["replace_decisions"].get(d, d) for d in ds]
                                        for week, ds in script["decisions_by_week"].items()}
        paths, audits = evaluate(scenario["id"], script)
        expected = scenario["expected"]
        require(len(paths) == expected["paths"], "Missing/extra event permutations")
        # Independent coverage oracle for the known schedules of these five cases.
        groups = [(2, ["E_BANK", "E_PL_PREMISES"])]
        if scenario["id"] == "machine_moved":
            groups.append((6, ["E_PL_TEAM", "E_MOVED_MACHINE"]))
        expected_orders = set(product(*[
            [(week, ordering) for ordering in permutations(names)] for week, names in groups]))
        actual_orders = set()
        for path, audit in zip(paths, audits):
            observed = []
            for week, _ in groups:
                order = tuple(row["action"] for row in path["history"]
                              if row["week"] == week and row["kind"] in ("event", "event_skipped"))
                observed.append((week, order))
            actual_orders.add(tuple(observed))
            require(audit["script_is_legal"] == expected["legal"], "Wrong script legality")
            require(bool(audit["d8_weeks"]) == expected["d8"], "Unexpected D8 result")
            require(not audit["d8_weeks"] or audit["d8_weeks"] == [12], "Unexpected D8 week")
            require(audit["sweden"]["continuous_sweden"] == expected["sweden"], "Wrong continuity result")
            require(audit["final_budget"] == expected["budget"], "Wrong final budget")
            require([r["decision"] for r in audit["rejected_attempts"]] == expected["rejected"],
                    "Wrong blocked attempts")
            if scenario["id"] == "machine_moved":
                first = audit["sweden"]["first_violation"]
                require(first["week"] == 2 and first["action"] == "D5" and first["side"] == "after",
                        "Machine loss not detected immediately")
        require(actual_orders == expected_orders, "Permutation coverage incomplete")
        require(len({json.dumps(p["snapshot"], sort_keys=True) for p in paths}) == 1,
                "Order-sensitive terminal state")
        summaries.append({"id": scenario["id"], "description": scenario["description"],
                          "status": "PASS", "paths": len(paths), "all_event_orders_checked": True,
                          "order_sensitive_for_checked_properties": False,
                          "d8_weeks": audits[0]["d8_weeks"], "legal": audits[0]["script_is_legal"],
                          "continuous_sweden": audits[0]["sweden"]["continuous_sweden"],
                          "first_sweden_loss": audits[0]["sweden"]["first_violation"],
                          "final_budget": audits[0]["final_budget"],
                          "blocked_attempts": expected["rejected"]})
        main_audits.extend(audits)
        if scenario["id"] == "candidate":
            reference = paths[0]

    probes = run_checks(model, candidate, evaluate)
    with (output / "candidate-timeline.tsv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream, delimiter="\t")
        writer.writerow(["row", "week", "kind", "action", "outcome", "budget_before", "budget_after",
                         "se_premises", "original_machine", "se_team", "source"])
        for row in reference["history"]:
            state = row["after"]["state"]
            writer.writerow([row["index"], row["week"], row["kind"], row["action"], row.get("outcome", ""),
                             row["before"]["state"]["budget"], state["budget"], state["se_premises"],
                             state["original_machine"], state["se_team"], row["source"]])
    inputs = sorted([*ROOT.glob("*.py"), *ROOT.glob("*.json"), *ROOT.glob("*.md"),
                     *ROOT.glob("sources/*")])
    hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in inputs if p.is_file()}
    result = {"status": "PASS", "python": platform.python_version(), "input_sha256": hashes,
              "scope": "Fixed witness replay and separate saved-history inspection; no composite goal operator, no CE2 engine verification, no product-value proof.",
              "main_trace_count": len(main_audits),
              "main_transition_rows_checked": sum(a["rows_checked"] for a in main_audits),
              "main_swedish_snapshots_checked": sum(a["sweden"]["snapshots_checked"] for a in main_audits),
              "scenarios": summaries, "supplementary_checks": probes}
    save(output / "summary.json", result)
    lines = [
        "# Fristående vittneskontroll — resultat", "", "**PASS: kandidatbanan finns under de angivna ASSUMED-förutsättningarna.**", "",
        "D8 genomförs vecka 12. Svensk lokal, ursprunglig maskin i bruk i Sverige och svenskt arbetslag finns kvar efter varje övergång till och med vecka 26. Slutbudget: 0 miljoner.", "",
        "Detta är en kontrollerad vittnesbana. Det är inte en generell beräkning för sammansatta mål, verifiering av CE2 eller hela v1, eller bevis på produktvärde. Ingen sökning över ledningsstrategier eller generell säkringsbarhetsberäkning har körts.", "",
        "## Körning och metod", "",
        "Kommando: `python3 -B run.py` från denna testmapp. Endast Pythons standardbibliotek används. Alternativ utmatningsmapp: `--output /absolut/sökväg`.", "",
        "Modellen och kandidatbanan läses från JSON. Alla veckor 0–26 besöks, inklusive veckor utan beslut. Alla förfallna events körs före veckans beslut. Varje samtidig eventordning spelas upp separat utan sammanslagning. Historiker sparas och läses tillbaka innan den oberoende övergångsgranskningen och den separata svenska historikkontrollen körs.", "",
        "Det finns inga kontrollvillkor för svensk kontinuitet i replay-koden. Den läser inte denna egenskap och ändrar aldrig ledningsval utifrån den. Historikgranskaren kontrollerar både före- och eftertillstånd, vilket även inkluderar start och horisont.", "",
        "I negativa scenarier loggas otillåtna planerade beslut som avvisade försök utan effekter. Kvarvarande veckor spelas upp för diagnostik; dessa avvisade försök räknas inte som genomförda beslut eller som en giltig kandidatbana. Ingen reparerande strategi läggs till.", "",
        "## Utförda huvudkontroller", "",
        "| Scenario | Eventordningar | D8 | Obruten svensk förmåga | Slutbudget | Avvisade försök |", "|---|---:|---|---|---:|---|"]
    for s in summaries:
        lines.append("| {} | {} | {} | {} | {} | {} |".format(s["id"], s["paths"],
            "vecka 12" if s["d8_weeks"] else "genomförs inte", "ja" if s["continuous_sweden"] else "nej — förlust vid D5 vecka 2",
            s["final_budget"], ", ".join(s["blocked_attempts"]) or "inga"))
    lines += ["", "Vecka 2 provas båda ordningarna för bankbesked och polskt lokaltillträde i varje scenario. Maskinflyttsvarianten provar dessutom båda ordningarna för arbetslag och maskin vid vecka 6: totalt 2 × 2 = 4 kombinationer. Ingen ordningskänslighet påvisades för de kontrollerade egenskaperna i dessa körningar.", "",
              "Kandidatens tre externa godkännanden är valda utfall, inte garanterade besked. Bankavslag blockerar D4, D6 och D8 i just det fasta skriptet. Uteblivet kundsvar och underkänd kvalitet blockerar D8. Inget nytt svar schemaläggs efter uteblivet. Maskinflyttsvarianten kan genomföra D8 men förlorar svensk maskinförmåga direkt vid D5.", "",
              "Kontrollerat för varje sparad övergång: förvillkor, engångsregel, fullständiga före-/eftertillstånd, budgetens domän och separat budgetbokföring, kostnad endast vid accepterat beslut, deklarerade positiva ledtider, eventkö och förfall, externa utfall, förfallna ej tillämpliga events, beslut efter samtliga events, exakt kandidatordning, samtliga veckor och horisont inklusive vecka 26.", "",
              "Huvudscenarierna omfattar **{} fullständiga historiker, {} historikrader och {} kontrollerade före-/eftertillstånd för svensk förmåga**. Veckomarkörer ingår i historikraderna; de är inte nya verksamhetsövergångar.".format(result["main_trace_count"], result["main_transition_rows_checked"], result["main_swedish_snapshots_checked"]), "",
              "## Kompletterande kontroller", ""]
    for probe in probes:
        lines.append("- **PASS** `{}`: {}".format(probe["id"], probe["description"]))
    lines += ["", "## Sparade underlag och begränsning", "",
              "`candidate-timeline.tsv` visar varje rad i kandidatens referensordning. `histories/` innehåller fullständiga före-/eftertillstånd, externa utfall, beslut, eventköer, källhänvisningar och alla eventordningar. `audits/` innehåller den separata granskningens resultat. `summary.json` innehåller exakta antal och SHA-256 för modell, kandidat, scenarier, källkopior och verktygsfiler.", "",
              "Det negativa bankutfallet bevisar endast att det oförändrade kandidatskriptet inte fungerar i den grenen. Ingen slutsats om alla alternativa ledningsbanor dras. De kompletterande proberna kontrollerar utvalda gränser; de utgör inte en uttömmande verifiering av verktyget eller modellen. Den positiva slutsatsen gäller det deklarerade diskreta veckomodellens tillstånd och övergångar.", ""]
    (output / "report.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"status": "PASS", "main_traces": len(main_audits),
                      "supplementary_checks": len(probes), "report": str(output / "report.md")},
                     ensure_ascii=False))


if __name__ == "__main__":
    main()
