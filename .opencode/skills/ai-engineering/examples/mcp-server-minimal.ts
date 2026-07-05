import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "weather-server",
  version: "1.0.0",
});

interface WeatherData {
  location: string;
  temperature: number;
  unit: string;
  conditions: string;
}

async function fetchWeather(location: string, unit: string): Promise<WeatherData> {
  const temps: Record<string, number> = {
    "new york": 22,
    london: 15,
    tokyo: 28,
    sydney: 18,
  };
  const base = temps[location.toLowerCase()] ?? 20;
  const temperature = unit === "fahrenheit" ? base * 1.8 + 32 : base;

  return {
    location,
    temperature,
    unit,
    conditions: "partly cloudy",
  };
}

server.tool(
  "get_weather",
  "Get current weather for a location",
  {
    location: z.string().describe("City name"),
    unit: z.enum(["celsius", "fahrenheit"]).default("celsius").describe("Temperature unit"),
  },
  async ({ location, unit }) => {
    const data = await fetchWeather(location, unit);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
