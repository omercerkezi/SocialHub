/**
 * Shared rules for the API, web app, and mobile app.
 * Limits follow the public platform docs recorded in docs/integrations.md.
 * They are planning limits for composition, not a live API call.
 */

const PLATFORMS = ["facebook", "instagram", "linkedin", "tiktok"];

const FORMATS = ["text", "image", "carousel", "video", "reel"];

const PLATFORM_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};

const FORMAT_LABELS = {
  text: "Text",
  image: "Image",
  carousel: "Carousel",
  video: "Video",
  reel: "Reel",
};

const LIMITS = {
  facebook: {
    caption: 63206,
    carousel: { min: 2, max: 10 },
    formats: ["text", "image", "carousel", "video", "reel"],
    media: { image: ["image/jpeg", "image/png", "image/webp"], video: ["video/mp4", "video/quicktime"] },
  },
  instagram: {
    caption: 2200,
    hashtags: 30,
    carousel: { min: 2, max: 10 },
    formats: ["image", "carousel", "video", "reel"],
    media: { image: ["image/jpeg", "image/png"], video: ["video/mp4", "video/quicktime"] },
  },
  linkedin: {
    caption: 3000,
    carousel: { min: 2, max: 20 },
    formats: ["text", "image", "carousel", "video"],
    media: { image: ["image/jpeg", "image/png", "image/gif"], video: ["video/mp4"] },
  },
  tiktok: {
    caption: 2200,
    photoTitle: 90,
    carousel: { min: 2, max: 35 },
    formats: ["carousel", "video"],
    media: { image: ["image/jpeg", "image/webp"], video: ["video/mp4", "video/webm", "video/quicktime"] },
  },
};

const TOKENS = {
  ground: "#f4f8f9",
  surface: "#ffffff",
  raised: "#e7eef0",
  border: "#d5e0e3",
  rule: "#e6eeef",
  control: "#c5d2d6",
  text: "#142026",
  muted: "#3d5158",
  accent: "#0e6e7a",
  "accent-soft": "#e6f3f5",
  "accent-track": "#c5e3e8",
  "accent-ink": "#083e48",
  manila: "#f4e7cf",
  "manila-edge": "#e3d3b0",
  positive: "#146b43",
  "positive-soft": "#e5f6ee",
  "positive-ink": "#0d4a2e",
  negative: "#9d1c28",
  "negative-soft": "#fdecea",
  "negative-ink": "#6f1219",
  warning: "#8a4b08",
  "warning-soft": "#fbf3e4",
  "warning-ink": "#6b3a06",
  "chart-1": "#0e6e7a",
  "chart-neutral": "#8aa0a6",
  font: '"DM Sans", "Segoe UI", sans-serif',
  "radius-card": "8px",
  "radius-control": "6px",
  gap: "24px",
  sidebar: "230px",
  rail: "384px",
};

function countHashtags(body) {
  const matches = String(body || "").match(/#[\p{L}\p{N}_]+/gu);
  return matches ? matches.length : 0;
}

function validateComposition({ format, body, media, platform }) {
  const errors = [];
  const rules = LIMITS[platform];
  if (!rules) {
    errors.push({ field: "platform", message: "Choose Facebook, Instagram, LinkedIn, or TikTok." });
    return errors;
  }
  if (!rules.formats.includes(format)) {
    errors.push({
      field: "format",
      message: `${FORMAT_LABELS[format] || "This format"} is not available on ${PLATFORM_LABELS[platform]}.`,
    });
  }
  const caption = String(body || "");
  if (caption.trim().length === 0 && format === "text") {
    errors.push({ field: "body", message: "Write the caption before scheduling a text post." });
  }
  if (caption.length > rules.caption) {
    errors.push({
      field: "body",
      message: `${PLATFORM_LABELS[platform]} captions stop at ${rules.caption.toLocaleString("en-GB")} characters. This one is ${caption.length.toLocaleString("en-GB")}.`,
    });
  }
  if (platform === "instagram" && rules.hashtags && countHashtags(caption) > rules.hashtags) {
    errors.push({
      field: "body",
      message: `Instagram allows ${rules.hashtags} hashtags. This caption has ${countHashtags(caption)}.`,
    });
  }
  const files = media || [];
  if (format === "text" && files.length > 0) {
    errors.push({ field: "media", message: "A text post cannot include files. Switch the format, or remove the files." });
  }
  if (format === "image") {
    if (files.length !== 1 || files[0].kind !== "image") {
      errors.push({ field: "media", message: "An image post needs exactly one image." });
    }
  }
  if (format === "carousel") {
    const { min, max } = rules.carousel;
    if (files.length < min || files.length > max) {
      errors.push({
        field: "media",
        message: `${PLATFORM_LABELS[platform]} carousels need ${min} to ${max} files. This one has ${files.length}.`,
      });
    }
    if (platform === "linkedin" && files.some((file) => file.kind !== "image")) {
      errors.push({ field: "media", message: "LinkedIn multi-image posts accept images only." });
    }
    if (platform === "tiktok" && files.some((file) => file.kind !== "image")) {
      errors.push({ field: "media", message: "TikTok photo posts accept images only. Use Video for a TikTok video." });
    }
  }
  if (format === "video" || format === "reel") {
    if (files.length !== 1 || files[0].kind !== "video") {
      errors.push({
        field: "media",
        message: format === "reel" ? "A Reel needs one video." : "A video post needs one video.",
      });
    }
  }
  for (const file of files) {
    const allowed = rules.media[file.kind] || [];
    if (file.mimeType && allowed.length && !allowed.includes(file.mimeType)) {
      errors.push({
        field: "media",
        message: `${PLATFORM_LABELS[platform]} does not accept ${file.mimeType} for this ${file.kind}.`,
      });
    }
  }
  return errors;
}

function resultCopy({ publishingMode, ok, platform, errorMessage }) {
  const name = PLATFORM_LABELS[platform] || "the network";
  if (publishingMode === "simulated" && ok) {
    return `Simulated success. Nothing was sent to ${name}.`;
  }
  if (publishingMode === "simulated" && !ok) {
    return errorMessage || `Simulated failure. Nothing was sent to ${name}.`;
  }
  if (publishingMode === "live" && ok) {
    return `Published to ${name}.`;
  }
  return errorMessage || `Live publishing did not complete for ${name}. Nothing was confirmed.`;
}

function statusLabel({ status, publishingMode }) {
  if (status === "published" && publishingMode === "live") return "Published";
  if (status === "published" && publishingMode === "simulated") return "Simulated success";
  if (status === "published") return "Check each network";
  if (status === "failed" && publishingMode === "live") return "Failed";
  if (status === "failed") return "Simulated failure";
  if (status === "partial" && publishingMode === "live") return "Partly published";
  if (status === "partial") return "Simulated, incomplete";
  const labels = {
    draft: "Draft",
    scheduled: "Scheduled",
    queued: "Queued",
    publishing: "Sending",
    cancelled: "Cancelled",
    pending: "Waiting",
    skipped: "Skipped",
  };
  return labels[status] || status;
}

exports.PLATFORMS = PLATFORMS;
exports.FORMATS = FORMATS;
exports.PLATFORM_LABELS = PLATFORM_LABELS;
exports.FORMAT_LABELS = FORMAT_LABELS;
exports.LIMITS = LIMITS;
exports.TOKENS = TOKENS;
exports.countHashtags = countHashtags;
exports.validateComposition = validateComposition;
exports.resultCopy = resultCopy;
exports.statusLabel = statusLabel;
