SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

# One entry point. uv owns the interpreter and the lockfile; `make setup` syncs.
ZARA ?= uv run --project scripts --no-sync --quiet zara-cli

F ?=
ARGS ?=

.PHONY: help setup init sync lock test check e2e vcr verify-feature check-arch clean-check session-start session-end feature doctor audit harness dev

help:
	@$(ZARA) --help

setup:
	@uv sync --project scripts

sync:
	@uv sync --project scripts

lock:
	@uv lock --project scripts

init:
	@$(ZARA) init

test:
	@$(ZARA) test

check:
	@$(ZARA) check

e2e:
	@$(ZARA) e2e

verify-feature:
	@test -n "$(F)" || { echo "usage: make verify-feature F=<id>"; exit 2; }
	@$(ZARA) verify "$(F)"

vcr:
	@$(ZARA) vcr

check-arch:
	@$(ZARA) arch

clean-check:
	@$(ZARA) clean-check

session-start:
	@$(ZARA) session start

session-end:
	@$(ZARA) session end

feature:
	@$(ZARA) feature $(ARGS)

doctor:
	@$(ZARA) doctor

audit:
	@$(ZARA) audit

harness:
	@$(ZARA) harness $(ARGS)

dev:
	@opencode
