"""Feature list commands: read state, and the two allowed transitions."""
from __future__ import annotations

import argparse

from .. import console
from ..context import Context
from ..features import FeatureError, FeatureStore
from ..result import Report


def list_features(ctx: Context, args: argparse.Namespace) -> int:
    store = FeatureStore.load(ctx)
    features = sorted(store.all(), key=lambda f: f.priority)
    for feature in features:
        print(f"{feature.id}  {feature.state:<8} {feature.priority:>2}  {feature.title}")
    counts: dict[str, int] = {}
    for feature in features:
        counts[feature.state] = counts.get(feature.state, 0) + 1
    summary = ", ".join(f"{state}={count}" for state, count in sorted(counts.items()))
    console.info(summary)
    return 0


def next_feature(ctx: Context, args: argparse.Namespace) -> int:
    store = FeatureStore.load(ctx)
    feature = store.next_planned()
    if feature is None:
        console.info("no planned feature")
        return 0
    print(f"{feature.id} {feature.title}")
    return 0


def layers(ctx: Context, args: argparse.Namespace) -> int:
    store = FeatureStore.load(ctx)
    try:
        feature = store.get(args.id)
    except FeatureError as exc:
        console.fail(str(exc))
        return 2
    for layer in feature.layers:
        print(f"{layer.label}\t{layer.cmd}\t{layer.repair}")
    return 0


def activate(ctx: Context, args: argparse.Namespace) -> int:
    store = FeatureStore.load(ctx)
    try:
        feature = store.activate(args.id)
    except FeatureError as exc:
        console.fail(str(exc))
        return 1
    console.ok(f"{feature.id} -> active")
    return 0


def pass_feature(ctx: Context, args: argparse.Namespace) -> int:
    console.fail("state is written only by the gate")
    print("WHY : a hand-written passing state is not evidence.")
    print("FIX : run: zara-cli verify " + args.id)
    return 2


def block_feature(ctx: Context, args: argparse.Namespace) -> int:
    if not args.note:
        console.fail("a blocked feature needs a note")
        print("FIX : zara-cli feature block <id> --note '<what blocks it and what would unblock it>'")
        return 2
    store = FeatureStore.load(ctx)
    try:
        feature = store.block(args.id, args.note)
    except FeatureError as exc:
        console.fail(str(exc))
        return 2
    console.ok(f"{feature.id} -> blocked")
    return 0


def check_features(ctx: Context, args: argparse.Namespace) -> int:
    store = FeatureStore.load(ctx)
    report = Report("feature state")
    report.add(*store.check())
    return report.emit()
