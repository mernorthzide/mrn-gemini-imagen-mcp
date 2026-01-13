import { GeminiClient } from "../services/geminiClient.js";
import { FileManager } from "../utils/fileManager.js";
import {
  GenerateImageInput,
  ToolResult,
  VALID_ASPECT_RATIOS,
} from "../types.js";

/**
 * Generate an image from a text prompt
 */
export async function generateImage(
  input: GenerateImageInput,
  client: GeminiClient,
  fileManager: FileManager
): Promise<ToolResult> {
  // Validate input
  if (!input.prompt || input.prompt.trim() === "") {
    return {
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "Prompt is required and cannot be empty",
      },
    };
  }

  // Validate aspect ratio if provided
  if (input.aspectRatio && !VALID_ASPECT_RATIOS.includes(input.aspectRatio)) {
    return {
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: `Invalid aspect ratio. Valid options: ${VALID_ASPECT_RATIOS.join(", ")}`,
      },
    };
  }

  try {
    // Create content for the request
    const content = client.createTextContent(input.prompt);

    // Call Gemini API (aspectRatio is optional - if not provided, Gemini will auto-select)
    const response = await client.generateContent([content], input.aspectRatio);

    // Check for API errors
    if (response.error) {
      return {
        success: false,
        error: {
          code: "API_ERROR",
          message: response.error.message,
          reason: response.error.status,
        },
      };
    }

    // Check for safety blocks
    const safetyCheck = client.checkSafetyBlock(response);
    if (safetyCheck.blocked) {
      return {
        success: false,
        error: {
          code: "SAFETY_BLOCKED",
          message: "Content was blocked by safety filters",
          reason: safetyCheck.reason,
        },
      };
    }

    // Extract image from response
    const imageResult = client.extractImageFromResponse(response);
    if (!imageResult) {
      return {
        success: false,
        error: {
          code: "API_ERROR",
          message: "No image was generated in the response",
        },
      };
    }

    // Save the image
    const filePath = fileManager.saveImage(
      imageResult.imageData,
      imageResult.mimeType,
      input.prompt,
      input.outputPath
    );

    return {
      success: true,
      filePath,
      message: imageResult.text || "Image generated successfully",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      success: false,
      error: {
        code: "API_ERROR",
        message: errorMessage,
      },
    };
  }
}
