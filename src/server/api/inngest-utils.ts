export interface InngestRun {
  id: string;
  status: "Running" | "Completed" | "Failed" | "Cancelled";
  output?: any;
  error?: string;
  started_at?: string;
  ended_at?: string;
}

/**
 * Fetch runs for a given Event ID from the Inngest API
 */
export async function getRuns(eventId: string): Promise<InngestRun[]> {
  const isDev = process.env.NODE_ENV === "development";
  const apiUrl = isDev ? "http://localhost:8288" : "https://api.inngest.com";

  // Dev Server doesn't require authentication
  const headers: HeadersInit = {};
  if (!isDev) {
    const signingKey = process.env.INNGEST_SIGNING_KEY;
    if (!signingKey) {
      throw new Error("INNGEST_SIGNING_KEY is not configured for production ");
    }
    headers.Authorization = `Bearer ${signingKey}`;
  }

  const response = await fetch(`${apiUrl}/v1/events/${eventId}/runs`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch runs: ${response.statusText}`);
  }

  const json = await response.json();
  return json.data || [];
}

/**
 * Get the run ID from the Inngest function output
 * The processWorkflow function returns { success, output, runId }
 */
export function extractRunIdFromOutput(output: any): number | null {
  console.log("extractRunIdFromOutput input:", JSON.stringify(output, null, 2));

  if (!output || typeof output !== "object") {
    console.log("Output is null or not an object");
    return null;
  }

  // Direct check for runId at top level
  if (output.runId !== undefined && output.runId !== null) {
    const runId =
      typeof output.runId === "number"
        ? output.runId
        : parseInt(output.runId, 10);

    if (!isNaN(runId)) {
      console.log("Found runId at top level:", runId);
      return runId;
    }
  }

  // Check nested output.output.runId
  if (
    output.output &&
    typeof output.output === "object" &&
    output.output.runId !== undefined &&
    output.output.runId !== null
  ) {
    const nestedRunId =
      typeof output.output.runId === "number"
        ? output.output.runId
        : parseInt(output.output.runId, 10);

    if (!isNaN(nestedRunId)) {
      console.log("Found runId at output.output.runId:", nestedRunId);
      return nestedRunId;
    }
  }

  console.log("No runId found in output");
  return null;
}
