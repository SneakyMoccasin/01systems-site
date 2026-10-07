"""String decision lists and embedded external bindings to the common format."""
from copy import deepcopy
from .common import translate


def adapt(model, script, metadata, sources, envelope_source=None):
    # Bank A/B stores provenance on its enclosing document, not each script.
    # Copy only that documentary field; never infer or change operational data.
    script = deepcopy(script)
    if "source" not in script and envelope_source is not None:
        script["source"] = envelope_source
    return translate(model, script, script["external_outcomes"], metadata, sources, factory=True)
