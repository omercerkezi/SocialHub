import { randomUUID } from "crypto";
import { PLATFORM_LABELS, resultCopy } from "@socialhub/contracts";

export type PublishInput = {
  platform: string;
  fail: boolean;
};

export type ProviderResult = {
  ok: boolean;
  publishingMode: "simulated" | "live";
  simulated: boolean;
  externalPostId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  summary: string;
};

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockSocialProvider {
  readonly mode = "simulated" as const;

  async connect(platform: string, displayName: string, handle: string) {
    const externalId = `sim_${platform}_${randomUUID().slice(0, 8)}`;
    return {
      ok: true as const,
      publishingMode: "simulated" as const,
      simulated: true,
      externalId,
      summary: `Simulated connection. ${displayName} (@${handle}) is not linked to ${PLATFORM_LABELS[platform]}.`,
    };
  }

  async publish(input: PublishInput): Promise<ProviderResult> {
    const delay = Number(process.env.SIMULATE_DELAY_MS ?? 180);
    if (delay > 0) await pause(delay);
    const name = PLATFORM_LABELS[input.platform] || "the network";
    if (input.fail) {
      const errorMessage = `Simulated failure. Nothing was sent to ${name}. This account was set to fail its next simulation.`;
      return {
        ok: false,
        publishingMode: "simulated",
        simulated: true,
        externalPostId: null,
        errorCode: "simulated_failure",
        errorMessage,
        summary: resultCopy({
          publishingMode: "simulated",
          ok: false,
          platform: input.platform,
          errorMessage,
        }),
      };
    }
    return {
      ok: true,
      publishingMode: "simulated",
      simulated: true,
      externalPostId: `sim_${input.platform}_${randomUUID().slice(0, 8)}`,
      errorCode: null,
      errorMessage: null,
      summary: resultCopy({ publishingMode: "simulated", ok: true, platform: input.platform }),
    };
  }
}

export class LiveSocialProvider {
  readonly mode = "live" as const;

  connect(platform: string): ProviderResult {
    const errorMessage = `Live ${PLATFORM_LABELS[platform] || "network"} publishing is not connected. No credentials are stored, so nothing was sent.`;
    return {
      ok: false,
      publishingMode: "live",
      simulated: false,
      externalPostId: null,
      errorCode: "credentials_missing",
      errorMessage,
      summary: errorMessage,
    };
  }

  async publish(input: PublishInput): Promise<ProviderResult> {
    return this.connect(input.platform);
  }
}

export const mockProvider = new MockSocialProvider();
export const liveProvider = new LiveSocialProvider();

export function providerFor(connectionMode: string) {
  return connectionMode === "live" ? liveProvider : mockProvider;
}
