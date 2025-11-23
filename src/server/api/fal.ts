// ----------------------------------------------
// helpers/fal.ts
// ----------------------------------------------

import { deriveModalities } from "~/lib/modality";
import type { WorkflowInfo } from "~/server/db/schema";

// Helper to extract media URL from FAL response objects
function extractMediaUrl(obj: any, key: string): string | null {
  return obj?.[key]?.url || null;
}

// Helper to find schema by suffix
function findSchemaBySuffix(
  components: Record<string, any>,
  suffix: string,
): any | null {
  for (const [key, value] of Object.entries(components)) {
    if (key.toLowerCase().endsWith(suffix.toLowerCase())) {
      return value;
    }
  }
  return null;
}

// Helper to resolve $ref references
function resolveRef(refStr: string, components: any): any | null {
  const name = refStr.split("/").pop();
  return name ? components[name] || null : null;
}

// Recursively resolve schema references
function resolveSchemaReferences(schema: any, components: any): any {
  if (!schema || typeof schema !== "object") return schema;

  // Handle direct $ref
  if (schema.$ref && typeof schema.$ref === "string") {
    const resolved = resolveRef(schema.$ref, components);
    if (resolved) {
      return resolveSchemaReferences(resolved, components);
    }
  }

  // Handle allOf with single $ref
  if (
    schema.allOf &&
    Array.isArray(schema.allOf) &&
    schema.allOf.length === 1
  ) {
    const ref = schema.allOf[0].$ref;
    if (ref && typeof ref === "string") {
      const resolved = resolveRef(ref, components);
      if (resolved) {
        return resolveSchemaReferences(resolved, components);
      }
    }
  }

  // Recursively resolve properties
  const result = { ...schema };
  if (result.properties && typeof result.properties === "object") {
    const resolvedProps: Record<string, any> = {};
    for (const [key, value] of Object.entries(result.properties)) {
      resolvedProps[key] = resolveSchemaReferences(value, components);
    }
    result.properties = resolvedProps;
  }

  return result;
}

// Convert x-fal-order-properties to x-order on each property
function applyXOrder(schema: any): void {
  if (!schema || typeof schema !== "object") return;

  // Handle x-fal-order-properties
  if (
    schema["x-fal-order-properties"] &&
    Array.isArray(schema["x-fal-order-properties"])
  ) {
    const orderArray = schema["x-fal-order-properties"];

    if (schema.properties && typeof schema.properties === "object") {
      orderArray.forEach((propName: string, idx: number) => {
        if (schema.properties[propName]) {
          schema.properties[propName]["x-order"] = idx;
        }
      });
    }

    delete schema["x-fal-order-properties"];
  }

  // Reorder properties: required first, then optional
  if (schema.properties && schema.required && Array.isArray(schema.required)) {
    const requiredSet = new Set(schema.required);
    const props = Object.entries(schema.properties);

    const required: [string, any][] = [];
    const optional: [string, any][] = [];

    for (const [key, value] of props) {
      if (requiredSet.has(key)) {
        required.push([key, value]);
      } else {
        optional.push([key, value]);
      }
    }

    // Sort by existing x-order if present
    const sortByOrder = (a: [string, any], b: [string, any]) => {
      const aOrder = a[1]["x-order"] ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b[1]["x-order"] ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    };

    required.sort(sortByOrder);
    optional.sort(sortByOrder);

    // Reassign x-order
    let idx = 0;
    [...required, ...optional].forEach(([key]) => {
      if (schema.properties[key]) {
        schema.properties[key]["x-order"] = idx++;
      }
    });
  }
}

// Set format="uri" for string properties with "url" in the name
function applyUrlFormat(schema: any): void {
  if (!schema?.properties || typeof schema.properties !== "object") return;

  for (const [key, value] of Object.entries(schema.properties)) {
    if (
      key.toLowerCase().includes("url") &&
      typeof value === "object" &&
      (value as any).type === "string" &&
      !(value as any).format
    ) {
      (value as any).format = "uri";
    }
  }
}

// ----------------------------------------------
// fetchFalWorkflow – fetch FAL model definition
// ----------------------------------------------

export async function fetchFalWorkflow(
  modelUrl: string,
  apiToken: string,
): Promise<WorkflowInfo> {
  // Extract endpoint_id from URL
  // e.g. https://fal.ai/models/fal-ai/flux/schnell → fal-ai/flux/schnell
  const endpointId = modelUrl
    .replace(/^https?:\/\//, "")
    .replace(/^fal\.ai\//, "")
    .replace(/^models\//, "")
    .replace(/\/$/, "");

  // Build OpenAPI URL
  const openApiUrl = `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=${endpointId}`;

  // Fetch OpenAPI spec
  const headers: Record<string, string> = {};
  if (apiToken) {
    headers.Authorization = `Key ${apiToken}`;
  }

  const response = await fetch(openApiUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch FAL OpenAPI spec: ${response.statusText}`);
  }

  const spec = await response.json();
  // ----- extract high-level metadata ----------------------------
  const meta: any = spec?.info?.["x-fal-metadata"] ?? {};
  const thumbnailUrl: string | undefined = meta.thumbnailUrl;
  const playgroundUrl: string | undefined = meta.playgroundUrl;
  const category: string | undefined = meta.category;
  const components = spec.components?.schemas || {};

  // Extract Input/Output schemas
  let inputSchema = components.Input || findSchemaBySuffix(components, "Input");
  let outputSchema =
    components.Output || findSchemaBySuffix(components, "Output");

  // Fallback: try to find schemas from paths
  if (!inputSchema || !outputSchema) {
    const paths = spec.paths || {};

    for (const [path, pathObj] of Object.entries(paths)) {
      const pathData = pathObj as any;

      // Find output schema from GET response
      if (
        !outputSchema &&
        path.includes(endpointId) &&
        path.includes("requests/{request_id}")
      ) {
        const ref =
          pathData?.get?.responses?.["200"]?.content?.["application/json"]
            ?.schema?.$ref;
        if (ref) {
          outputSchema = resolveRef(ref, components);
        }
      }

      // Find input schema from POST request
      if (!inputSchema && path.endsWith(endpointId) && pathData?.post) {
        const ref =
          pathData.post?.requestBody?.content?.["application/json"]?.schema
            ?.$ref;
        if (ref) {
          inputSchema = resolveRef(ref, components);
        }
      }
    }
  }

  // Set defaults if still not found
  if (!inputSchema) {
    inputSchema = {
      type: "object",
      title: "Input",
      properties: {},
    };
  }

  if (!outputSchema) {
    outputSchema = {
      type: "string",
      format: "uri",
      title: "Output",
    };
  }

  // Resolve references and apply transformations
  inputSchema = resolveSchemaReferences(inputSchema, components);
  outputSchema = resolveSchemaReferences(outputSchema, components);

  applyXOrder(inputSchema);
  applyXOrder(outputSchema);
  applyUrlFormat(inputSchema);
  applyUrlFormat(outputSchema);

  // Extract example from input schema
  let example: Record<string, any> = inputSchema.example || {};

  // If no top-level example, build one from property examples
  if (Object.keys(example).length === 0 && inputSchema.properties) {
    const built: Record<string, any> = {};
    for (const [key, prop] of Object.entries(inputSchema.properties as any)) {
      if (
        Array.isArray((prop as any).examples) &&
        (prop as any).examples.length
      ) {
        built[key] = (prop as any).examples[0];
      }
    }
    example = built;
  }

  // Determine output type
  let outputType = "image";
  if (outputSchema.properties) {
    if (outputSchema.properties.video) {
      outputType = "video";
    } else if (outputSchema.properties.audio) {
      outputType = "audio";
    } else if (
      outputSchema.properties.image ||
      outputSchema.properties.images
    ) {
      // Support both singular "image" and plural "images" keys
      outputType = "image";
    } else {
      outputType = outputSchema.format === "uri" ? "image" : "text";
    }
  } else if (outputSchema.format === "uri") {
    outputType = "image";
  } else {
    outputType = "text";
  }

  // Clean up title (remove fal-ai/ prefix)
  let title = endpointId;
  if (title.toLowerCase().startsWith("fal-ai/")) {
    title = title.substring(7);
  }
  title = title.toUpperCase();

  const { inputTypes, inOutKey } = deriveModalities(inputSchema, outputType);

  // Build WorkflowInfo
  const workflow: WorkflowInfo = {
    id: 0, // this is set to 0 because we don't have a database yet
    title,
    description: (spec.info?.description as string) || category || "",
    avatar: thumbnailUrl || "/fal-2.png",
    runTime: "15-30s",
    gpu: "A100",
    outputType,
    imageName: `deepfish-${endpointId.replace(/\//g, "-")}`,
    image: endpointId,
    version: "latest",
    link: playgroundUrl || modelUrl,
    price: "0.001",
    mode: "api",
    installed: false,
    provider: "fal",
    schema: {
      Input: inputSchema,
      Output: outputSchema,
      Example: example,
    },
    inputTypes,
    inOutKey,
    result: undefined,
    logs: [],
  };

  return workflow;
}

// --------------------------------------------------------------
// startFalWorkflow – creates FAL queue request and returns ID
// --------------------------------------------------------------

export interface FalStartResult {
  requestId: string;
  status: string;
}

export async function startFalWorkflow(
  modelName: string,
  inputData: Record<string, any>,
  apiToken: string,
): Promise<FalStartResult> {
  const url = `https://queue.fal.run/${modelName}`;
  console.log("url", url);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(inputData),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`API error (${resp.status}): ${txt}`);
  }

  const data = (await resp.json()) as any;

  if (!data.request_id) {
    throw new Error("No request_id found in response");
  }

  return {
    requestId: data.request_id,
    status: data.status || "IN_QUEUE",
  };
}

// --------------------------------------------------------------
// getFalWorkflowStatus – checks FAL request status
// --------------------------------------------------------------

export interface FalStatusResult {
  requestId: string;
  status: string;
  completed: boolean;
}

export async function getFalWorkflowStatus(
  modelName: string,
  requestId: string,
  apiToken: string,
): Promise<FalStatusResult> {
  // For status endpoints, FAL expects only the first two segments (owner/model)
  const modelParts = modelName.split("/");
  const baseModelPath =
    modelParts.length >= 2 ? `${modelParts[0]}/${modelParts[1]}` : modelName;

  const url = `https://queue.fal.run/${baseModelPath}/requests/${requestId}/status`;

  const resp = await fetch(url, {
    headers: {
      Authorization: `Key ${apiToken}`,
    },
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Status API error (${resp.status}): ${txt}`);
  }

  const data = (await resp.json()) as any;

  return {
    requestId,
    status: data.status || "UNKNOWN",
    completed: data.status === "COMPLETED",
  };
}

// --------------------------------------------------------------
// getFalWorkflowResult – gets final result
// --------------------------------------------------------------

export interface FalResultResponse {
  success: boolean;
  outputUrl?: string;
  result?: any;
  type?: "image" | "video" | "audio" | "text" | "3d";
  processingTime: number;
  requestId: string;
  error?: string;
}

export async function getFalWorkflowResult(
  modelName: string,
  requestId: string,
  apiToken: string,
  processingTime: number,
): Promise<FalResultResponse> {
  // For result endpoints, FAL expects only the first two segments (owner/model)
  const modelParts = modelName.split("/");
  const baseModelPath =
    modelParts.length >= 2 ? `${modelParts[0]}/${modelParts[1]}` : modelName;

  const url = `https://queue.fal.run/${baseModelPath}/requests/${requestId}`;

  const resp = await fetch(url, {
    headers: {
      Authorization: `Key ${apiToken}`,
    },
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Result API error (${resp.status}): ${txt}`);
  }

  const data = (await resp.json()) as any;

  // Attempt to pull a URL from common fields returned by FAL
  let outputUrl =
    extractMediaUrl(data, "audio") ||
    extractMediaUrl(data, "video") ||
    extractMediaUrl(data, "image") ||
    extractMediaUrl(data, "model_mesh") ||
    data.url ||
    null;

  // Additional fallback: check for images array structures
  if (!outputUrl && Array.isArray(data.images)) {
    const first = data.images[0];
    if (Array.isArray(first)) {
      // some models wrap in extra array level: [[{url: ...}]]
      outputUrl = first[0]?.url;
    } else if (typeof first === "object" && first?.url) {
      outputUrl = first.url;
    }
  }

  if (outputUrl) {
    // Determine output type from URL or data structure
    let outputType: "audio" | "video" | "image" | "3d" = "image";

    if (
      outputUrl.endsWith(".mp3") ||
      outputUrl.endsWith(".wav") ||
      outputUrl.endsWith(".ogg")
    ) {
      outputType = "audio";
    } else if (
      outputUrl.endsWith(".mp4") ||
      outputUrl.endsWith(".webm") ||
      outputUrl.endsWith(".mov")
    ) {
      outputType = "video";
    } else if (data.video) {
      outputType = "video";
    } else if (data.audio) {
      outputType = "audio";
    } else if (outputUrl.endsWith(".glb") || data.model_mesh) {
      outputType = "3d";
    }

    return {
      success: true,
      outputUrl,
      type: outputType,
      processingTime,
      requestId,
    };
  }

  // No URL found – return raw result
  return {
    success: true,
    result: data,
    processingTime,
    requestId,
  };
}
