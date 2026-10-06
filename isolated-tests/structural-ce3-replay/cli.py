#!/usr/bin/env python3
"""Explicit input/output only. No default path can overwrite a legacy result."""
import argparse
from pathlib import Path
import sys

from core.history import digest, read_bundle, write_bundle
from core.schema import InputError


def output_allowed(path):
    destination = Path(path).resolve()
    isolated = Path(__file__).resolve().parent.parent
    for name in ("structural-ce-v1-factory-witness", "structural-ce-v1-transport-t1"):
        root = isolated / name
        if destination == root or root in destination.parents:
            raise ValueError("Output inside protected legacy case is forbidden")
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    play = commands.add_parser("replay")
    play.add_argument("--input", required=True, type=Path)
    play.add_argument("--output", required=True, type=Path)
    play.add_argument("--max-paths", type=int, default=10000)
    play.add_argument("--max-rows", type=int, default=1000000)
    play.add_argument("--max-steps", type=int, default=10000)
    check = commands.add_parser("audit")
    check.add_argument("--history", required=True, type=Path)
    check.add_argument("--trusted-input", required=True, type=Path)
    check.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    destination = output_allowed(args.output)
    inputs = [args.input] if args.command == "replay" else [args.history, args.trusted_input]
    if destination in [p.resolve() for p in inputs]:
        raise ValueError("Output must not overwrite input")
    try:
        if args.command == "replay":
            from core.replay import replay
            result = replay(read_bundle(args.input), {"max_paths": args.max_paths, "max_rows": args.max_rows,
                                                      "max_steps": args.max_steps})
            write_bundle(result, destination)
            print(result["status"])
            return 0 if result["status"] == "COMPLETE" else 2
        from audit.verify import audit_bundle
        result = audit_bundle(read_bundle(args.history), digest(read_bundle(args.trusted_input)))
        write_bundle(result, destination)
        print(result["status"])
        return 0 if result["status"] == "PASS" else 2
    except (InputError, ValueError) as error:
        write_bundle({"status": "FAIL", "type": type(error).__name__, "message": str(error)}, destination)
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
