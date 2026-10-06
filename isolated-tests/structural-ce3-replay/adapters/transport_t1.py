"""Object decision lists and explicit fixed external bindings to common format."""
from .common import translate


def adapt(model, script, outcomes, metadata, sources):
    return translate(model, script, outcomes, metadata, sources)
