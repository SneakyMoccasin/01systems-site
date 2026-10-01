#!/usr/bin/env python3
"""Replay exactly A and B using the unchanged parent model and checker.

Repeat with: python3 -B bank-rejection-ab/run.py (from the parent test folder).
"""
import csv
import hashlib
import json
import sys
from itertools import permutations, product
from pathlib import Path

HERE = Path(__file__).resolve().parent
PARENT = HERE.parent
sys.path.insert(0, str(PARENT))
from replay import replay
from audit_history import audit_transitions, inspect_swedish_history, require


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path, value, compact=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=None if compact else 2) + "\n",
                    encoding="utf-8")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    output = HERE / "results"
    output.mkdir(exist_ok=True)
    write(output / "summary.json", {"status": "RUNNING"})
    (output / "report.md").write_text("Körning pågår.\n", encoding="utf-8")
    original_hashes = read(PARENT / "results/summary.json")["input_sha256"]
    for name, expected_hash in original_hashes.items():
        require(digest(PARENT / name) == expected_hash, "Original input changed: " + name)
    model = read(PARENT / "model.json")
    scripts = read(HERE / "scripts.json")
    summaries = {}
    for name in ("A", "B"):
        script = scripts[name]
        paths = replay(model, script)
        write(output / (name + "-histories.json"), {"script": script, "paths": paths}, compact=True)
        saved = read(output / (name + "-histories.json"))
        audits, observed_orders = [], set()
        groups = [(2, ["E_BANK", "E_PL_PREMISES"])]
        if name == "B":
            groups.extend([(6, ["E_PL_TEAM", "E_MOVED_MACHINE"]),
                           (8, ["E_SE_TEAM_LEAVES", "E_QUALITY"])])
        expected_orders = set(product(*[
            [(week, order) for order in permutations(events)] for week, events in groups]))
        for path in saved["paths"]:
            history = path["history"]
            audit = audit_transitions(history, model, saved["script"])
            audit["sweden"] = inspect_swedish_history(history)
            require(path["snapshot"] == history[-1]["after"], "Terminal snapshot mismatch")
            require(audit["final_budget"] == 1, "Unexpected remaining budget")
            rejected = [r["decision"] for r in audit["rejected_attempts"]]
            expected_rejections = ["D5", "D6", "D8"] if name == "A" else []
            require(rejected == expected_rejections, "Wrong blocked attempts")
            require(audit["script_is_legal"] == (name == "B"), "Wrong script legality")
            require(audit["d8_weeks"] == ([] if name == "A" else [8]), "Wrong D8 execution")
            require(audit["sweden"]["continuous_sweden"] == (name == "A"), "Wrong Swedish continuity")
            if name == "B":
                first = audit["sweden"]["first_violation"]
                require(first["week"] == 2 and first["action"] == "D5" and first["side"] == "after",
                        "Swedish machine loss must occur immediately at D5")
                require(path["snapshot"]["state"]["se_team"] is False, "Unsecured team must leave")
            else:
                require(path["snapshot"]["state"]["se_team"] is True, "Secured team must stay")
            # Explicitly inspect all saved queues: rejected decisions create no follow-up event.
            for row in history:
                if row["kind"] == "rejected_attempt":
                    require(row["before"] == row["after"], "Rejected attempt changed state/queue")
                for side in ("before", "after"):
                    for event in row[side]["pending"]:
                        require(event["origin"] not in rejected, "Event from a rejected decision")
            quality_events = [r for r in history if r["action"] == "E_QUALITY"
                              and r["kind"] in ("event", "event_skipped")]
            if name == "A":
                require(not quality_events, "Quality result exists without an ordered review")
                require(not any(r["action"] == "E_MOVED_MACHINE" for r in history),
                        "Arrival exists without a performed move")
                require(path["snapshot"]["state"]["quality"] == "not_requested",
                        "Unordered quality test changed status")
            else:
                orders = [r for r in history if r["kind"] == "decision" and r["action"] == "D6"]
                require(len(orders) == len(quality_events) == 1, "Expected exactly one real quality review")
                require(quality_events[0]["week"] == orders[0]["week"] + 2 == 8,
                        "Quality must follow actual ordering by two weeks")
                require(quality_events[0]["outcome"] == "approved", "Wrong quality outcome")
            observed_orders.add(tuple((week, tuple(r["action"] for r in history
                if r["week"] == week and r["kind"] in ("event", "event_skipped")))
                for week, _ in groups))
            audits.append(audit)
        require(observed_orders == expected_orders and len(paths) == len(expected_orders),
                "Incomplete event permutation coverage")
        write(output / (name + "-audits.json"), audits)
        with (output / (name + "-timeline.tsv")).open("w", encoding="utf-8", newline="") as stream:
            writer = csv.writer(stream, delimiter="\t", lineterminator="\n")
            writer.writerow(["week", "kind", "id", "decision_name", "outcome", "budget_before",
                             "budget_after", "blocked_reasons", "se_premises", "original_machine", "se_team"])
            for row in saved["paths"][0]["history"]:
                state = row["after"]["state"]
                writer.writerow([row["week"], row["kind"], row["action"],
                    model["decisions"].get(row["action"], {}).get("label", ""), row.get("outcome", ""),
                    row["before"]["state"]["budget"], state["budget"],
                    json.dumps(row.get("failures", []), ensure_ascii=False), state["se_premises"],
                    state["original_machine"], state["se_team"]])
        first = audits[0]
        summaries[name] = {"status": "PASS", "event_order_count": len(paths),
            "weeks_checked_per_path": 27, "history_rows_checked": sum(a["rows_checked"] for a in audits),
            "budget_at_week_end": {str(r["week"]): r["budget"] for r in first["week_end_balances"]},
            "d8_weeks": first["d8_weeks"], "rejected_attempts": first["rejected_attempts"],
            "continuous_sweden": first["sweden"]["continuous_sweden"],
            "first_sweden_loss": first["sweden"]["first_violation"],
            "no_events_from_rejected_decisions": True,
            "quality_event_week": None if name == "A" else 8}
    for filename, expected_hash in original_hashes.items():
        require(digest(PARENT / filename) == expected_hash, "Input changed during replay")
    write(output / "summary.json", {"status": "PASS", "original_input_sha256": original_hashes,
        "new_input_sha256": {"scripts.json": digest(HERE / "scripts.json"), "run.py": digest(HERE / "run.py")},
        "scope": "Only fixed A and B; unchanged model and contract; no strategy search.", "runs": summaries})
    report = """# Bankavslag vecka 2: jämförelse av två fasta förlopp

**A genomför inte den angivna Polenbanan och behåller svensk produktionsförmåga till och med vecka 26. B godkänner produktionsstart i Polen vecka 8 men förlorar svensk produktionsförmåga redan vecka 2. Båda slutar med 1 miljon kvar.** Detta är mekaniskt kontrollerat för exakt de beställda förloppen.

Vecka 0 genomför båda **ansöka om finansiering**, **teckna polskt lokalavtal** och **begära kundgodkännande**, i den ordningen. A genomför därefter även **säkra svenskt arbetslag**. B genomför aldrig det beslutet. Banken avslår vecka 2 och kunden godkänner vecka 3 i båda fallen.

| Vecka | A: svenskt arbetslag säkrat | B: svenskt arbetslag inte säkrat | Kvar A / B, miljoner |
|---|---|---|---:|
| 0 | Polskt avtal kostar 2; svensk personalsäkring kostar 3. | Polskt avtal kostar 2. | 3 / 6 |
| 2 | **Rekrytera och utbilda polskt arbetslag** genomförs för 2. **Flytta svensk maskin** blockeras: endast 1 återstår, men flytten kostar 2. | **Rekrytera och utbilda polskt arbetslag** och **flytta svensk maskin** genomförs för 2 vardera. Sverige förlorar maskinen i bruk direkt. | 1 / 2 |
| 6 | Polskt arbetslag blir redo. **Beställa kvalitetsprövning** blockeras eftersom ingen maskin finns i Polen. | Polskt arbetslag och flyttad maskin blir tillgängliga. **Beställa kvalitetsprövning** genomförs för 1. | 1 / 1 |
| 8 | **Godkänna produktionsstart** blockeras: maskin och kvalitetsgodkännande saknas. Det säkrade svenska arbetslaget stannar. | Den faktiskt beställda kvalitetsprövningen godkänns; **godkänna produktionsstart** genomförs. Det osäkrade svenska arbetslaget lämnar också denna vecka. | 1 / 1 |
| 26 | Svensk lokal, ursprunglig maskin i bruk i Sverige och svenskt arbetslag finns kvar. | Svensk produktionsförmåga är fortsatt förlorad. | 1 / 1 |

**Blockerade beslut skapar inga följdevents.** I A finns därför varken något event för maskinens ankomst eller någon kvalitetsprövning vecka 8. Det förvalda positiva kvalitetsutfallet används aldrig: ingen prövning beställdes. I B schemaläggs kvalitetsprövningen först av den genomförda beställningen vecka 6 och ger godkännande två veckor senare. A:s blockerade försök loggas utan kostnad eller annan effekt; inga ersättningsbeslut läggs till.

Kontrollen besökte varje vecka 0–26 och granskade budget, förvillkor, engångsregel, schemaläggning och event före beslut. Svensk produktionsförmåga kontrollerades separat i sparad och återläst historik. A kördes i båda eventordningarna vecka 2. B kördes i alla åtta kombinationer av samtidiga events vecka 2, 6 och 8. Samma redovisade utfall erhölls i samtliga ordningar. Modellen, kontraktet och tidigare resultat är oförändrade.

Resultatet gäller bara dessa två fasta förlopp med bankavslag. Inga andra strategier eller anpassningar har sökts eller bedömts.

Kör igen med `python3 -B isolated-tests/structural-ce-v1-factory-witness/bank-rejection-ab/run.py` från projektroten. `../scripts.json` sparar beslutsförloppen; `A-histories.json` och `B-histories.json` sparar alla övergångar och eventordningar. Separata granskningar finns i `A-audits.json` och `B-audits.json`, läsbara tidslinjer i motsvarande TSV-filer och sammanställning samt kontrollsummor i `summary.json`.
"""
    (output / "report.md").write_text(report, encoding="utf-8")
    print(json.dumps({"status": "PASS", "A": summaries["A"], "B": summaries["B"],
                      "report": str(output / "report.md")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
