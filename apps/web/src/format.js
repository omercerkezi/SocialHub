import { FORMAT_LABELS, PLATFORM_LABELS, statusLabel } from "@socialhub/contracts";

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

export function dayKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function stampFor(post) {
  if (post.status === "published" && post.publishingMode === "live") {
    return { word: "Published", note: "The network confirmed this post.", tone: "positive" };
  }
  if (post.status === "published") {
    return { word: "Simulated success", note: "Nothing was sent.", tone: "accent" };
  }
  if (post.status === "failed") {
    return {
      word: post.publishingMode === "live" ? "Failed" : "Simulated failure",
      note: post.publishingMode === "live" ? "Live publishing did not complete." : "Nothing was sent.",
      tone: "negative",
    };
  }
  if (post.status === "scheduled") {
    return {
      word: "Scheduled",
      note: post.accountsSimulated ? "This slot will be simulated. Nothing is sent." : "Scheduled.",
      tone: "accent",
    };
  }
  if (post.status === "partial") {
    return {
      word: post.publishingMode === "live" ? "Partly published" : "Simulated, incomplete",
      note: "Check each network before retrying.",
      tone: "warning",
    };
  }
  return { word: statusLabel({ status: post.status, publishingMode: post.publishingMode }), note: "", tone: "neutral" };
}

export function networks(post) {
  return (post.targets || []).map((target) => PLATFORM_LABELS[target.platform] || target.platform).join(", ");
}
