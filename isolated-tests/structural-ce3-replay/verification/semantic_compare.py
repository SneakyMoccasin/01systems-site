"""Lossless projection of material transitions; never rewrites checkpoint files."""
from copy import deepcopy

from core.history import encode

KINDS = {"event_applied": "event", "event_inapplicable": "event_skipped",
         "decision_executed": "decision", "attempt_blocked": "rejected_attempt",
         "step_begin": "week_begin", "step_end": "week_end"}
MATERIAL = {"event", "event_skipped", "decision", "rejected_attempt", "script_skip"}


class Divergence(ValueError):
    def __init__(self, detail):
        self.detail = detail
        super().__init__(str(detail))


def snapshot(value, new):
    pending = deepcopy(value["pending"])
    if new:
        for event in pending:
            event["origin"] = "initial" if event["origin"]["kind"] == "initial" else event["origin"]["id"]
    return {"week": value["step" if new else "week"], "state": value["state"],
            "taken": sorted(value["taken"]), "pending": sorted(pending, key=encode)}


def diagnostics(row):
    failures = []
    for item in row.get("failures", []):
        if type(item) is dict:
            failures.append(item)
        elif item[0] == "once_only":
            failures.append({"field": "once_only", "actual": item[1]})
        else:
            field, operator, required, actual = item
            failures.append(dict(field=field, operator=operator, required=required, actual=actual))
    return sorted(failures, key=encode)


def projection(path, new):
    rows = []
    for row in path["history"]:
        kind = KINDS.get(row["kind"], row["kind"]) if new else row["kind"]
        # The legacy factory has no decision_point: derive it in the comparator.
        if kind == "decision_point":
            continue
        material = kind in MATERIAL
        rows.append({"week": row["step" if new else "week"], "kind": kind,
                     "action": row["action"] if material else kind,
                     "outcome": row.get("outcome"), "failures": diagnostics(row),
                     "source": row["source"] if material and kind != "script_skip" else None,
                     "before": snapshot(row["before"], new), "after": snapshot(row["after"], new)})
    return {"rows": rows, "terminal": snapshot(path["snapshot"], new)}


def decision_points(path, new):
    """After all due events, before attempts, including empty weeks."""
    points = {}
    history = path["history"]
    for index, row in enumerate(history):
        kind = KINDS.get(row["kind"], row["kind"]) if new else row["kind"]
        if kind == "week_begin":
            snap = row["after"]
            for following in history[index + 1:]:
                next_kind = KINDS.get(following["kind"], following["kind"]) if new else following["kind"]
                if next_kind not in ("event", "event_skipped"):
                    break
                snap = following["after"]
            points[str(row["step" if new else "week"])] = snapshot(snap, new)
    return points


def signature(path, new):
    return tuple((r["step" if new else "week"], r["action"])
                 for r in path["history"] if r["kind"] in
                 (("event_applied", "event_inapplicable") if new else ("event", "event_skipped")))


def compare(legacy, bundle):
    if bundle["status"] != "COMPLETE":
        raise Divergence({"reason": "Replay did not complete", "status": bundle["status"]})
    old, new = {}, {}
    for paths, target, is_new in [(legacy["paths"], old, False), (bundle["paths"], new, True)]:
        for path in paths:
            key = signature(path, is_new)
            if key in target:
                raise Divergence({"reason": "Duplicate event-order signature", "signature": key})
            target[key] = path
    if old.keys() != new.keys():
        raise Divergence({"reason": "Event permutation set differs", "old_paths": len(old), "new_paths": len(new)})
    rows = 0
    for key, old_path in old.items():
        a, b = projection(old_path, False), projection(new[key], True)
        for index in range(max(len(a["rows"]), len(b["rows"]))):
            left = a["rows"][index] if index < len(a["rows"]) else None
            right = b["rows"][index] if index < len(b["rows"]) else None
            if encode(left) != encode(right):
                raise Divergence({"reason": "First divergent transition", "signature": key,
                                  "projected_index": index, "old": left, "new": right})
            rows += 1
        if encode(a["terminal"]) != encode(b["terminal"]):
            raise Divergence({"reason": "Terminal mismatch", "signature": key})
        if encode(decision_points(old_path, False)) != encode(decision_points(new[key], True)):
            raise Divergence({"reason": "Decision-point mismatch", "signature": key})
    return {"status": "PASS", "paths": len(old), "projected_rows": rows,
            "all_material_transitions_equal": True, "decision_points_equal": True,
            "first_divergence": None}
