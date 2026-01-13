import {
  GeminiConfig,
  GeminiRequest,
  GeminiResponse,
  Content,
  AspectRatio,
  DEFAULT_CONFIG,
} from "../types.js";

export class GeminiClient {
  private apiKey: string;
  private model: string;
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  constructor(config: Partial<GeminiConfig> & { apiKey: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || DEFAULT_CONFIG.model;
  }

  /**
   * Generate content (text and/or images) from the Gemini API
   */
  async generateContent(
    contents: Content[],
    aspectRatio?: AspectRatio
  ): Promise<GeminiResponse> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent`;

    const request: GeminiRequest = {
      contents,
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        ...(aspectRatio && {
          imageConfig: {
            aspectRatio,
          },
        }),
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(request),
      });

      const data = (await response.json()) as GeminiResponse;

      if (!response.ok) {
        return {
          error: {
            code: response.status,
            message: data.error?.message || "Unknown API error",
            status: data.error?.status || "ERROR",
          },
        };
      }

      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        error: {
          code: 500,
          message: errorMessage,
          status: "INTERNAL_ERROR",
        },
      };
    }
  }

  /**
   * Create content with text prompt only
   */
  createTextContent(prompt: string): Content {
    return {
      role: "user",
      parts: [{ text: prompt }],
    };
  }

  /**
   * Create content with text and image
   */
  createImageContent(prompt: string, imageBase64: string, mimeType: string): Content {
    return {
      role: "user",
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        },
      ],
    };
  }

  /**
   * Extract image data from response
   */
  extractImageFromResponse(response: GeminiResponse): {
    imageData: string;
    mimeType: string;
    text?: string;
  } | null {
    if (!response.candidates || response.candidates.length === 0) {
      return null;
    }

    const candidate = response.candidates[0];
    let imageData: string | undefined;
    let mimeType: string | undefined;
    let text: string | undefined;

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType;
      }
      if (part.text) {
        text = part.text;
      }
    }

    if (!imageData || !mimeType) {
      return null;
    }

    return { imageData, mimeType, text };
  }

  /**
   * Check if response was blocked by safety filters
   */
  checkSafetyBlock(response: GeminiResponse): {
    blocked: boolean;
    reason?: string;
  } {
    // Check prompt feedback for blocks
    if (response.promptFeedback?.blockReason) {
      return {
        blocked: true,
        reason: response.promptFeedback.blockReason,
      };
    }

    // Check candidate safety ratings
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];

      if (candidate.finishReason === "SAFETY") {
        const blockedRatings = candidate.safetyRatings?.filter(
          (rating) => rating.blocked
        );
        if (blockedRatings && blockedRatings.length > 0) {
          return {
            blocked: true,
            reason: blockedRatings.map((r) => r.category).join(", "),
          };
        }
        return {
          blocked: true,
          reason: "Content blocked by safety filters",
        };
      }
    }

    return { blocked: false };
  }

  /**
   * Update the model being used
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }
}
