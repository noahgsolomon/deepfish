// ----------------------------------------------
// helpers/replicate.ts
// ----------------------------------------------
import type { WorkflowInfo } from "~/server/db/schema";
import { z } from "zod";
import { deriveModalities } from "~/lib/modality";

const zModel = z.object({
  name: z.string(),
  description: z.string().nullish(),
  url: z.string(),
  cover_image_url: z.string().nullish(),
  latest_version: z.object({
    id: z.string(),
    openapi_schema: z.object({
      components: z.object({
        schemas: z.record(z.string(), z.any()),
      }),
    }),
  }),
  default_example: z
    .object({
      input: z.record(z.any()).nullish(),
    })
    .nullish(),
});

function determineOutputType(outputSchema: any) {
  // 1) Object with dedicated media keys
  if (outputSchema?.properties) {
    if (outputSchema.properties.video) return "video";
    if (outputSchema.properties.audio) return "audio";
    if (outputSchema.properties.image || outputSchema.properties.images)
      return "image";
  }

  // 2) Array of URIs
  if (outputSchema?.items?.format === "uri") return "image";

  // 3) Single URI
  if (outputSchema?.format === "uri") return "image";

  // 4) Fallback – assume text
  return "text";
}

/* ---------- helpers used by "recommended" & search ---------- */

function inferInputType(node: any): string | null {
  if (!node) return null;
  if (node.format === "uri") {
    const t = (node.title ?? "").toLowerCase();
    if (t.includes("video")) return "video";
    if (t.includes("audio")) return "audio";
    if (t.includes("image") || t.includes("mask")) return "image";
    return "file";
  }
  if (node.type === "string") return "text";
  return null;
}

async function fetchModelCards(
  url: string,
  apiToken: string,
): Promise<ModelCard[]> {
  const r = await fetch(url, {
    headers: {
      Authorization: `Token ${apiToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Replicate API error ${r.status}: ${t}`);
  }

  const json = (await r.json()) as { results: any[] };
  const out: ModelCard[] = [];

  for (const m of json.results) {
    const owner = m.owner as string;
    const name = m.name as string;

    /* --- derive input/output types from openapi schema --- */
    let inputs: string[] = [];
    let output = "text";
    const latest = m.latest_version;
    if (latest?.openapi_schema?.components?.schemas) {
      const schemas = latest.openapi_schema.components.schemas as any;
      if (schemas.Input?.properties) {
        inputs = Object.values(schemas.Input.properties)
          .map(inferInputType)
          .filter(Boolean) as string[];
      }
      output = determineOutputType(
        schemas.Output ??
          ({ type: "string", format: "uri" } as Record<string, any>),
      );
    }

    out.push({
      id: `${owner}/${name}`,
      label: name,
      description: m.description ?? "",
      cover_image_url: m.cover_image_url ?? "",
      run_count: m.run_count ?? 0,
      inputs,
      output,
    });
  }

  return out;
}

/* ---------- public function ---------- */
export async function fetchReplicateWorkflow(
  modelUrl: string,
  apiToken: string,
): Promise<WorkflowInfo> {
  // ── 1. owner / name from URL ────────────────────────────
  const [, owner, name] = /^https?:\/\/replicate\.com\/([^/]+)\/([^/]+)$/.exec(
    modelUrl,
  ) ?? [undefined, undefined, undefined];
  if (!owner || !name) throw new Error("Invalid Replicate URL");

  // ── 2. call Replicate REST API ──────────────────────────
  const r = await fetch(
    `https://api.replicate.com/v1/models/${owner}/${name}`,
    {
      headers: {
        Authorization: `Token ${apiToken}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Replicate API error ${r.status}: ${txt}`);
  }

  const parsed = zModel.parse(await r.json());

  // ── 3. extract / resolve schemas ------------------------
  const comps = parsed.latest_version.openapi_schema.components.schemas;
  const inputRaw = comps.Input ?? {
    type: "object",
    title: "Input",
    properties: {},
  };
  const resolveRef: (n: any) => any = (node) => {
    if (node && typeof node === "object" && "$ref" in node) {
      const ref = node.$ref as string;
      const key = ref.replace("#/components/schemas/", "");
      return comps[key] ?? node;
    }
    return node;
  };
  if (inputRaw.properties)
    for (const k of Object.keys(inputRaw.properties))
      inputRaw.properties[k] = resolveRef(inputRaw.properties[k]);

  // ── 3b. unwrap single-element allOf with $ref (e.g., rvc_model) ───
  if (inputRaw.properties) {
    for (const key of Object.keys(inputRaw.properties)) {
      const prop: any = inputRaw.properties[key];
      if (
        prop &&
        Array.isArray(prop.allOf) &&
        prop.allOf.length === 1 &&
        prop.allOf[0] &&
        typeof prop.allOf[0] === "object" &&
        "$ref" in prop.allOf[0]
      ) {
        const resolved = resolveRef(prop.allOf[0]);
        if (resolved) {
          // Merge resolved schema into property, keeping existing keys like default/x-order
          inputRaw.properties[key] = {
            ...resolved,
            ...prop,
          };
          delete inputRaw.properties[key].allOf;
        }
      }
    }
  }

  const outputRaw =
    comps.Output ??
    ({ type: "string", format: "uri", title: "Output" } as const);

  // ── 4. build WorkflowInfo -------------------------------
  let outputType = determineOutputType(outputRaw);

  // Heuristic: if initial guess is image but model exposes an output_format enum with typical audio extensions, treat as audio
  if (outputType === "image") {
    const ofProp: any = (inputRaw.properties || {}).output_format;
    if (ofProp?.enum && Array.isArray(ofProp.enum)) {
      const audioExt = ["mp3", "wav", "flac", "ogg", "aac", "m4a"];
      const hasAudio = ofProp.enum.some((v: string) =>
        audioExt.includes(v.toLowerCase()),
      );
      if (hasAudio) {
        outputType = "audio";
      }
    }
  }

  const { inputTypes, inOutKey } = deriveModalities(inputRaw, outputType);

  const wf: WorkflowInfo = {
    title: parsed.name.toUpperCase(),
    description: parsed.description ?? "",
    avatar: parsed.cover_image_url ?? "/placeholder.png",
    runTime: "15-30s",
    gpu: "A100",
    outputType,
    imageName: `deepfish-${name.toLowerCase()}`,
    image: `${owner}/${name}`,
    version: parsed.latest_version.id,
    link: parsed.url,
    price: "0.001",
    mode: "api",
    provider: "replicate",
    installed: false,
    schema: {
      Input: inputRaw,
      Output: outputRaw,
      Example: parsed.default_example?.input ?? {},
    },
    // optional fields
    coldStart: false,
    deepfishOfficial: false,
    inputTypes,
    inOutKey,
  } as WorkflowInfo;

  return wf;
}

/* ======================================================
   fetchReplicateRecommendedModels
   – first page, filter with cover, sort by run_count desc,
     return top 30 ModelCards
====================================================== */
export interface ModelCard {
  id: string;
  label: string;
  description: string;
  cover_image_url: string;
  run_count: number;
  inputs: string[]; // e.g. ["text","image"]
  output: string; // e.g. "image"
}

export async function fetchReplicateRecommendedModels(
  apiToken: string,
): Promise<ModelCard[]> {
  const url = "https://api.replicate.com/v1/models";
  const all = await fetchModelCards(url, apiToken);

  const withCover = all.filter((m) => m.cover_image_url);
  const sorted = withCover.sort((a, b) => b.run_count - a.run_count);

  return sorted.slice(0, 20);
}

export interface ReplicateRunResult {
  success: boolean;
  outputUrl?: string | string[];
  output?: any;
  type?: "image" | "video" | "audio" | "3d" | "text";
  processingTime: number;
  predictionId: string;
  error?: string;
}

// helper: detect if string looks like URL
function isHttpUrl(s: string) {
  return s.startsWith("http://") || s.startsWith("https://");
}

function inferTypeFromUrl(
  url: string,
): "image" | "video" | "audio" | "3d" | "text" {
  const lower = url.toLowerCase();
  if (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp")
  )
    return "image";
  if (
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".mov")
  )
    return "video";
  if (
    lower.endsWith(".mp3") ||
    lower.endsWith(".wav") ||
    lower.endsWith(".flac") ||
    lower.endsWith(".ogg") ||
    lower.endsWith(".aac") ||
    lower.endsWith(".m4a")
  )
    return "audio";
  if (lower.endsWith(".glb") || lower.endsWith(".gltf")) return "3d";
  return "text";
}

// helper: extract single URL from mixed output shapes (string, array, object)
function extractOutputUrl(output: any): string | null {
  if (!output) return null;
  if (typeof output === "string") return output;
  if (Array.isArray(output) && output.length && typeof output[0] === "string")
    return output[0];
  if (typeof output === "object") {
    const obj = output as Record<string, any>;
    if (typeof obj.url === "string") return obj.url;
    if (typeof obj.image === "string") return obj.image;
    if (typeof obj.video === "string") return obj.video;
    if (typeof obj.glb === "string") return obj.glb;
  }
  return null;
}
// --------------------------------------------------------------
// startReplicateWorkflow – creates prediction and returns ID
// --------------------------------------------------------------

export interface ReplicateStartResult {
  predictionId: string;
  status: string;
  created_at: string;
}

export async function startReplicateWorkflow(
  modelVersion: string,
  inputData: Record<string, any>,
  apiToken: string,
): Promise<ReplicateStartResult> {
  const createResp = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version: modelVersion, input: inputData }),
  });

  if (!createResp.ok) {
    const txt = await createResp.text();
    throw new Error(`API error (${createResp.status}): ${txt}`);
  }

  const prediction = (await createResp.json()) as any;

  return {
    predictionId: prediction.id,
    status: prediction.status,
    created_at: prediction.created_at,
  };
}

// --------------------------------------------------------------
// getReplicateWorkflowStatus – checks prediction status
// --------------------------------------------------------------

export interface ReplicateStatusResult {
  predictionId: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: any;
  outputUrl?: string | string[];
  type?: "image" | "video" | "audio" | "3d" | "text";
  error?: string;
  logs?: string;
  metrics?: {
    predict_time?: number;
  };
}

export async function getReplicateWorkflowStatus(
  predictionId: string,
  apiToken: string,
): Promise<ReplicateStatusResult> {
  const statusResp = await fetch(
    `https://api.replicate.com/v1/predictions/${predictionId}`,
    {
      headers: {
        Authorization: `Token ${apiToken}`,
      },
    },
  );

  if (!statusResp.ok) {
    const txt = await statusResp.text();
    throw new Error(`API error (${statusResp.status}): ${txt}`);
  }

  const prediction = (await statusResp.json()) as any;

  // If succeeded, process the output
  if (prediction.status === "succeeded" && prediction.output) {
    const output = prediction.output;

    // Handle array of URLs
    if (
      Array.isArray(output) &&
      output.length &&
      output.every((v: any) => typeof v === "string")
    ) {
      const allUrl = output.every((v: string) => isHttpUrl(v));
      if (!allUrl) {
        // treat as text
        return {
          predictionId: prediction.id,
          status: prediction.status,
          output: output.join(""),
          type: "text",
          metrics: prediction.metrics,
        };
      }

      // urls array
      const outputType = inferTypeFromUrl(output[0]);
      return {
        predictionId: prediction.id,
        status: prediction.status,
        outputUrl: output as string[],
        type: outputType,
        metrics: prediction.metrics,
      };
    }

    // try single url
    const singleUrl = extractOutputUrl(output);
    if (singleUrl) {
      const outputType = inferTypeFromUrl(singleUrl);
      return {
        predictionId: prediction.id,
        status: prediction.status,
        outputUrl: singleUrl,
        type: outputType,
        metrics: prediction.metrics,
      };
    }

    // fallback raw output
    return {
      predictionId: prediction.id,
      status: prediction.status,
      output,
      type: "text",
      metrics: prediction.metrics,
    };
  }

  // Return status without output for non-succeeded states
  return {
    predictionId: prediction.id,
    status: prediction.status,
    error: prediction.error,
    logs: prediction.logs,
    metrics: prediction.metrics,
  };
}

// -------------------------------------------------------------
// uploadReplicateFile – uses chigozienri/upload model to host a file
// -------------------------------------------------------------

export async function uploadReplicateFile(
  base64Data: string,
  apiToken: string,
): Promise<string> {
  // Build data URI from supplied base64 string
  const dataUri = `data:application/octet-stream;base64,${base64Data}`;

  // Fixed model version for chigozienri/upload
  const uploadVersion =
    "2472bd8ce171b57576bb610deb154057ad80518fefe7ca059f9e33f073b3456b";

  // 1) Create prediction with file data
  const createResp = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: uploadVersion,
      input: { inputfile: dataUri },
    }),
  });

  if (!createResp.ok) {
    const txt = await createResp.text();
    throw new Error(`Upload create error (${createResp.status}): ${txt}`);
  }

  let prediction = (await createResp.json()) as any;

  // 2) Poll until finished (success / failed)
  while (
    prediction.status === "starting" ||
    prediction.status === "processing"
  ) {
    await new Promise((r) => setTimeout(r, 1000));

    const pollResp = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      {
        headers: { Authorization: `Token ${apiToken}` },
      },
    );
    if (!pollResp.ok) {
      const txt = await pollResp.text();
      throw new Error(`Upload poll error (${pollResp.status}): ${txt}`);
    }
    prediction = await pollResp.json();
  }

  if (
    prediction.status === "succeeded" &&
    typeof prediction.output === "string"
  ) {
    return prediction.output as string;
  }

  throw new Error(
    `Upload failed: ${prediction.error ?? `status ${prediction.status}`}`,
  );
}

// --------------------------------------------------------------
// cancelReplicatePrediction – cancels an in-flight prediction
// --------------------------------------------------------------

export interface ReplicateCancelResult {
  success: boolean;
  error?: string;
}

export async function cancelReplicatePrediction(
  predictionId: string,
  apiToken: string,
): Promise<ReplicateCancelResult> {
  try {
    const resp = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!resp.ok) {
      const txt = await resp.text();
      return {
        success: false,
        error: `API error (${resp.status}): ${txt}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: String(err) };
  }
}

// --------------------------------------------------------------
// searchReplicateModels – Replicate model search (QUERY verb)
// --------------------------------------------------------------

export async function searchReplicateModels(
  query: string | undefined,
  page: number | undefined,
  apiToken: string,
): Promise<ModelCard[]> {
  const baseUrl = "https://api.replicate.com/v1/models";

  // If no query provided, just delegate to list endpoint
  if (!query || query.trim() === "") {
    const url = page ? `${baseUrl}?page=${page}` : baseUrl;
    return fetchModelCards(url, apiToken);
  }

  // Build URL (only page param allowed)
  const url = page ? `${baseUrl}?page=${page}` : baseUrl;

  // Replicate SEARCH uses custom HTTP verb "QUERY"
  const resp = await fetch(url, {
    method: "QUERY", // yes, this is intentional per Replicate docs
    headers: {
      Authorization: `Token ${apiToken}`,
      "Content-Type": "text/plain",
    },
    body: query,
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Replicate API error (${resp.status}): ${txt}`);
  }

  const json = (await resp.json()) as { results: any[] };
  const arr = Array.isArray(json.results) ? json.results : [];

  const out: ModelCard[] = [];

  for (const m of arr) {
    const owner = m.owner as string;
    const name = m.name as string;

    /* --- derive input/output types from openapi schema --- */
    let inputs: string[] = [];
    let output = "text";
    const latest = (m as any).latest_version;
    if (latest?.openapi_schema?.components?.schemas) {
      const schemas = latest.openapi_schema.components.schemas as any;
      if (schemas.Input?.properties) {
        inputs = Object.values(schemas.Input.properties)
          .map(inferInputType)
          .filter(Boolean) as string[];
      }
      output = determineOutputType(
        schemas.Output ?? ({ type: "string", format: "uri" } as any),
      );
    }

    out.push({
      id: `${owner}/${name}`,
      label: name,
      description: m.description ?? "",
      cover_image_url: m.cover_image_url ?? "",
      run_count: m.run_count ?? 0,
      inputs,
      output,
    });
  }

  return out;
}
