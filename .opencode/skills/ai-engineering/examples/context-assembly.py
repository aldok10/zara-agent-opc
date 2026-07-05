"""Dynamic context assembly with priority-based selection."""

from dataclasses import dataclass, field
from enum import IntEnum


class Priority(IntEnum):
    CRITICAL = 0
    HIGH = 1
    MEDIUM = 2
    LOW = 3


@dataclass
class ContextItem:
    key: str
    content: str
    priority: Priority
    token_estimate: int = field(init=False)

    def __post_init__(self) -> None:
        self.token_estimate = len(self.content) // 4


@dataclass
class ContextBudget:
    max_tokens: int
    reserved_for_response: int = 1000

    @property
    def available(self) -> int:
        return self.max_tokens - self.reserved_for_response


def assemble_context(items: list[ContextItem], budget: ContextBudget) -> list[ContextItem]:
    sorted_items = sorted(items, key=lambda x: (x.priority, -x.token_estimate))
    selected: list[ContextItem] = []
    used_tokens = 0

    for item in sorted_items:
        if used_tokens + item.token_estimate <= budget.available:
            selected.append(item)
            used_tokens += item.token_estimate

    return selected


def format_context(items: list[ContextItem]) -> str:
    sections = []
    for item in items:
        sections.append(f"[{item.key}]\n{item.content}")
    return "\n\n---\n\n".join(sections)


def build_prompt(query: str, context_items: list[ContextItem], budget: ContextBudget) -> str:
    selected = assemble_context(context_items, budget)
    context_block = format_context(selected)
    total_tokens = sum(i.token_estimate for i in selected)
    return (
        f"Context ({total_tokens} tokens used / {budget.available} available):\n\n"
        f"{context_block}\n\n"
        f"Question: {query}"
    )


if __name__ == "__main__":
    items = [
        ContextItem(key="system-rules", content="You are a helpful assistant." * 10, priority=Priority.CRITICAL),
        ContextItem(key="user-profile", content="User prefers concise answers.", priority=Priority.HIGH),
        ContextItem(key="conversation-history", content="Previous messages..." * 50, priority=Priority.MEDIUM),
        ContextItem(key="knowledge-base", content="Documentation excerpt..." * 100, priority=Priority.LOW),
    ]

    budget = ContextBudget(max_tokens=4096)
    prompt = build_prompt("How do I deploy?", items, budget)
    print(prompt[:500])
