# mrn-gemini-imagen-mcp

MCP (Model Context Protocol) server for generating and editing images using Google Gemini API.

## Features

- **Text-to-Image Generation**: Generate images from text descriptions
- **Image Editing**: Modify existing images based on text prompts
- **Multi-turn Iteration**: Refine images through conversational editing sessions
- **Configurable Aspect Ratios**: Support for 10 different aspect ratios
- **Flexible Model Selection**: Use any Gemini image model via configuration

## Prerequisites

- Node.js >= 18.0.0
- Google Gemini API Key (get one from [Google AI Studio](https://aistudio.google.com/app/apikey))

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/mrn-gemini-imagen-mcp.git
cd mrn-gemini-imagen-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

Set the following environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | - | Your Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.5-flash-image` | Gemini model to use |
| `GEMINI_OUTPUT_DIR` | No | `./generated_images` | Output directory for images |

### Supported Models

- `gemini-2.5-flash-image` (default, stable)
- `gemini-3-pro-image-preview` (latest, preview)

### Supported Aspect Ratios

`1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`

> **Note:** Aspect ratio is optional. If not specified, Gemini will automatically select the best aspect ratio based on your prompt.

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "gemini-imagen": {
      "command": "node",
      "args": ["/path/to/mrn-gemini-imagen-mcp/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here",
        "GEMINI_MODEL": "gemini-2.5-flash-image"
      }
    }
  }
}
```

> **Tip:** Change `GEMINI_MODEL` to `gemini-3-pro-image-preview` for the latest model.

## Tools

### 1. `generate_image`

Generate an image from a text description.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Description of the image to generate |
| `aspectRatio` | string | No | Aspect ratio (auto-selected by Gemini if not provided) |
| `outputPath` | string | No | Custom output file path |

**Example:**
```json
{
  "prompt": "A serene Japanese garden with a koi pond and cherry blossoms",
  "aspectRatio": "16:9"
}
```

**Response:**
```json
{
  "success": true,
  "filePath": "/path/to/a_serene_japanese_garden_1705123456789.png",
  "message": "Image generated successfully"
}
```

### 2. `edit_image`

Edit an existing image based on a text prompt.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `imagePath` | string | Yes | Path to the image to edit |
| `prompt` | string | Yes | Instructions for editing |
| `aspectRatio` | string | No | Aspect ratio for output |
| `outputPath` | string | No | Custom output file path |

**Example:**
```json
{
  "imagePath": "/path/to/original.png",
  "prompt": "Change the sky to a beautiful sunset with orange and pink colors"
}
```

### 3. `iterate_image`

Iteratively refine an image through multi-turn conversation.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Instructions for this iteration |
| `sessionId` | string | No | Session ID from previous iteration |
| `imagePath` | string | Conditional | Required when starting new session |
| `aspectRatio` | string | No | Aspect ratio for output |

**Starting a new session:**
```json
{
  "imagePath": "/path/to/original.png",
  "prompt": "Add a rainbow in the background"
}
```

**Response:**
```json
{
  "success": true,
  "filePath": "/path/to/add_a_rainbow_1705123456789.png",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Image iteration completed. Use the same sessionId to continue editing."
}
```

**Continuing the session:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "prompt": "Make the rainbow more vibrant and add some birds"
}
```

## Error Handling

All tools return structured error responses when something goes wrong:

```json
{
  "success": false,
  "error": {
    "code": "SAFETY_BLOCKED",
    "message": "Content was blocked by safety filters",
    "reason": "HARM_CATEGORY_DANGEROUS_CONTENT"
  }
}
```

**Error Codes:**
| Code | Description |
|------|-------------|
| `SAFETY_BLOCKED` | Content blocked by safety filters |
| `API_ERROR` | Error from Gemini API |
| `INVALID_INPUT` | Invalid input parameters |
| `FILE_ERROR` | File read/write error |

## Development

```bash
# Watch mode for development
npm run dev

# Build for production
npm run build

# Run the server directly
npm start
```

## File Structure

```
mrn-gemini-imagen-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── types.ts              # TypeScript types and constants
│   ├── services/
│   │   └── geminiClient.ts   # Gemini API wrapper
│   ├── tools/
│   │   ├── generateImage.ts  # Text-to-image tool
│   │   ├── editImage.ts      # Image editing tool
│   │   └── iterateImage.ts   # Multi-turn iteration tool
│   └── utils/
│       ├── fileManager.ts    # File operations
│       └── sessionManager.ts # Session management
├── dist/                     # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT

## Acknowledgments

- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [Model Context Protocol](https://modelcontextprotocol.io/)
