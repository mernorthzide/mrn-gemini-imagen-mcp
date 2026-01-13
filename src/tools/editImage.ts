import { GeminiClient } from "../services/geminiClient.js";
import { FileManager } from "../utils/fileManager.js";
import {
  EditImageInput,
  ToolResult,
  VALID_ASPECT_RATIOS,
} from "../types.js";

/**
 * Edit an existing image based on a text prompt
 */
export async function editImage(
  input: EditImageInput,
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

  if (!input.imagePath || input.imagePath.trim() === "") {
    return {
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "Image path is required",
      },
    };
  }

  // Validate the image file
  const fileValidation = fileManager.validateImageFile(input.imagePath);
  if (!fileValidation.valid) {
    return {
      success: false,
      error: {
        code: "FILE_ERROR",
        message: fileValidation.error || "Invalid image file",
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
    // Read the input image
    const imageData = fileManager.readImageAsBase64(input.imagePath);

    // Create content with image and prompt
    const content = client.createImageContent(
      input.prompt,
      imageData.data,
      imageData.mimeType
    );

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

    // Save the edited image
    const filePath = fileManager.saveImage(
      imageResult.imageData,
      imageResult.mimeType,
      input.prompt,
      input.outputPath
    );

    return {
      success: true,
      filePath,
      message: imageResult.text || "Image edited successfully",
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
