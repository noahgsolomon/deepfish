import { uploadToBlob } from "~/server/api/routers/upload";

// Upload output from Replicate/FAL to our storage
export async function uploadOutputToStorage(
  outputUrl: string,
  workflowName: string,
  outputType: string,
): Promise<string> {
  try {
    console.log(`Uploading output to storage: ${outputUrl}`);

    // Download the file from the original URL
    const response = await fetch(outputUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch output: ${response.statusText}`);
    }

    // Get the array buffer from the response
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type from response or map from outputType
    let contentType =
      response.headers.get("content-type") || "application/octet-stream";

    // If content type is generic, try to determine from outputType
    if (contentType === "application/octet-stream") {
      switch (outputType) {
        case "image":
          contentType = "image/png"; // Default to PNG for images
          break;
        case "video":
          contentType = "video/mp4"; // Default to MP4 for videos
          break;
        case "audio":
          contentType = "audio/mpeg"; // Default to MP3 for audio
          break;
        case "3d":
          contentType = "model/gltf-binary"; // Default for 3D models
          break;
      }
    }

    // Convert buffer to base64 data URL
    const base64 = `data:${contentType};base64,${buffer.toString("base64")}`;

    // Upload directly to blob storage
    const { url } = await uploadToBlob({
      base64: base64,
      flowId: `${workflowName}-${Date.now()}`, // Unique ID for each output
      folder: "outputs",
      contentType: contentType,
    });

    console.log("Successfully uploaded output to CDN:", url);
    return url;
  } catch (err) {
    console.error("Failed to upload output to storage:", err);
    // Fallback to original URL
    console.log("Falling back to original URL:", outputUrl);
    return outputUrl;
  }
}

// Helper to handle array outputs
export async function uploadOutputsToStorage(
  outputs: string | string[],
  workflowName: string,
  outputType: string,
): Promise<string | string[]> {
  if (Array.isArray(outputs)) {
    console.log(`Uploading ${outputs.length} outputs to storage...`);
    const uploadedUrls = await Promise.all(
      outputs.map((url) =>
        uploadOutputToStorage(url, workflowName, outputType),
      ),
    );
    return uploadedUrls;
  } else {
    return uploadOutputToStorage(outputs, workflowName, outputType);
  }
}
