#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { GeminiClient } from "./services/geminiClient.js";
import { FileManager } from "./utils/fileManager.js";
import { SessionManager } from "./utils/sessionManager.js";
import { generateImage } from "./tools/generateImage.js";
import { editImage } from "./tools/editImage.js";
import { iterateImage } from "./tools/iterateImage.js";
import {
  GeminiConfig,
  GenerateImageInput,
  EditImageInput,
  IterateImageInput,
  DEFAULT_CONFIG,
  VALID_ASPECT_RATIOS,
} from "./types.js";

// ============================================
// Configuration
// ============================================

function getConfig(): GeminiConfig {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is required");
    process.exit(1);
  }

  return {
    apiKey,
    model: process.env.GEMINI_MODEL || DEFAULT_CONFIG.model,
    outputDirectory:
      process.env.GEMINI_OUTPUT_DIR || DEFAULT_CONFIG.outputDirectory,
  };
}

// ============================================
// Tool Definitions
// ============================================

const TOOLS: Tool[] = [
  {
    name: "generate_image",
    description:
      "Generate an image from a text description using Google Gemini. Returns the file path of the generated image.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "A detailed description of the image you want to generate",
        },
        aspectRatio: {
          type: "string",
          enum: VALID_ASPECT_RATIOS,
          description: `Optional aspect ratio for the generated image. If not provided, Gemini will auto-select based on the prompt. Options: ${VALID_ASPECT_RATIOS.join(", ")}`,
        },
        outputPath: {
          type: "string",
          description:
            "Optional custom file path for saving the image. If not provided, uses auto-generated filename in output directory.",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "edit_image",
    description:
      "Edit an existing image based on a text prompt using Google Gemini. Useful for modifying specific parts of an image while preserving others.",
    inputSchema: {
      type: "object",
      properties: {
        imagePath: {
          type: "string",
          description: "Path to the image file to edit",
        },
        prompt: {
          type: "string",
          description:
            "Instructions for how to edit the image (e.g., 'Change the sky to sunset colors' or 'Add a cat in the foreground')",
        },
        aspectRatio: {
          type: "string",
          enum: VALID_ASPECT_RATIOS,
          description: `Optional aspect ratio for the output image. If not provided, Gemini will auto-select. Options: ${VALID_ASPECT_RATIOS.join(", ")}`,
        },
        outputPath: {
          type: "string",
          description: "Optional custom file path for saving the edited image",
        },
      },
      required: ["imagePath", "prompt"],
    },
  },
  {
    name: "iterate_image",
    description:
      "Iteratively refine an image through multi-turn conversation. Start a new session with an image, or continue an existing session to make incremental adjustments.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: {
          type: "string",
          description:
            "Session ID from a previous iteration. Omit to start a new session.",
        },
        imagePath: {
          type: "string",
          description:
            "Path to the initial image. Required when starting a new session (no sessionId provided).",
        },
        prompt: {
          type: "string",
          description:
            "Instructions for the current iteration (e.g., 'Make the colors warmer' or 'Add more detail to the background')",
        },
        aspectRatio: {
          type: "string",
          enum: VALID_ASPECT_RATIOS,
          description: `Optional aspect ratio for the output image. If not provided, Gemini will auto-select. Options: ${VALID_ASPECT_RATIOS.join(", ")}`,
        },
      },
      required: ["prompt"],
    },
  },
];

// ============================================
// Server Setup
// ============================================

async function main() {
  const config = getConfig();

  // Initialize services
  const geminiClient = new GeminiClient({
    apiKey: config.apiKey,
    model: config.model,
  });
  const fileManager = new FileManager(config.outputDirectory);
  const sessionManager = new SessionManager();

  // Create MCP server
  const server = new Server(
    {
      name: "mrn-gemini-imagen-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "generate_image": {
          const input = args as unknown as GenerateImageInput;
          const result = await generateImage(input, geminiClient, fileManager);

          if (result.success) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: true,
                      filePath: result.filePath,
                      message: result.message,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
              isError: true,
            };
          }
        }

        case "edit_image": {
          const input = args as unknown as EditImageInput;
          const result = await editImage(input, geminiClient, fileManager);

          if (result.success) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: true,
                      filePath: result.filePath,
                      message: result.message,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
              isError: true,
            };
          }
        }

        case "iterate_image": {
          const input = args as unknown as IterateImageInput;
          const result = await iterateImage(
            input,
            geminiClient,
            fileManager,
            sessionManager
          );

          if (result.success) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: true,
                      filePath: result.filePath,
                      sessionId: result.sessionId,
                      message: result.message,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2),
                },
              ],
              isError: true,
            };
          }
        }

        default:
          return {
            content: [
              {
                type: "text",
                text: `Unknown tool: ${name}`,
              },
            ],
            isError: true,
          };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: {
                  code: "API_ERROR",
                  message: errorMessage,
                },
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Gemini Image MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
