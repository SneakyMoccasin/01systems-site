"""Read saved, checksum-verified results. No model execution or simulation imports."""
import gzip
import hashlib
import json
from pathlib import Path

CASE = Path(__file__).resolve().parent.parent / "same-parking-week14"
DECISIONS = {
    "T1": "Beställa elbusspaketet", "T2": "Beställa elanslutningen",
    "T3": "Beställa depåutbyggnaden", "T4": "Beställa laddutrustningen",
    "T5": "Beställa installation av laddutrustningen", "T6": "Rekrytera och utbilda chaufförspaketet",
    "T7": "Godkänna den utökade busstrafiken", "T8": "Beställa signalprioritering",
    "T9": "Beställa förbättring av cykelstråket", "T10": "Beställa cykelparkeringen",
    "T11": "Godkänna öppning av cykelstråket", "T12": "Beställa borttagning av 100 parkeringsplatser",
}
EVENTS = {
    "E_T1": "Elbussarna levereras", "E_T3": "Den nya depådelen blir tillgänglig",
    "E_T4": "Laddutrustningen levereras", "E_T5": "Laddinstallationen blir färdig",
    "E_T6": "Chaufförspaketet blir tillgängligt", "E_T8": "Signalprioriteringen blir färdig",
    "E_T9": "Cykelstråket blir färdigt", "E_T10": "Cykelparkeringen blir tillgänglig",
    "E_T12": "100 parkeringsplatser tas bort",
}
GRID_EVENTS = {"ready": "Elanslutningen färdigställs", "rejected": "Elanslutningen avslås",
               "absent": "Färdigt besked om elanslutningen uteblir"}
MISSING = {"depot_ready": "Tillgänglig ny depådel", "charger_installed": "Installerad laddutrustning",
           "grid": "Färdig elanslutning", "buses_delivered": "Levererade elbussar",
           "drivers_ready": "Tillgängligt chaufförspaket", "budget": "Tillräcklig budget",
           "charger_delivered": "Levererad laddutrustning", "depot_contract": "Tecknat depåavtal",
           "cycle_ready": "Färdigt cykelstråk", "once_only": "Beslutet får bara genomföras en gång"}

# Presentation mappings only: status is read from explicit model markers at week end.
COMMITMENTS = {
    "T1": ("Elbussar", "buses_delivered", {False: "Inte levererade", True: "Levererade"}),
    "T2": ("Elanslutning", "grid", {"pending": "Besked inväntas", "ready": "Färdig",
           "rejected": "Avslag – inte färdig", "waiting_no_further_review": "Uteblivet besked – ingen ny prövning"}),
    "T3": ("Depåutbyggnad", "depot_ready", {False: "Inte tillgänglig", True: "Tillgänglig"}),
    "T4": ("Laddutrustning", "charger_delivered", {False: "Inte levererad", True: "Levererad"}),
    "T5": ("Installation av laddutrustning", "charger_installed", {False: "Inte installerad", True: "Installerad"}),
    "T6": ("Rekrytering och utbildning av chaufförer", "drivers_ready", {False: "Inte tillgängliga", True: "Tillgängliga"}),
    "T8": ("Signalprioritering", "signal_ready", {False: "Inte färdig", True: "Färdig"}),
    "T9": ("Förbättring av cykelstråket", "cycle_ready", {False: "Inte färdigt", True: "Färdigt"}),
    "T10": ("Cykelparkering", "cycle_parking_ready", {False: "Inte tillgänglig", True: "Tillgänglig"}),
    "T12": ("Borttagning av 100 parkeringsplatser", "parking_removed", {0: "Inte borttagna", 100: "Borttagna"}),
}


def expenses_at(history, model, week, state):
    expenses = []
    for row in history:
        if row["kind"] != "decision" or row["week"] > week:
            continue
        action = row["action"]
        decision = model["decisions"][action]
        if decision["cost"] == 0:
            continue
        completion = None
        label = DECISIONS[action]
        if action in COMMITMENTS:
            label, field, labels = COMMITMENTS[action]
            event = model["events"][decision["schedule"]["id"]]
            if not all(field in outcome["set"] for outcome in event["outcomes"].values()):
                raise ValueError("Färdigmarkören saknas i modellen: " + field)
            completion = {"field": field, "value": state[field], "label": labels[state[field]]}
        expenses.append({"week": row["week"], "label": label, "cost": decision["cost"],
                         "source_index": row["index"], "completion": completion})
    return expenses


def json_file(path):
    return json.loads(path.read_text(encoding="utf-8"))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_payload(case=CASE):
    result = case / "results"
    proof = json_file(result / "reproducibility.json")
    if proof["status"] != "PASS" or not proof["byte_identical"]:
        raise ValueError("Resultaten saknar godkänd reproducerbarhetskontroll.")
    source_hashes = {}

    def verified(relative):
        path = result / "run-1" / relative
        actual = digest(path)
        if actual != proof["run_1_sha256"][relative] or actual != proof["run_2_sha256"][relative]:
            raise ValueError("Kontrollsumman stämmer inte för " + relative)
        source_hashes[relative] = actual
        return path

    summary = json_file(verified("summary.json"))
    if summary["status"] != "PASS":
        raise ValueError("Det sparade resultatet är inte godkänt.")
    cases = {}
    for name, metrics in summary["scenarios"].items():
        if (metrics["status"] != "PASS" or metrics["order_sensitive_week_end"]
                or any(field != "cycle_ready" for field in metrics["parking_sensitive_fields"])):
            raise ValueError("Förloppet saknar entydigt kontrollerat resultat: " + name)
        with gzip.open(verified("histories/" + name + ".json.gz"), "rt", encoding="utf-8") as stream:
            stored = json.load(stream)
        # Reference order only; every permutation was already checked in the saved run.
        history = stored["paths"][0]["history"]
        weeks = []
        for week in range(27):
            snapshot = next(r["after"] for r in history if r["week"] == week and r["kind"] == "week_end")
            point = next(p for p in metrics["decision_points"] if p["week"] == week)
            entries = []
            for row in history:
                if row["week"] != week or row["kind"] not in ("decision", "event", "rejected_attempt", "script_skip"):
                    continue
                kind, action = row["kind"], row["action"]
                label = (GRID_EVENTS[row["outcome"]] if action == "E_T2" else EVENTS[action]) if kind == "event" else DECISIONS[action]
                entries.append({"kind": kind, "label": label,
                                "missing": [{"label": MISSING[f["field"]], "field": f["field"], "actual": f["actual"]}
                                            for f in row.get("failures", [])],
                                "grid_status": row["before"]["state"]["grid"], "source_index": row["index"]})
            weeks.append({"week": week, "state": snapshot["state"],
                          "t7_requirements_met": point["t7_requirements_met"], "entries": entries,
                          "expenses": expenses_at(history, stored["model"], week, snapshot["state"])})
            weeks[-1]["spent"] = sum(item["cost"] for item in weeks[-1]["expenses"])
            if weeks[-1]["spent"] + snapshot["state"]["budget"] != stored["model"]["initial"]["budget"]:
                raise ValueError("Utgifterna stämmer inte med sparad budget: " + name)
        decisions = {row["action"]: row["week"] for row in history if row["kind"] == "decision"}
        grid_review = next(row["week"] for row in history if row["kind"] == "event" and row["action"] == "E_T2")
        cases[name] = {"metrics": metrics, "weeks": weeks, "decision_weeks": decisions,
                       "grid_review_week": grid_review}
    return {"schema": 1, "start": 0, "horizon": 26, "initial_budget": 30,
            "cases": cases, "comparisons": summary["comparisons"],
            "evidence": {"status": "PASS", "paths": summary["main_paths"],
                         "source": "same-parking-week14/results/run-1", "source_sha256": source_hashes,
                         "reproducibility_sha256": digest(result / "reproducibility.json")}}
