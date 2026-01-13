import * as fs from "fs";
import * as path from "path";

/**
 * Manages file operations for generated images
 */
export class FileManager {
  private outputDirectory: string;

  constructor(outputDirectory: string = "./generated_images") {
    this.outputDirectory = outputDirectory;
  }

  /**
   * Ensure the output directory exists
   */
  ensureDirectory(dirPath?: string): void {
    const targetDir = dirPath || this.outputDirectory;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  /**
   * Generate a filename from prompt and timestamp
   * Format: {prompt_summary}_{timestamp}.png
   */
  generateFilename(prompt: string, mimeType: string): string {
    // Extract extension from mime type
    const extension = this.getExtensionFromMimeType(mimeType);

    // Create prompt summary (first few words, sanitized)
    const summary = this.createPromptSummary(prompt);

    // Add timestamp
    const timestamp = Date.now();

    return `${summary}_${timestamp}.${extension}`;
  }

  /**
   * Create a sanitized summary from prompt
   */
  private createPromptSummary(prompt: string): string {
    // Take first 50 characters or 5 words, whichever is shorter
    const words = prompt.split(/\s+/).slice(0, 5);
    let summary = words.join("_");

    // Truncate if too long
    if (summary.length > 50) {
      summary = summary.substring(0, 50);
    }

    // Sanitize: remove special characters, replace spaces with underscores
    summary = summary
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    // Ensure we have something
    if (!summary) {
      summary = "generated_image";
    }

    return summary;
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/webp": "webp",
      "image/gif": "gif",
    };

    return mimeToExt[mimeType] || "png";
  }

  /**
   * Save base64 image data to file
   */
  saveImage(
    imageBase64: string,
    mimeType: string,
    prompt: string,
    customPath?: string
  ): string {
    let filePath: string;

    if (customPath) {
      // Use custom path if provided
      const dir = path.dirname(customPath);
      this.ensureDirectory(dir);
      filePath = customPath;
    } else {
      // Generate filename and use default directory
      this.ensureDirectory();
      const filename = this.generateFilename(prompt, mimeType);
      filePath = path.join(this.outputDirectory, filename);
    }

    // Decode base64 and save
    const buffer = Buffer.from(imageBase64, "base64");
    fs.writeFileSync(filePath, buffer);

    // Return absolute path
    return path.resolve(filePath);
  }

  /**
   * Read image file and return as base64
   */
  readImageAsBase64(imagePath: string): { data: string; mimeType: string } {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    const buffer = fs.readFileSync(imagePath);
    const base64 = buffer.toString("base64");
    const mimeType = this.getMimeTypeFromPath(imagePath);

    return { data: base64, mimeType };
  }

  /**
   * Get MIME type from file path
   */
  private getMimeTypeFromPath(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const extToMime: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
      heic: "image/heic",
      heif: "image/heif",
    };

    return extToMime[ext] || "image/png";
  }

  /**
   * Validate if file exists and is an image
   */
  validateImageFile(filePath: string): { valid: boolean; error?: string } {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: `File not found: ${filePath}` };
    }

    const ext = path.extname(filePath).toLowerCase();
    const validExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic", ".heif"];

    if (!validExtensions.includes(ext)) {
      return {
        valid: false,
        error: `Invalid image format. Supported: ${validExtensions.join(", ")}`,
      };
    }

    // Check file size (max 7MB for inline)
    const stats = fs.statSync(filePath);
    const maxSize = 7 * 1024 * 1024; // 7MB

    if (stats.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size is 7MB, got ${(stats.size / 1024 / 1024).toFixed(2)}MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Update output directory
   */
  setOutputDirectory(directory: string): void {
    this.outputDirectory = directory;
  }

  /**
   * Get current output directory
   */
  getOutputDirectory(): string {
    return this.outputDirectory;
  }
}
