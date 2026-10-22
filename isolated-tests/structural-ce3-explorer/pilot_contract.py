"""Manual pilot admission and provenance. No operational model evaluation."""
from datetime import datetime
import hashlib
from html import escape
import json
import os
from pathlib import Path, PurePosixPath

from bridge import (ROOT, digest, equal, explorer_build, file_hash, obj, read_bundle,
                    require, runtime_manifest)
from contracts import LIMITS
import scenario_contracts as scenarios
from observe import observe

PURPOSE = "bounded_real_pilot"
BASELINE = ROOT.parent.parent / "docs/ce3/capabilities/engine-baseline-v2.json"
SECTIONS = ("model", "sources", "search", "observation", "scenario_set")
DRAFT_KEYS = ("schema_version", "case_id", "revision", "analysis", "translator", "problem",
              "evidence", "mapping", "assumptions", "issues", "controls", "execution", "classification")
ACKNOWLEDGEMENTS = ["scope", "model_mapping", "assumptions", "issues", "goals", "scenarios",
                    "selection_and_prefix_times", "limits_and_budget", "human_responsibility",
                    "classification_and_receipt_origin"]


def text(value, label):
    require(type(value) is str and bool(value.strip()), "Nonblank text required: " + label)


def strings(value, label, nonempty=False):
    require(type(value) is list and (bool(value) or not nonempty), "Expected list: " + label)
    for item in value:
        text(item, label)
    require(len(value) == len(set(value)), "Duplicate values: " + label)


# These are declarations, not authentication or source-truth attestations.
CLASSIFICATIONS = {
    "fabricated_exercise": "fabricated_test",
    "declared_real_case": "declared_actual_response",
}
RECEIPT_FIELDS = ("kind", "decision", "snapshot_id", "presentation_sha256", "classification",
                  "stated_person", "stated_role", "recorded_by", "recorded_at", "statement",
                  "acknowledgements", "assumption_ids", "supporting_records")


def validate_classification(value):
    obj(value, ("case_kind", "receipt_origin"), "classification")
    for key in value:
        text(value[key], key)
    require(value["case_kind"] in CLASSIFICATIONS, "Unknown pilot case classification")
    equal(value["receipt_origin"], CLASSIFICATIONS[value["case_kind"]],
          "Real cases and fabricated test receipts cannot be mixed")


def case_notice(classification):
    validate_classification(classification)
    if classification["case_kind"] == "fabricated_exercise":
        return "FABRICERAD ÖVNING med fabricerade testkvitton – inte en genomförd kundpilot."
    return ("Deklarerat verkligt fall med uppgivna faktiska svar. "
            "Personer, svar och verklighetsuppgifter är inte autentiserade.")


def package_tree(directory):
    """Reject symlinks/special files at or below a package root; never follow them.

    Ancestors above the root may use platform aliases such as macOS /tmp.
    Stable storage is assumed; this is not a concurrent filesystem sandbox.
    """
    directory = Path(directory)
    require(not directory.is_symlink(), "Symlink package root unsupported")
    if not directory.exists():
        return
    require(directory.is_dir(), "Package root must be a directory")
    def fail(error):
        raise error
    for parent, directories, files in os.walk(directory, followlinks=False, onerror=fail):
        for name in directories + files:
            path = Path(parent) / name
            require(not path.is_symlink(), "Symlink package entry unsupported: " + str(path))
            require(path.is_dir() if name in directories else path.is_file(),
                    "Special package files unsupported: " + str(path))


def pointer_part(value):
    return str(value).replace("~", "~0").replace("/", "~1")


def leaves(value, prefix=""):
    if type(value) is dict and value:
        return {p: v for k, child in sorted(value.items()) for p, v in leaves(child, prefix + "/" + pointer_part(k)).items()}
    if type(value) is list and value:
        return {p: v for k, child in enumerate(value) for p, v in leaves(child, prefix + "/" + str(k)).items()}
    return {prefix: value}


def targets(problem):
    return {p: v for key in SECTIONS for p, v in leaves(problem[key], "/" + key).items()}


def safe_path(root, relative):
    text(relative, "artifact path")
    path = PurePosixPath(relative)
    require(not path.is_absolute() and all(p not in (".", "..") for p in path.parts)
            and str(path) == relative and "\\" not in relative, "Unsafe artifact path")
    require(not Path(root).is_symlink(), "Symlink material root unsupported")
    root = Path(root).resolve()
    result = root.joinpath(*path.parts)
    require(root in result.resolve().parents, "Artifact escapes material directory")
    require(not any(p.is_symlink() for p in [result, *result.parents] if p != root and root in p.parents),
            "Symlink materials unsupported")
    return result


def artifact(root, value):
    obj(value, ("path", "sha256"), "artifact")
    path = safe_path(root, value["path"])
    equal(file_hash(path), value["sha256"], "Missing or stale artifact: " + value["path"])
    return path


def descriptor(root, relative):
    return {"path": relative, "sha256": file_hash(safe_path(root, relative))}


def registration():
    return {"capability_baseline": {"id": "ce3-optional-decisions-f31033b", "sha256": file_hash(BASELINE)},
            "runtime": runtime_manifest(), "explorer_build": explorer_build()}


def check_refs(refs, evidence, root):
    require(type(refs) is list, "Source references must be a list")
    for ref in refs:
        obj(ref, ("source_id", "source_version", "start", "end", "quote"), "source reference")
        source = evidence.get(ref["source_id"])
        require(source is not None, "Unknown source reference")
        equal(ref["source_version"], source["version"], "Stale source version")
        content = artifact(root, source["extract"]).read_bytes().decode("utf-8")
        start, end = ref["start"], ref["end"]
        require(type(start) is int and type(end) is int and 0 <= start < end <= len(content),
                "Invalid source span")
        equal(content[start:end], ref["quote"], "Source span/quote mismatch")


def check_targets(value, available, label, nonempty=True):
    strings(value, label, nonempty)
    require(set(value) <= set(available), "Unknown target in " + label)


def validate_content(value, root):
    """Validate authoring content, without claiming review or customer confirmation."""
    validate_classification(value["classification"])
    text(value["case_id"], "case_id")
    require(type(value["revision"]) is int and value["revision"] >= 1, "Invalid pilot revision")
    a = value["analysis"]
    obj(a, ("question", "intended_use", "includes", "excludes", "decision_authority", "time_unit",
            "limitations", "ranking"), "analysis")
    for key in ("question", "intended_use", "decision_authority", "time_unit"):
        text(a[key], key)
    for key in ("includes", "excludes", "limitations"):
        strings(a[key], key, True)
    equal(a["ranking"], "none", "Pilot /2 does not rank candidates")
    obj(value["translator"], ("stated_person", "method_version"), "translator")
    for key, item in value["translator"].items():
        text(item, key)
    problem = value["problem"]
    equal(problem["schema_version"], "ce3-scenario-problem/4", "Pilot /2 requires /4 semantics")
    scenarios._validate_structure(problem, PURPOSE)
    equal(a["time_unit"], problem["model"]["clock"]["unit"], "Analysis/model time unit mismatch")
    execution = value["execution"]
    obj(execution, ("limits", "max_cells"), "execution")
    equal(sorted(execution["limits"]), sorted(LIMITS), "Invalid replay limit keys")
    require(all(type(v) is int and v > 0 for v in execution["limits"].values()), "Invalid replay limits")
    require(type(execution["max_cells"]) is int and
            0 <= execution["max_cells"] <= scenarios.search_size(problem)["cells"], "Invalid batch budget")
    require(type(value["evidence"]) is list and bool(value["evidence"]), "Preserved evidence required")
    evidence = {}
    for source in value["evidence"]:
        obj(source, ("id", "version", "title", "original", "extract", "extraction", "extraction_note"), "source")
        for key in ("id", "version", "title", "extraction_note"):
            text(source[key], key)
        require(source["id"] not in evidence, "Duplicate source ID (one current version per snapshot)")
        require(source["extraction"] in ("verbatim_utf8", "manual_transcription"), "Incomplete extraction")
        original = artifact(root, source["original"])
        extracted = artifact(root, source["extract"])
        extracted.read_bytes().decode("utf-8")
        if source["extraction"] == "verbatim_utf8":
            equal(original.read_bytes().hex(), extracted.read_bytes().hex(), "Verbatim extraction differs")
        evidence[source["id"]] = source
    available = targets(problem)
    require(type(value["assumptions"]) is list, "Assumptions must be a list")
    assumptions = {}
    for assumption in value["assumptions"]:
        obj(assumption, ("id", "statement", "reason", "targets"), "assumption")
        for key in ("id", "statement", "reason"):
            text(assumption[key], key)
        require(assumption["id"] not in assumptions, "Duplicate assumption")
        check_targets(assumption["targets"], available, "assumption targets")
        assumptions[assumption["id"]] = assumption
    require(type(value["mapping"]) is list and bool(value["mapping"]), "Mapping required")
    covered, assumption_coverage = [], {key: set() for key in assumptions}
    for mapping in value["mapping"]:
        obj(mapping, ("targets", "explanation", "refs", "assumption_ids"), "mapping")
        check_targets(mapping["targets"], available, "mapping targets")
        text(mapping["explanation"], "mapping explanation")
        check_refs(mapping["refs"], evidence, root)
        strings(mapping["assumption_ids"], "mapping assumptions")
        require(bool(mapping["refs"] or mapping["assumption_ids"]), "Unsubstantiated mapping")
        for key in mapping["assumption_ids"]:
            require(key in assumptions and set(mapping["targets"]) <= set(assumptions[key]["targets"]),
                    "Assumption does not cover mapped targets")
            assumption_coverage[key].update(mapping["targets"])
        covered.extend(mapping["targets"])
    require(len(covered) == len(set(covered)) and set(covered) == set(available),
            "Mapping must cover exactly every model/source/goal/scenario/search leaf, including empty containers")
    for key, assumption in assumptions.items():
        require(assumption_coverage[key] == set(assumption["targets"]), "Unused assumption targets")
    require(type(value["issues"]) is list, "Issues must be a list")
    issue_ids = set()
    for issue in value["issues"]:
        obj(issue, ("id", "kind", "question", "owner", "impact", "targets", "disposition", "reason",
                    "refs", "assumption_ids", "scenario_event", "excluded_scope_index", "previous_scope"), "issue")
        for key in ("id", "question", "owner", "reason"):
            text(issue[key], key)
        require(issue["id"] not in issue_ids, "Duplicate issue")
        issue_ids.add(issue["id"])
        kind, disposition = issue["kind"], issue["disposition"]
        require(kind in ("missing_fact", "future_outcome", "uncertain_time", "model_gap", "unresolved_priority"),
                "Unknown issue classification")
        require(issue["impact"] in ("blocks_analysis", "outside_scope", "ranking_only"), "Invalid issue impact")
        check_targets(issue["targets"], available, "issue targets", False)
        check_refs(issue["refs"], evidence, root)
        strings(issue["assumption_ids"], "issue assumptions")
        require(set(issue["assumption_ids"]) <= set(assumptions), "Unknown issue assumption")
        if disposition == "scope_excluded":
            index = issue["excluded_scope_index"]
            require(issue["impact"] == "outside_scope" and not issue["targets"] and
                    type(index) is int and 0 <= index < len(a["excludes"]),
                    "Excluded issue must have no analysis dependencies and reference explicit excluded scope")
            text(issue["previous_scope"], "previous scope before narrowing")
        else:
            equal(issue["excluded_scope_index"], None, "Unexpected exclusion reference")
            equal(issue["previous_scope"], None, "Unexpected previous scope")
            require(kind != "model_gap", "Unsupported model function requires changed scope, never accepted limitation")
            if disposition == "open":
                require(kind == "unresolved_priority" and issue["impact"] == "ranking_only" and
                        not issue["targets"], "Unresolved critical issue blocks analysis")
            elif disposition == "source_resolved":
                require(kind in ("missing_fact", "uncertain_time", "unresolved_priority") and
                        bool(issue["refs"]) and bool(issue["targets"]), "Source resolution requires evidence and targets")
            elif disposition == "hypothetical":
                require(kind in ("missing_fact", "uncertain_time") and bool(issue["assumption_ids"]) and
                        bool(issue["targets"]) and set(issue["targets"]) <=
                        {p for key in issue["assumption_ids"] for p in assumptions[key]["targets"]},
                        "Hypothetical resolution requires explicit covering assumptions")
            elif disposition == "scenarios":
                event = issue["scenario_event"]
                require(kind == "future_outcome" and type(event) is str and
                        event in problem["model"]["events"] and problem["model"]["events"][event]["kind"] == "external",
                        "Only external outcomes may resolve a scenario issue")
                expected = {"/scenario_set/members/" + str(i) + "/outcomes/" + pointer_part(event)
                            for i in range(len(problem["scenario_set"]["members"]))}
                require(set(issue["targets"]) == expected, "Future outcome must reference every declared scenario")
            else:
                raise ValueError("Unsupported issue disposition; accepted limitations cannot resolve blockers")
        if disposition != "scenarios":
            equal(issue["scenario_event"], None, "Unexpected scenario resolution")
        if disposition != "hypothetical":
            equal(issue["assumption_ids"], [], "Unexpected issue assumptions")
    return available


def control_input(problem, control):
    definitions = [s for s in problem["scenario_set"]["members"] if s["label"] == control["scenario_label"]]
    require(len(definitions) == 1, "Unknown control scenario")
    return scenarios.materialize(problem, scenarios.candidate(problem, control["order"]),
                                 scenarios.scenario_member(problem, definitions[0]))


def validate_controls(value, root, completed):
    controls = value["controls"]
    require(type(controls) is list and len(controls) >= 2, "At least two hand-derived control cases required")
    seen = set()
    for control in controls:
        keys = ("order", "scenario_label", "expected_goal", "rationale")
        obj(control, keys + (("history", "audit") if completed else ()), "control case")
        require(type(control["expected_goal"]) is bool, "Control expectation must be boolean")
        text(control["rationale"], "hand-derived control rationale")
        run_input = control_input(value["problem"], control)
        key = digest({k: control[k] for k in ("order", "scenario_label")})
        require(key not in seen, "Duplicate control case")
        seen.add(key)
        if completed:
            history = read_bundle(artifact(root, control["history"]))
            audit = read_bundle(artifact(root, control["audit"]))
            equal(history["limits"], value["execution"]["limits"], "Control replay limits mismatch")
            effective = scenarios.effective_problem(value["problem"], {"outcomes": run_input["outcomes"]})
            observed = observe(effective, history, run_input, audit, digest(value["implementation"]["runtime"]),
                               digest(value["implementation"]["explorer_build"]))
            equal(observed["goal_satisfied"], control["expected_goal"], "Hand-derived control expectation failed")


def validate_snapshot(snapshot, root):
    obj(snapshot, DRAFT_KEYS + ("implementation",), "snapshot")
    equal(snapshot["schema_version"], "ce3-pilot-snapshot/2", "Unsupported snapshot")
    validate_content(snapshot, root)
    equal(snapshot["implementation"], registration(), "Registered implementation/runtime/baseline changed")
    validate_controls(snapshot, root, True)


def presentation(snapshot):
    """Exact, deterministic UTF-8 review document. No executable or remote content."""
    esc = lambda value: escape(str(value), quote=True)
    def table(rows):
        return '<table>' + ''.join('<tr>' + ''.join('<td>' + esc(c) + '</td>' for c in row) + '</tr>'
                                  for row in rows) + '</table>'
    a = snapshot["analysis"]
    parts = ['<!doctype html><html lang="sv"><meta charset="utf-8"><title>CE3 modellbekräftelse</title>',
             '<style>body{font:16px system-ui;max-width:1100px;margin:40px auto;padding:20px;line-height:1.5}'
             'td{border:1px solid #ccc;padding:8px;vertical-align:top;overflow-wrap:anywhere}'
             'table{border-collapse:collapse;width:100%}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style>',
             '<h1>CE3 – underlag för manuell modellbekräftelse</h1>',
             '<p><strong>' + esc(case_notice(snapshot["classification"])) + '</strong></p>',
             table(sorted(snapshot["classification"].items())),
             '<p>Snapshot: <code>' + digest(snapshot) + '</code></p>',
             '<p>Bekräftelsen avser denna exakta version. Maskinen kontrollerar struktur och bindningar. '
             'Källrelevans, modellens rimlighet och antagandenas acceptans är människors ansvar. '
             'Varken namn eller hash är en verifierad identitet eller digital signatur.</p>',
             '<h2>Analysfråga och användning</h2>', table([(k, v) for k, v in sorted(a.items()) if type(v) is str])]
    for key in ("includes", "excludes", "limitations"):
        parts += ['<h3>' + {"includes": "Ingår", "excludes": "Ingår inte", "limitations": "Begränsningar"}[key] + '</h3>',
                  '<ul>' + ''.join('<li>' + esc(v) + '</li>' for v in a[key]) + '</ul>']
    parts += ['<h2>Så ska sökningen förstås</h2><p>Obligatoriska beslut ingår alltid. Valfria beslut och '
              'valgrupper bestämmer tillåtna urval. Varje valt beslut försöks exakt en gång. Ett kortare '
              'urval använder de första tidsplatserna: utelämning kan tidigarelägga senare beslut. '
              'Samma fasta plan prövas i samtliga scenarier. Tom plan kräver uttryckligt tillstånd. '
              'Scenarier varierar bara externa utfall, inte tider eller modellregler. Alla eventbanor '
              'måste auditeras. Ingen ranking, sannolikhet, optimalitet eller global omöjlighet påstås.</p>',
              '<p>terminal = vid horisonten; always = varje modellerad snapshot till och med gränsen; '
              'reach_by = minst en snapshot senast gränsen. Alla valda försök måste accepteras.</p>',
              '<h2>Modell, mål, scenarier och sökning: värde, förklaring, underlag</h2>']
    values = targets(snapshot["problem"])
    for mapping in snapshot["mapping"]:
        parts += ['<p>' + esc(mapping["explanation"]) + '</p>',
                  table([(p, json.dumps(values[p], ensure_ascii=False)) for p in mapping["targets"]]),
                  '<p>Antaganden: ' + esc(', '.join(mapping["assumption_ids"]) or 'inga') + '</p>',
                  table([(r["source_id"] + '@' + r["source_version"], r["start"], r["end"], r["quote"])
                         for r in mapping["refs"]])]
    for key, heading in (("assumptions", "Synliga hypotetiska antaganden"), ("issues", "Frågor och dispositioner"),
                         ("controls", "Handhärledda kontrollfall"), ("evidence", "Bevarade källor")):
        parts += ['<h2>' + heading + '</h2>', table([(p, json.dumps(v, ensure_ascii=False))
                                                   for p, v in leaves(snapshot[key]).items()])]
    parts += ['<h2>Körgränser</h2>', table(list(leaves(snapshot["execution"]).items())),
              '<p>Timeout är 60 sekunder per replay-/auditprocess. Förprovens kontrollkörningar '
              'ligger utanför batchens max_cells-budget. Ingen total väggklocksgaranti finns.</p>',
              '<p>Separata besked krävs för aktuellt pilotunderlag, körningskorrekthet, mål, söktäckning '
              'och batchbudget/prefix. Komplett underlag bevisar inte sann modell eller sanna källor.</p>',
              '<details><summary>Full snapshot och registrerad implementation</summary><pre>',
              esc(json.dumps(snapshot, ensure_ascii=False, sort_keys=True, indent=2)), '</pre></details></html>\n']
    return '\n'.join(parts).encode('utf-8')


def validate_case(case, root, shown):
    obj(case, ("schema_version", "snapshot", "presentation_sha256", "receipts", "classification"), "pilot case")
    equal(case["schema_version"], "ce3-pilot-case/2", "Unsupported pilot contract")
    snapshot = case["snapshot"]
    validate_snapshot(snapshot, root)
    equal(case["classification"], snapshot["classification"], "Case classification differs from snapshot")
    expected = presentation(snapshot)
    equal(shown.hex(), expected.hex(), "Displayed snapshot differs from registered presentation")
    equal(hashlib.sha256(shown).hexdigest(), case["presentation_sha256"], "Stale presentation hash")
    receipts = case["receipts"]
    require(type(receipts) is list and len(receipts) == 2, "Domain review and customer confirmation required")
    require({r["kind"] for r in receipts} == {"domain_review", "customer_confirmation"}, "Two receipt roles required")
    for receipt in receipts:
        obj(receipt, ("schema_version", "record") + RECEIPT_FIELDS, "receipt")
        equal(receipt["schema_version"], "ce3-pilot-receipt/2", "Unsupported receipt; new /2 confirmation required")
        equal(receipt["classification"], snapshot["classification"], "Receipt classification differs from snapshot")
        equal(receipt["decision"], "approved", "Receipt must explicitly approve the shown snapshot")
        equal(receipt["snapshot_id"], digest(snapshot), "Stale confirmation/review snapshot")
        equal(receipt["presentation_sha256"], case["presentation_sha256"], "Stale confirmation/review presentation")
        for key in ("stated_person", "stated_role", "recorded_by", "recorded_at", "statement"):
            text(receipt[key], key)
        require(datetime.fromisoformat(receipt["recorded_at"].replace('Z', '+00:00')).utcoffset() is not None,
                "Receipt time requires timezone (self-reported, not authenticated)")
        equal(receipt["acknowledgements"], ACKNOWLEDGEMENTS, "Incomplete confirmation scope")
        equal(receipt["assumption_ids"], sorted(a["id"] for a in snapshot["assumptions"]), "Unacknowledged assumptions")
        # Strict JSON parser rejects duplicate keys at every depth. Free prose is
        # retained separately and is deliberately never searched for approval.
        record_path = artifact(root, receipt["record"])
        record = read_bundle(record_path)
        obj(record, ("schema_version",) + RECEIPT_FIELDS, "confirmation record")
        expected_record = dict({key: receipt[key] for key in RECEIPT_FIELDS},
                               schema_version="ce3-pilot-confirmation-record/1")
        equal(record, expected_record, "Structured confirmation record differs from receipt")
        supporting = receipt["supporting_records"]
        require(type(supporting) is list and bool(supporting), "Separate human response material required")
        seen = set()
        for item in supporting:
            supporting_path = artifact(root, item)
            require(item["path"] not in seen, "Duplicate supporting record")
            seen.add(item["path"])
            require(not supporting_path.samefile(record_path), "Confirmation record is not human response material")
    return case


def material_descriptors(case):
    snapshot = case["snapshot"]
    return ([s[k] for s in snapshot["evidence"] for k in ("original", "extract")] +
            [c[k] for c in snapshot["controls"] for k in ("history", "audit")] +
            [r["record"] for r in case["receipts"]] +
            [item for r in case["receipts"] for item in r["supporting_records"]])


class Admission:
    """Revalidated local package handle; no boolean bypass or synthetic relabeling."""
    def __init__(self, directory):
        self.directory = Path(directory)
        package_tree(self.directory)
        self.case = read_bundle(self.directory / "case.json")
        self.case_id = digest(self.case)
        self.validate(self.case["snapshot"]["problem"])

    def validate(self, problem):
        package_tree(self.directory)
        current = read_bundle(self.directory / "case.json")
        equal(digest(current), self.case_id, "Pilot case changed during operation")
        validate_case(current, self.directory / "materials", (self.directory / "review.html").read_bytes())
        equal(problem, current["snapshot"]["problem"], "Pilot admission is for a different exact problem")

    def binding(self, problem, limits, max_cells):
        self.validate(problem)
        equal({"limits": limits, "max_cells": max_cells}, self.case["snapshot"]["execution"],
              "Execution differs from confirmed limits/budget")
        return {"schema_version": "ce3-pilot-binding/2", "case_id": self.case_id,
                "snapshot_id": digest(self.case["snapshot"]),
                "classification": self.case["snapshot"]["classification"]}
