import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

function createMcpServer() {
  const server = new McpServer({
    name: "nextjs-js-mcp",
    version: "1.0.0",
  });

  // Tool 1: Get Project Stats
  server.tool(
    "get_project_stats",
    "Fetches live summary metrics from the Next.js application",
    {
      entity: z.enum(["users", "orders", "tickets"]).describe("Entity to count"),
    },
    async ({ entity }) => {
      const mockCounts = { users: 142, orders: 58, tickets: 12 };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ entity, count: mockCounts[entity] }, null, 2),
          },
        ],
      };
    }
  );

  // Tool 2: Verify Auth Config
  server.tool(
    "verify_auth_config",
    "Checks if authentication environment variables and basic secret configurations are present",
    {},
    async () => {
      const hasSecret = Boolean(process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              authenticationConfigured: hasSecret,
              authProvider: process.env.NEXTAUTH_SECRET ? "NextAuth / Auth.js" : "Custom JWT",
            }, null, 2),
          },
        ],
      };
    }
  );

  // Tool 3: Read Source Code Files
  server.tool(
    "read_source_file",
    "Reads the contents of a source code file from the project directory",
    {
      filePath: z.string().describe("Relative path to the file from project root (e.g., app/api/auth/[...nextauth]/route.js or middleware.js)"),
    },
    async ({ filePath }) => {
      try {
        // Resolve path securely against the current working directory (project root)
        const absolutePath = path.resolve(process.cwd(), filePath);
        
        // Security check: ensure path stays within the project root
        if (!absolutePath.startsWith(process.cwd())) {
          return {
            isError: true,
            content: [{ type: "text", text: "Access denied: Invalid file path." }],
          };
        }

        const fileContent = await fs.readFile(absolutePath, "utf-8");
        return {
          content: [
            {
              type: "text",
              text: fileContent,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to read file: ${error.message}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

async function handleMcpRequest(req) {
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  return transport.handleRequest(req);
}

export const POST = handleMcpRequest;
export const GET = handleMcpRequest;
export const DELETE = handleMcpRequest;