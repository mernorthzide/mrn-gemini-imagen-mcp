import { GeminiClient } from "../services/geminiClient.js";
import { FileManager } from "../utils/fileManager.js";
import { SessionManager } from "../utils/sessionManager.js";
import {
  IterateImageInput,
  ToolResult,
  ToolSuccessResult,
  VALID_ASPECT_RATIOS,
  Content,
} from "../types.js";

/**
 * Iteratively edit an image through multi-turn conversation
 */
export async function iterateImage(
  input: IterateImageInput,
  client: GeminiClient,
  fileManager: FileManager,
  sessionManager: SessionManager
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
    let sessionId = input.sessionId;
    let contents: Content[];

    if (sessionId && sessionManager.hasSession(sessionId)) {
      // Continue existing session
      const history = sessionManager.getHistory(sessionId);
      const lastImagePath = sessionManager.getLastImagePath(sessionId);

      if (!history || !lastImagePath) {
        return {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Session exists but has no history or image",
          },
        };
      }

      // Read the last image from the session
      const imageData = fileManager.readImageAsBase64(lastImagePath);

      // Create new user content with the last image and new prompt
      const userContent = client.createImageContent(
        input.prompt,
        imageData.data,
        imageData.mimeType
      );

      // Build contents with history context (text only) + new request with image
      contents = [...history, userContent];
    } else {
      // Start new session - requires an image path
      if (!input.imagePath) {
        return {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message:
              "Image path is required when starting a new session. Provide imagePath for the initial image.",
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

      // Read the input image
      const imageData = fileManager.readImageAsBase64(input.imagePath);

      // Create initial content
      const userContent = client.createImageContent(
        input.prompt,
        imageData.data,
        imageData.mimeType
      );

      contents = [userContent];

      // Create new session
      sessionId = sessionManager.createSession(userContent, input.imagePath);
    }

    // Call Gemini API (aspectRatio is optional - if not provided, Gemini will auto-select)
    const response = await client.generateContent(contents, input.aspectRatio);

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
      input.prompt
    );

    // Update session with new turn
    const userContent = client.createTextContent(input.prompt);
    const assistantContent: Content = {
      role: "model",
      parts: [
        { text: imageResult.text || "Image generated" },
        {
          inlineData: {
            mimeType: imageResult.mimeType,
            data: imageResult.imageData,
          },
        },
      ],
    };

    sessionManager.addTurn(sessionId!, userContent, assistantContent, filePath);

    const result: ToolSuccessResult = {
      success: true,
      filePath,
      sessionId: sessionId!,
      message:
        imageResult.text ||
        "Image iteration completed. Use the same sessionId to continue editing.",
    };

    return result;
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
