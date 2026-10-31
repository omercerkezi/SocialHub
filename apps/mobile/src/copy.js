import { FORMAT_LABELS, PLATFORM_LABELS, statusLabel } from "../../../packages/contracts/index.js";

export { FORMAT_LABELS, PLATFORM_LABELS, statusLabel };

export function when(value) {
  if (!value) return "No date";
  return new Date(value).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function stampFor(post) {
  if (post.status === "published" && post.publishingMode === "live") {
    return { word: "Published", note: "The network confirmed this post." };
  }
  if (post.status === "published") return { word: "Simulated success", note: "Nothing was sent." };
  if (post.status === "failed") {
    return post.publishingMode === "live"
      ? { word: "Failed", note: "Live publishing did not complete." }
      : { word: "Simulated failure", note: "Nothing was sent." };
  }
  if (post.status === "scheduled") return { word: "Scheduled", note: "This slot will be simulated. Nothing is sent." };
  if (post.status === "partial") {
    return {
      word: post.publishingMode === "live" ? "Partly published" : "Simulated, incomplete",
      note: "Check each network before retrying.",
    };
  }
  return { word: statusLabel({ status: post.status, publishingMode: post.publishingMode }), note: "" };
}
