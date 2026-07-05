"""ReAct agent loop with tool calling."""

import json
from dataclasses import dataclass
from typing import Any, Callable

import openai

ToolFn = Callable[[dict[str, Any]], str]


@dataclass
class Tool:
    name: str
    description: str
    parameters: dict[str, Any]
    fn: Callable[[dict[str, Any]], str]


def search_web(params: dict[str, Any]) -> str:
    query = params.get("query", "")
    return f"Search results for '{query}': [mock result 1, mock result 2]"


def calculator(params: dict[str, Any]) -> str:
    expression = params.get("expression", "")
    try:
        result = eval(expression, {"__builtins__": {}}, {})  # noqa: S307
        return str(result)
    except Exception as e:
        return f"Error: {e}"


TOOLS = [
    Tool(
        name="search",
        description="Search the web for information",
        parameters={"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]},
        fn=search_web,
    ),
    Tool(
        name="calculator",
        description="Evaluate a math expression",
        parameters={"type": "object", "properties": {"expression": {"type": "string"}}, "required": ["expression"]},
        fn=calculator,
    ),
]


def build_tool_schemas(tools: list[Tool]) -> list[dict[str, Any]]:
    return [
        {
            "type": "function",
            "function": {"name": t.name, "description": t.description, "parameters": t.parameters},
        }
        for t in tools
    ]


def react_loop(query: str, max_steps: int = 5) -> str:
    client = openai.OpenAI()
    tool_map = {t.name: t.fn for t in TOOLS}
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": "You are a helpful assistant. Use tools to answer questions."},
        {"role": "user", "content": query},
    ]

    for _ in range(max_steps):
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=build_tool_schemas(TOOLS),
            tool_choice="auto",
        )
        msg = response.choices[0].message
        messages.append(msg.model_dump())

        if not msg.tool_calls:
            return msg.content or ""

        for call in msg.tool_calls:
            fn = tool_map.get(call.function.name)
            if fn is None:
                result = f"Unknown tool: {call.function.name}"
            else:
                args = json.loads(call.function.arguments)
                result = fn(args)
            messages.append({"role": "tool", "tool_call_id": call.id, "content": result})

    return "Max steps reached without final answer."


if __name__ == "__main__":
    answer = react_loop("What is 42 * 17 + 3?")
    print(answer)
