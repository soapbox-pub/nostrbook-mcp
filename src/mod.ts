import { FastMCP } from "@glama/fastmcp";
import { z } from "zod";

// Execute a nostrbook task and capture stdout
async function execNostrbook(taskName: string, ...args: string[]): Promise<string> {
  const cmd = new Deno.Command("deno", {
    args: ["task", taskName, ...args],
    cwd: "./nostrbook",
    stdout: "piped",
    stderr: "piped",
  });

  try {
    const output = await cmd.output();
    if (!output.success) {
      const error = new TextDecoder().decode(output.stderr);
      throw new Error(error);
    }
    return new TextDecoder().decode(output.stdout);
  } catch (error) {
    // Log the error to stderr but return empty content
    console.error(error);
    return "";
  }
}

const server = new FastMCP({
  name: "nostr-mcp",
  version: "0.1.0",
});

server.addTool({
  name: "read_nip",
  description: "Read a specific NIP using nostrbook's tooling",
  parameters: z.object({
    number: z.number().describe("NIP number to retrieve"),
  }),
  execute: async (args) => {
    const nipNumber = args.number.toString().padStart(2, "0");
    const content = await execNostrbook("read_nip", nipNumber);
    return JSON.stringify({ 
      number: args.number,
      content: content || `Failed to read NIP-${args.number}`
    }, null, 2);
  },
});

server.addTool({
  name: "read_tag",
  description: "Read documentation about a specific tag using nostrbook's tooling",
  parameters: z.object({
    name: z.string().describe("Tag name to retrieve"),
  }),
  execute: async (args) => {
    const content = await execNostrbook("read_tag", args.name);
    return JSON.stringify({ 
      name: args.name,
      content: content || `Failed to read tag ${args.name}`
    }, null, 2);
  },
});

server.addTool({
  name: "read_kind",
  description: "Read documentation about a specific event kind using nostrbook's tooling",
  parameters: z.object({
    number: z.number().describe("Kind number to retrieve"),
  }),
  execute: async (args) => {
    const content = await execNostrbook("read_kind", args.number.toString());
    return JSON.stringify({ 
      number: args.number,
      content: content || `Failed to read kind ${args.number}`
    }, null, 2);
  },
});

server.addTool({
  name: "read_protocol",
  description: "Read general protocol documentation using nostrbook's tooling",
  parameters: z.object({}),
  execute: async () => {
    const content = await execNostrbook("read_protocol");
    return JSON.stringify({ 
      content: content || "Failed to read protocol documentation"
    }, null, 2);
  },
});

server.addTool({
  name: "read_nips_index",
  description: "Read the NIPs index using nostrbook's tooling",
  parameters: z.object({}),
  execute: async () => {
    const content = await execNostrbook("read_nips_index");
    return JSON.stringify({ 
      content: content || "Failed to read NIPs index"
    }, null, 2);
  },
});

server.start({
  transportType: "stdio",
});