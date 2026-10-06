"""String decision lists and embedded external bindings to the common format."""
from .common import translate


def adapt(model, script, metadata, sources):
    return translate(model, script, script["external_outcomes"], metadata, sources, factory=True)
