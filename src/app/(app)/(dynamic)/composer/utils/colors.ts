// Handle colors for different types of inputs
export const handleColors = {
  text: "#FF5555", // Bright red for text inputs
  image: "#55AAFF", // Bright blue for image inputs
  number: "#55FF55", // Bright green for numeric inputs
  select: "#FFAA55", // Bright orange for selection inputs
  audio: "#AA55FF", // Purple for audio inputs
  video: "#55FFFF", // Cyan for video inputs
  output: "#FFFF55", // Bright yellow for outputs
  checkbox: "#FF55FF", // Pink for checkbox inputs
  slider: "#55FFAA", // Green for slider inputs
  color: "#FF5555", // Red for color inputs
};

// Helper function to darken/lighten hex colors
export function hexToRgba(hex: string, factor: number): string {
  // Remove the # if it exists
  const cleanHex = hex.replace("#", "");

  // Parse r,g,b values
  let r = Number.parseInt(cleanHex.substring(0, 2), 16);
  let g = Number.parseInt(cleanHex.substring(2, 4), 16);
  let b = Number.parseInt(cleanHex.substring(4, 6), 16);

  // Darken or lighten the color
  r = Math.min(255, Math.max(0, Math.floor(r * factor)));
  g = Math.min(255, Math.max(0, Math.floor(g * factor)));
  b = Math.min(255, Math.max(0, Math.floor(b * factor)));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
