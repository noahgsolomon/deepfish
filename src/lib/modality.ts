export function inferType(p: any): string | null {
  if (!p) return null;
  if (p.format === "uri") {
    const t = (p.title ?? "").toLowerCase();
    // broader keyword detection for media types
    const isVideo = t.includes("video");
    const isAudio =
      t.includes("audio") ||
      t.includes("song") ||
      t.includes("voice") ||
      t.includes("instrumental") ||
      t.includes("music") ||
      t.includes("sound") ||
      t.includes("track") ||
      t.includes("beat") ||
      t.includes("vocal");
    const isImage = t.includes("image") || t.includes("mask");

    if (isVideo) return "video";
    if (isAudio) return "audio";
    if (isImage) return "image";
    return "file";
  }
  if (p.type === "array" && p.items) {
    const inner = p.items;
    if (
      (inner.format === "uri" || inner.type === "string") &&
      (p.title ?? "").toLowerCase().includes("image")
    )
      return "image";
    if (inner.format === "uri") return "file";
  }
  if (p.type === "string") return "text";
  return null;
}

export function deriveModalities(schema: any, outputType: string) {
  const props = schema?.Input?.properties ?? {};
  const requiredProps: string[] = schema?.Input?.required ?? [];

  const types: string[] = [];
  Object.values(props).forEach((p: any) => {
    const t = inferType(p);
    if (t && !types.includes(t)) types.push(t);
  });

  // Match AiCard sorting: TEXT, IMAGE, AUDIO, VIDEO, FILE, 3D
  const preferred = ["text", "image", "audio", "video", "file", "3d"];
  types.sort((a, b) => preferred.indexOf(a) - preferred.indexOf(b));

  // Determine if all distinct input types are required
  const requiredTypes: string[] = [];
  requiredProps.forEach((name) => {
    const prop = (props as any)[name];
    if (prop) {
      const t = inferType(prop);
      if (t && !requiredTypes.includes(t)) requiredTypes.push(t);
    }
  });

  const separatorChar =
    types.length > 1 && requiredTypes.length === types.length ? "" : "|";

  const inKey =
    separatorChar === "" ? types.join("") : types.join(separatorChar);

  return {
    inputTypes: types,
    inOutKey: `${inKey}→${outputType}`,
  };
}
