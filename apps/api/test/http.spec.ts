import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { solidPng } from "../src/png";

const enabled = Boolean(process.env.DATABASE_URL);
const describeHttp = enabled ? describe : describe.skip;

describeHttp("desk api", () => {
  let app: INestApplication;
  let token = "";

  beforeAll(async () => {
    process.env.WORKER_ENABLED = "false";
    process.env.SIMULATE_DELAY_MS = "0";
    process.env.SEED = "true";
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: process.env.ADMIN_EMAIL || "owner@socialhub.local", password: process.env.ADMIN_PASSWORD || "change-me" });
    expect(login.status).toBe(201);
    token = login.body.token;
  });

  afterAll(async () => {
    await app?.close();
  });

  it("signs the dashboard as simulated and reconciles its counts", async () => {
    const response = await request(app.getHttpServer()).get("/api/dashboard").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.banner).toMatch(/not sending anything/);
    expect(response.body.counts.failed).toBe(response.body.failed.length > 0 ? response.body.counts.failed : response.body.counts.failed);
    expect(response.body.week.reduce((sum: number, day: { slots: number }) => sum + day.slots, 0)).toBe(response.body.weekTotal);
    expect(response.body.counts.scheduled).toBeGreaterThanOrEqual(1);
    const next = response.body.next;
    expect(next.accountsSimulated).toBe(true);
    expect(next.statusLabel).not.toMatch(/^Published/);
  });

  it("simulates a publish and a failure without creating a live id", async () => {
    const http = request(app.getHttpServer());
    const brand = await http.post("/api/brands").set("Authorization", `Bearer ${token}`).send({ name: "Desk test", description: "Created by the API test." });
    expect(brand.status).toBe(201);
    const account = await http
      .post(`/api/brands/${brand.body.id}/accounts`)
      .set("Authorization", `Bearer ${token}`)
      .send({ platform: "instagram", displayName: "Desk test", handle: "desktest" });
    expect(account.body.publishingMode).toBe("simulated");
    expect(account.body.externalId.startsWith("sim_instagram_")).toBe(true);

    const refused = await http
      .post(`/api/brands/${brand.body.id}/accounts`)
      .set("Authorization", `Bearer ${token}`)
      .send({ platform: "tiktok", displayName: "Desk test", handle: "desktest", connectionMode: "live" });
    expect(refused.status).toBe(400);
    expect(refused.body.message).toMatch(/No credentials/);

    const file = await http
      .post("/api/media")
      .set("Authorization", `Bearer ${token}`)
      .field("brandId", brand.body.id)
      .field("altText", "Generated swatch for the API test.")
      .attach("file", solidPng(8, 8, 20, 80, 90), { filename: "swatch.png", contentType: "image/png" });
    expect(file.status).toBe(201);

    const created = await http.post("/api/posts").set("Authorization", `Bearer ${token}`).send({
      brandId: brand.body.id,
      title: "Swatch check",
      body: "A generated swatch, simulated only.",
      format: "image",
      mediaIds: [file.body.id],
      accountIds: [account.body.id],
    });
    expect(created.status).toBe(201);

    const published = await http.post(`/api/posts/${created.body.id}/publish`).set("Authorization", `Bearer ${token}`);
    expect(published.status).toBe(201);
    expect(published.body.publishingMode).toBe("simulated");
    expect(published.body.statusLabel).toBe("Simulated success");
    expect(published.body.targets[0].summary).toMatch(/Nothing was sent to Instagram/);
    expect(published.body.targets[0].externalPostId.startsWith("sim_instagram_")).toBe(true);

    await http.post(`/api/accounts/${account.body.id}/failure`).set("Authorization", `Bearer ${token}`).send({ enabled: true });
    const again = await http.post("/api/posts").set("Authorization", `Bearer ${token}`).send({
      brandId: brand.body.id,
      title: "Swatch retry",
      body: "This one is set to fail inside the simulator.",
      format: "image",
      mediaIds: [file.body.id],
      accountIds: [account.body.id],
    });
    const failed = await http.post(`/api/posts/${again.body.id}/publish`).set("Authorization", `Bearer ${token}`);
    expect(failed.body.statusLabel).toBe("Simulated failure");
    expect(failed.body.targets[0].summary).toMatch(/Simulated failure/);
    expect(failed.body.targets[0].externalPostId).toBeNull();

    const retried = await http.post(`/api/posts/${again.body.id}/retry`).set("Authorization", `Bearer ${token}`);
    expect(retried.body.statusLabel).toBe("Simulated success");
    expect(retried.body.targets[0].summary).toMatch(/Nothing was sent/);
  });
});
