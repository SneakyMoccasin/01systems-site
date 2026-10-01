"""Boundary and fault-detection probes; separate from the unchanged candidate."""
from copy import deepcopy
from audit_history import audit_transitions, require


def run_checks(model, candidate, evaluate):
    results = []

    def script(decisions):
        value = deepcopy(candidate)
        value["decisions_by_week"] = decisions
        return value

    def probe(name, value, condition, description):
        paths, audits = evaluate("probes/" + name, value)
        require(all(condition(p, a) for p, a in zip(paths, audits)), "Probe failed: " + name)
        results.append({"id": name, "status": "PASS", "paths": len(paths),
                        "description": description})
        return paths, audits

    def taken(path, decision):
        return decision in path["snapshot"]["taken"]

    probe("once_only", script({"0": ["D9", "D9"]}),
          lambda p, a: a["final_budget"] == 5 and len(a["rejected_attempts"]) == 1
          and a["rejected_attempts"][0]["failures"] == [["once_only", "D9"]],
          "D9 två gånger samma vecka: andra försöket avvisas utan ytterligare kostnad.")
    probe("lease_week_4", script({"4": ["D2"]}),
          lambda p, a: taken(p, "D2") and p["snapshot"]["state"]["pl_premises"],
          "D2 tillåts sista giltiga veckan 4 och lokalen blir tillgänglig vecka 6.")
    probe("lease_week_5", script({"5": ["D2"]}),
          lambda p, a: not taken(p, "D2") and len(a["rejected_attempts"]) == 1,
          "Expiry vecka 5 behandlas före D2 och blockerar beslutet.")
    probe("secure_week_6", script({"6": ["D9"]}),
          lambda p, a: taken(p, "D9") and a["sweden"]["continuous_sweden"],
          "D9 tillåts sista giltiga veckan 6; avgångseventet vecka 8 förfaller utan effekt.")
    probe("secure_week_7", script({"7": ["D9"]}),
          lambda p, a: not taken(p, "D9") and not p["snapshot"]["state"]["se_team"]
          and a["sweden"]["first_violation"]["week"] == 8,
          "Expiry vecka 7 blockerar D9; det osäkrade arbetslaget lämnar vecka 8.")
    late = deepcopy(candidate)
    del late["decisions_by_week"]["10"]
    del late["decisions_by_week"]["12"]
    late["decisions_by_week"].update({"24": ["D6"], "26": ["D8"]})
    probe("quality_then_d8_at_horizon", late,
          lambda p, a: a["script_is_legal"] and a["d8_weeks"] == [26]
          and a["sweden"]["continuous_sweden"],
          "Kvalitetsbesked vid vecka 26 behandlas före D8; horisonten är inklusive.")
    probe("lease_loss_at_horizon", script({"0": ["D9"], "18": ["D10"]}),
          lambda p, a: a["script_is_legal"] and a["sweden"]["first_violation"]["week"] == 26,
          "Uppsägning vecka 18 ger lokalbortfall vecka 26, vilket historikkontrollen upptäcker.")
    probe("effect_beyond_horizon", script({"0": ["D9"], "26": ["D10"]}),
          lambda p, a: a["script_is_legal"] and a["sweden"]["continuous_sweden"]
          and a["pending_after_horizon"] == [{"id": "E_SE_PREMISES_END", "due": 34,
                                             "origin": "D10", "scheduled_at": 26}],
          "D10 vid horisonten får schemalägga vecka 34; effekten utförs inte i förtid.")
    probe("modernization_timer", script({"0": ["D9", "D11"]}),
          lambda p, a: a["script_is_legal"] and a["final_budget"] == 0
          and p["snapshot"]["state"]["modernization_complete"],
          "D11 kräver redan säkrat arbetslag; kostnad 5 och färdigmarkör efter sex veckor.")
    both = script({"0": ["D1", "D2", "D7"], "2": ["D3", "D4", "D5"],
                   "10": ["D6"], "12": ["D8"]})
    probe("both_machines_allowed", both,
          lambda p, a: a["script_is_legal"] and a["d8_weeks"] == [12]
          and p["snapshot"]["state"]["pl_machines"] == 2,
          "D4 och D5 kan båda genomföras; två maskiner räknas utan exklusivitetsregel.")

    # Fault injections target the independent auditor, not business-model changes.
    paths, _ = evaluate("probes/auditor_reference", candidate)
    history = paths[0]["history"]

    def must_reject(name, rows, message_fragment, description):
        try:
            audit_transitions(rows, model, candidate)
        except ValueError as error:
            require(message_fragment in str(error), "Wrong rejection in " + name + ": " + str(error))
            results.append({"id": name, "status": "PASS", "paths": 0,
                            "description": description, "caught": str(error)})
        else:
            raise ValueError("Auditor accepted fault: " + name)

    bad = deepcopy(history)
    next(r for r in bad if r["kind"] == "decision" and r["action"] == "D9")["after"]["state"]["budget"] += 1
    must_reject("detect_budget_tampering", bad, "Wrong transition effects",
                "En manipulerad budget efter D9 avvisas av historikgranskaren.")
    bad = deepcopy(history)
    next(r for r in bad if r["kind"] == "decision" and r["action"] == "D4")["after"]["pending"][-1]["due"] += 1
    must_reject("detect_wrong_schedule", bad, "Wrong transition effects",
                "En manipulerad maskinleveransvecka avvisas av historikgranskaren.")
    bad = deepcopy(history)
    next(r for r in bad if r["kind"] == "week_begin" and r["week"] == 15)["kind"] = "week_end"
    must_reject("detect_missing_week_marker", bad, "Events not exhausted",
                "En saknad veckostart på en vecka utan beslut avvisas av historikgranskaren.")
    return results
