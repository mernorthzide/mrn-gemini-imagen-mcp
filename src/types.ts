// ============================================
// Gemini API Types
// ============================================

export type AspectRatio =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "9:16"
  | "16:9"
  | "21:9";

export interface GeminiConfig {
  apiKey: string;
  model: string;
  outputDirectory: string;
}

export interface ImageConfig {
  aspectRatio?: AspectRatio;
}

export interface GenerationConfig {
  responseModalities: string[];
  imageConfig?: ImageConfig;
}

export interface InlineData {
  mimeType: string;
  data: string;
}

export interface ContentPart {
  text?: string;
  inlineData?: InlineData;
}

export interface Content {
  role?: string;
  parts: ContentPart[];
}

export interface GeminiRequest {
  contents: Content[];
  generationConfig: GenerationConfig;
}

export interface GeminiResponsePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiCandidate {
  content: {
    parts: GeminiResponsePart[];
    role: string;
  };
  finishReason: string;
  safetyRatings?: SafetyRating[];
}

export interface SafetyRating {
  category: string;
  probability: string;
  blocked?: boolean;
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: SafetyRating[];
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

// ============================================
// Tool Input/Output Types
// ============================================

export interface GenerateImageInput {
  prompt: string;
  aspectRatio?: AspectRatio;
  outputPath?: string;
}

export interface EditImageInput {
  imagePath: string;
  prompt: string;
  aspectRatio?: AspectRatio;
  outputPath?: string;
}

export interface IterateImageInput {
  sessionId?: string;
  imagePath?: string;
  prompt: string;
  aspectRatio?: AspectRatio;
}

export interface ToolSuccessResult {
  success: true;
  filePath: string;
  message?: string;
  sessionId?: string;
}

export interface ToolErrorResult {
  success: false;
  error: {
    code: "SAFETY_BLOCKED" | "API_ERROR" | "INVALID_INPUT" | "FILE_ERROR";
    message: string;
    reason?: string;
  };
}

export type ToolResult = ToolSuccessResult | ToolErrorResult;

// ============================================
// Session Types
// ============================================

export interface Session {
  id: string;
  history: Content[];
  lastImagePath: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Constants
// ============================================

export const VALID_ASPECT_RATIOS: AspectRatio[] = [
  "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"
];

export const DEFAULT_CONFIG: Omit<GeminiConfig, 'apiKey'> = {
  model: "gemini-3-pro-image-preview",
  outputDirectory: "./generated_images"
};
