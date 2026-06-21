const FNV_PRIME = 0x01000193;
const FNV_OFFSET_BASIS = 0x811c9dc5;

function fnv1a(input: string, seed: number): number {
  let h = (FNV_OFFSET_BASIS ^ seed) >>> 0;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), FNV_PRIME) >>> 0;
  }
  return h >>> 0;
}

function formatUuid(bytes: Uint8Array): string {
  const hex = [...bytes]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function deterministicUuid(namespace: string, name: string): string {
  const input = `${namespace}:${name}`;
  const bytes = new Uint8Array(16);
  const dv = new DataView(bytes.buffer);
  dv.setUint32(0, fnv1a(input, 0x9e3779b1), false);
  dv.setUint32(4, fnv1a(input, 0x85ebca77), false);
  dv.setUint32(8, fnv1a(input, 0xc2b2ae3d), false);
  dv.setUint32(12, fnv1a(input, 0x27d4eb2f), false);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

export function randomUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}
