import { setCookie } from "~/lib/utils";

export function persistCount(key: string, n: number) {
  try {
    setCookie(key, n.toString());
  } catch {}
}
