export const PLATFORMS: string[];
export const FORMATS: string[];
export const PLATFORM_LABELS: Record<string, string>;
export const FORMAT_LABELS: Record<string, string>;
export const LIMITS: Record<
  string,
  {
    caption: number;
    hashtags?: number;
    photoTitle?: number;
    carousel: { min: number; max: number };
    formats: string[];
    media: { image: string[]; video: string[] };
  }
>;
export const TOKENS: Record<string, string>;

export function countHashtags(body: string): number;

export function validateComposition(input: {
  format: string;
  body?: string;
  media?: { kind: string; mimeType?: string }[];
  platform: string;
}): { field: string; message: string }[];

export function resultCopy(input: {
  publishingMode: "simulated" | "live";
  ok: boolean;
  platform: string;
  errorMessage?: string | null;
}): string;

export function statusLabel(input: {
  status: string;
  publishingMode?: "simulated" | "live" | null;
}): string;
