"""Command line entry point: one parser, one dispatch table, no hidden paths."""
from __future__ import annotations

import argparse
import sys

from . import __version__, console
from .checks import agents, arch, config, secrets
from .context import Context
from .commands import features, lifecycle, verify
from .result import Report


def _arch(ctx: Context, args: argparse.Namespace) -> int:
    report = Report("architecture rules")
    report.add(*arch.check_arch(ctx))
    return report.emit()


def _secrets(ctx: Context, args: argparse.Namespace) -> int:
    report = Report("secrets")
    report.add(secrets.scan(ctx))
    return report.emit()


def _config(ctx: Context, args: argparse.Namespace) -> int:
    if args.action == "export-mcp":
        report = Report("mcp export")
        report.add(config.export_mcp(ctx, check_only=args.check))
        return report.emit()
    report = Report("config references")
    report.add(*config.validate(ctx))
    return report.emit()


def _agents(ctx: Context, args: argparse.Namespace) -> int:
    report = Report("agents")
    if args.action == "load":
        report.add(agents.load(ctx))
    else:
        report.add(agents.template(ctx))
    return report.emit()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="zara-cli",
        description="Build and verify the zara-agent-opc harness.",
    )
    parser.add_argument("--version", action="version", version=f"zara-cli {__version__}")
    sub = parser.add_subparsers(dest="group", required=True)

    def add(name: str, handler, help_text: str, aliases: list[str] | None = None):
        node = sub.add_parser(name, help=help_text, aliases=aliases or [])
        node.set_defaults(handler=handler)
        return node

    for name, handler, text in [
        ("init", lifecycle.init, "clock in: setup, deterministic tests, next feature"),
        ("setup", lifecycle.setup, "verify submodule, MCP binary, CLI, python"),
        ("test", verify.test, "L1 deterministic checks"),
        ("check", verify.check, "L2 consistency checks"),
        ("e2e", verify.e2e, "L3 one real model call"),
        ("vcr", verify.vcr, "passing / activated feature ratio"),
        ("arch", _arch, "architecture rules"),
        ("secrets", _secrets, "scan tracked files for credentials"),
        ("clean-check", lifecycle.clean_check, "clock-out checklist"),
        ("audit", lifecycle.audit, "course harness audit"),
        ("doctor", lifecycle.doctor, "read-only environment summary"),
    ]:
        add(name, handler, text)

    node = add("verify", verify.verify, "layered feature gate")
    node.add_argument("id", nargs="?")
    node.add_argument("--all", action="store_true", help="verify every planned feature")

    node = add("feature", features.list_features, "feature list operations", ["features"])
    feature_sub = node.add_subparsers(dest="action", required=True)
    for action, handler, text in [
        ("list", features.list_features, "list features"),
        ("next", features.next_feature, "next planned feature"),
        ("check", features.check_features, "validate feature state"),
    ]:
        feature_sub.add_parser(action, help=text).set_defaults(handler=handler)
    layers = feature_sub.add_parser("layers", help="print layers as TSV")
    layers.add_argument("id")
    layers.set_defaults(handler=features.layers)
    activate = feature_sub.add_parser("activate", help="mark one feature active")
    activate.add_argument("id")
    activate.set_defaults(handler=features.activate)
    passing = feature_sub.add_parser("pass", help="refused: the gate writes state")
    passing.add_argument("id")
    passing.set_defaults(handler=features.pass_feature)
    blocked = feature_sub.add_parser("block", help="mark a feature blocked with a note")
    blocked.add_argument("id")
    blocked.add_argument("--note", default="")
    blocked.set_defaults(handler=features.block_feature)

    node = add("config", _config, "config references and MCP export")
    config_sub = node.add_subparsers(dest="action", required=True)
    config_sub.add_parser("validate", help="check every config reference").set_defaults(handler=_config)
    export = config_sub.add_parser("export-mcp", help="write or check .mcp.json")
    export.add_argument("--check", action="store_true")
    export.set_defaults(handler=_config)

    node = add("agents", _agents, "agent prompt shape and loading")
    agents_sub = node.add_subparsers(dest="action", required=True)
    agents_sub.add_parser("template", help="check the 8-section template").set_defaults(handler=_agents)
    agents_sub.add_parser("load", help="check that every agent loads").set_defaults(handler=_agents)

    node = add("session", lifecycle.session_start, "session trace events")
    session_sub = node.add_subparsers(dest="action", required=True)
    session_sub.add_parser("start", help="append a start event").set_defaults(handler=lifecycle.session_start)
    session_sub.add_parser("end", help="append an end event").set_defaults(handler=lifecycle.session_end)

    node = add("harness", lifecycle.harness, "Harness2 improvement loop (dry-run default)")
    node.add_argument("forward", nargs=argparse.REMAINDER, help="arguments forwarded to the loop")

    return parser


def main(argv: list[str] | None = None) -> int:
    console.utf8_streams()
    parser = build_parser()
    args = parser.parse_args(argv)
    ctx = Context.load()
    try:
        return args.handler(ctx, args)
    except KeyboardInterrupt:
        console.fail("interrupted")
        return 130
    except FileNotFoundError as exc:
        console.fail(str(exc))
        return 2
    except Exception as exc:  # a gate must fail loudly, never silently
        console.fail(f"{exc.__class__.__name__}: {exc}")
        return 2


if __name__ == "__main__":
    sys.exit(main())
