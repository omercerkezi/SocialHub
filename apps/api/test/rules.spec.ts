import { liveProvider, mockProvider } from "../src/integrations/providers";
import { aggregateTargets } from "../src/publishing/aggregate";
import { resultCopy, statusLabel, validateComposition } from "@socialhub/contracts";

describe("publishing words", () => {
  it("never calls a simulation published", () => {
    expect(statusLabel({ status: "published", publishingMode: "simulated" })).toBe("Simulated success");
    expect(statusLabel({ status: "failed", publishingMode: "simulated" })).toBe("Simulated failure");
    expect(statusLabel({ status: "published", publishingMode: "live" })).toBe("Published");
    expect(resultCopy({ publishingMode: "simulated", ok: true, platform: "instagram" })).toMatch(/Nothing was sent to Instagram/);
    expect(resultCopy({ publishingMode: "simulated", ok: true, platform: "instagram" })).not.toMatch(/^Published/);
  });

  it("refuses a live publish when no credentials exist", async () => {
    const result = await liveProvider.publish({ platform: "tiktok", fail: false });
    expect(result.ok).toBe(false);
    expect(result.simulated).toBe(false);
    expect(result.publishingMode).toBe("live");
    expect(result.externalPostId).toBeNull();
    expect(result.summary).toMatch(/No credentials/);
    expect(result.summary).not.toMatch(/Simulated success/);
  });

  it("marks every mock result as simulated", async () => {
    process.env.SIMULATE_DELAY_MS = "0";
    const success = await mockProvider.publish({ platform: "facebook", fail: false });
    const failure = await mockProvider.publish({ platform: "linkedin", fail: true });
    expect(success.simulated).toBe(true);
    expect(success.externalPostId?.startsWith("sim_facebook_")).toBe(true);
    expect(success.summary).toMatch(/Nothing was sent/);
    expect(failure.ok).toBe(false);
    expect(failure.simulated).toBe(true);
    expect(failure.externalPostId).toBeNull();
    expect(failure.summary).toMatch(/Simulated failure/);
  });

  it("keeps a mixed result from being labeled live", () => {
    expect(
      aggregateTargets([
        { status: "published", publishingMode: "simulated" },
        { status: "published", publishingMode: "live" },
      ]).publishingMode,
    ).toBeNull();
    expect(statusLabel({ status: "published", publishingMode: null })).toBe("Check each network");
  });

  it("enforces network composition before anything is sent", () => {
    const reel = validateComposition({
      format: "reel",
      body: "A walk around the bench.",
      media: [],
      platform: "instagram",
    });
    expect(reel.some((issue) => issue.field === "media")).toBe(true);

    const linkedinReel = validateComposition({
      format: "reel",
      body: "No.",
      media: [{ kind: "video", mimeType: "video/mp4" }],
      platform: "linkedin",
    });
    expect(linkedinReel.some((issue) => issue.field === "format")).toBe(true);

    const carousel = validateComposition({
      format: "carousel",
      body: "Three finishes.",
      media: [
        { kind: "image", mimeType: "image/png" },
        { kind: "image", mimeType: "image/png" },
      ],
      platform: "instagram",
    });
    expect(carousel).toEqual([]);
  });
});
