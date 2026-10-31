import { Facebook, Instagram, Linkedin } from "lucide-react";
import { PLATFORM_LABELS } from "@socialhub/contracts";
import { fileUrl } from "../api.js";
import { stampFor } from "../format.js";

const STATUS_TONE = {
  draft: "draft",
  scheduled: "scheduled",
  publishing: "scheduled",
  published: "simulated",
  failed: "failed",
  partial: "partial",
  cancelled: "draft",
};

export function statusTone(post) {
  if (post.status === "published" && post.publishingMode === "live") return "live";
  return STATUS_TONE[post.status] || "draft";
}

export function StatusBadge({ post, label }) {
  const tone = statusTone(post);
  return (
    <span className={`badge badge-${tone}`}>
      <span className="badge-dot" aria-hidden="true" />
      {label || stampFor(post).word}
    </span>
  );
}

function TikTok(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 12a4 4 0 1 0 4 4V3c.4 2.6 2.4 4.6 5 5" />
    </svg>
  );
}

const NETWORK_ICONS = { facebook: Facebook, instagram: Instagram, linkedin: Linkedin, tiktok: TikTok };

export function NetworkIcon({ platform, size = 14 }) {
  const Icon = NETWORK_ICONS[platform];
  if (!Icon) return null;
  return (
    <span className={`net net-${platform}`} aria-hidden="true">
      <Icon width={size} height={size} size={size} />
    </span>
  );
}

export function NetworkBadge({ platform, handle }) {
  return (
    <span className="net-badge">
      <NetworkIcon platform={platform} />
      <span>
        {PLATFORM_LABELS[platform] || platform}
        {handle ? <span className="net-handle"> @{handle}</span> : null}
      </span>
    </span>
  );
}

export function NetworkStack({ targets = [] }) {
  if (!targets.length) return <span className="meta">No network</span>;
  const labels = targets.map((target) => PLATFORM_LABELS[target.platform] || target.platform).join(", ");
  return (
    <span className="net-stack" title={labels}>
      {targets.map((target) => (
        <NetworkIcon key={target.id || target.accountId || target.platform} platform={target.platform} />
      ))}
      <span className="sr-only">{labels}</span>
    </span>
  );
}

const BRAND_HUES = ["teal", "amber", "plum", "moss", "slate", "rust"];

export function brandHue(name = "") {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return BRAND_HUES[hash % BRAND_HUES.length];
}

export function BrandAvatar({ name, size = "sm" }) {
  const initials = (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
  return (
    <span className={`avatar avatar-${size} hue-${brandHue(name)}`} aria-hidden="true">
      {initials}
    </span>
  );
}

export function BrandChip({ name }) {
  return (
    <span className="brand-chip">
      <BrandAvatar name={name} size="xs" />
      {name}
    </span>
  );
}

export function Thumb({ media, format }) {
  const first = media?.[0];
  if (first?.kind === "image") return <img className="thumb" src={fileUrl(first.id)} alt="" loading="lazy" />;
  return <span className={`thumb thumb-empty thumb-${format || "text"}`} aria-hidden="true" />;
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children ? <p className="meta">{children}</p> : null}
      {action || null}
    </div>
  );
}

export function SkeletonRows({ rows = 4, label = "Loading" }) {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="skeleton" />
      ))}
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p className="error-note" role="alert">
      {children}
    </p>
  );
}
