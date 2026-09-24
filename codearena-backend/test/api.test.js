import "./helpers/testEnv.js";
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { Op } from "sequelize";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createMigrator } from "../src/db/migrator.js";
import { Session, sequelize, User } from "../src/models/index.js";
import { setGoogleVerifierForTests } from "../src/services/google.service.js";
import { HttpError } from "../src/utils/HttpError.js";

const ORIGIN = "http://localhost:5173";
const app = createApp();

// Fake Google: the "credential" is just a key into this table.
const GOOGLE_ACCOUNTS = {
  "credential-for-asha-0000000": { googleSub: "g-asha", email: "asha@example.com", name: "Asha", avatarUrl: null },
  "credential-for-ravi-0000000": { googleSub: "g-ravi", email: "ravi@example.com", name: "Ravi", avatarUrl: null },
};

before(async () => {
  await createMigrator({ logger: undefined }).up();
  setGoogleVerifierForTests(async (credential) => {
    const account = GOOGLE_ACCOUNTS[credential];
    if (!account) throw HttpError.unauthorized("Google sign-in failed. Please try again.");
    return account;
  });
});

async function signIn(credential = "credential-for-asha-0000000") {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/google").set("Origin", ORIGIN).send({ credential });
  assert.equal(res.status, 200, res.text);
  return { agent, token: res.body.accessToken, user: res.body.user, res };
}

const refreshCookie = (res) => res.headers["set-cookie"]?.find((c) => c.startsWith("pg_refresh="));

describe("auth", () => {
  test("Google sign-in creates the user once and sets a secure refresh cookie", async () => {
    const first = await signIn();
    assert.equal(first.user.email, "asha@example.com");
    assert.deepEqual(first.user.entitlements, []);
    assert.ok(first.token);
    const cookie = refreshCookie(first.res);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Path=\/api\/auth/);
    assert.match(cookie, /SameSite=Lax/);

    const again = await signIn();
    assert.equal(again.user.id, first.user.id, "same Google account → same user");
    assert.equal(await User.count({ where: { email: "asha@example.com" } }), 1);
  });

  test("rejects an invalid Google credential and missing credential", async () => {
    const bad = await request(app).post("/api/auth/google").send({ credential: "not-a-real-google-credential" });
    assert.equal(bad.status, 401);
    const missing = await request(app).post("/api/auth/google").send({});
    assert.equal(missing.status, 400);
  });

  test("/me needs a valid access token", async () => {
    assert.equal((await request(app).get("/api/auth/me")).status, 401);
    assert.equal((await request(app).get("/api/auth/me").set("Authorization", "Bearer nonsense")).status, 401);
    const { token } = await signIn();
    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.user.name, "Asha");
  });

  test("refresh rotates the cookie", async () => {
    const { agent, res } = await signIn();
    const oldCookie = refreshCookie(res).split(";")[0];
    const refreshed = await agent.post("/api/auth/refresh").set("Origin", ORIGIN);
    assert.equal(refreshed.status, 200);
    assert.ok(refreshed.body.accessToken);
    assert.equal(refreshed.body.user.email, "asha@example.com");
    assert.notEqual(refreshCookie(refreshed).split(";")[0], oldCookie, "cookie rotated");
  });

  test("two tabs refreshing at once: the late one gets 'stale_refresh', nobody is signed out", async () => {
    const { agent, res } = await signIn();
    const oldCookie = refreshCookie(res).split(";")[0];
    assert.equal((await agent.post("/api/auth/refresh").set("Origin", ORIGIN)).status, 200);

    const lateTab = await request(app).post("/api/auth/refresh").set("Origin", ORIGIN).set("Cookie", oldCookie);
    assert.equal(lateTab.status, 401);
    assert.equal(lateTab.body.code, "stale_refresh");
    assert.equal((await agent.post("/api/auth/refresh").set("Origin", ORIGIN)).status, 200, "still signed in");
  });

  test("replaying an old refresh token later ends every session (theft detection)", async () => {
    const { agent, res } = await signIn();
    const oldCookie = refreshCookie(res).split(";")[0];
    assert.equal((await agent.post("/api/auth/refresh").set("Origin", ORIGIN)).status, 200);

    // Pretend the rotation happened 2 minutes ago, outside the grace window.
    await Session.update({ revokedAt: new Date(Date.now() - 120_000) }, { where: { revokedAt: { [Op.ne]: null } } });

    const replay = await request(app).post("/api/auth/refresh").set("Origin", ORIGIN).set("Cookie", oldCookie);
    assert.equal(replay.status, 401);
    assert.notEqual(replay.body.code, "stale_refresh");
    assert.equal((await agent.post("/api/auth/refresh").set("Origin", ORIGIN)).status, 401, "legit session revoked too");
  });

  test("refresh and logout reject requests from other sites", async () => {
    const { agent } = await signIn();
    assert.equal((await agent.post("/api/auth/refresh").set("Origin", "https://evil.example")).status, 403);
    assert.equal((await agent.post("/api/auth/logout").set("Origin", "https://evil.example")).status, 403);
  });

  test("logout revokes the session", async () => {
    const { agent } = await signIn("credential-for-ravi-0000000");
    assert.equal((await agent.post("/api/auth/logout").set("Origin", ORIGIN)).status, 204);
    assert.equal((await agent.post("/api/auth/refresh").set("Origin", ORIGIN)).status, 401);
    const user = await User.findOne({ where: { email: "ravi@example.com" } });
    assert.equal(await Session.count({ where: { userId: user.id, revokedAt: null } }), 0);
  });
});

describe("progress", () => {
  let auth;
  let otherAuth;
  before(async () => {
    auth = { Authorization: `Bearer ${(await signIn()).token}` };
    otherAuth = { Authorization: `Bearer ${(await signIn("credential-for-ravi-0000000")).token}` };
  });

  const get = (headers = auth) => request(app).get("/api/progress").set(headers);

  test("starts empty with the default daily goal", async () => {
    const res = await get(otherAuth);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { solved: {}, flagged: {}, dailyGoal: 5, design: {}, designAttempts: {} });
  });

  test("solve, flag, unsolve a problem", async () => {
    const patch = (body) => request(app).patch("/api/progress/problems/two-sum").set(auth).send(body);
    assert.equal((await patch({ solvedOn: "2026-09-24" })).status, 204);
    assert.equal((await patch({ flagged: true })).status, 204);
    let body = (await get()).body;
    assert.equal(body.solved["two-sum"], "2026-09-24");
    assert.equal(body.flagged["two-sum"], true);

    await patch({ solvedOn: null });
    await patch({ flagged: false });
    body = (await get()).body;
    assert.equal(body.solved["two-sum"], undefined);
    assert.equal(body.flagged["two-sum"], undefined);
  });

  test("users only see their own progress", async () => {
    await request(app).patch("/api/progress/problems/3sum").set(auth).send({ solvedOn: "2026-09-24" });
    assert.equal((await get(otherAuth)).body.solved["3sum"], undefined);
  });

  test("validates problem ids, dates and daily goal", async () => {
    const unknown = await request(app).patch("/api/progress/problems/not-a-problem").set(auth).send({ flagged: true });
    assert.equal(unknown.status, 400);
    assert.match(unknown.body.message, /Unknown problem/);
    const badDate = await request(app).patch("/api/progress/problems/two-sum").set(auth).send({ solvedOn: "2026-02-31" });
    assert.equal(badDate.status, 400);
    const extra = await request(app).patch("/api/progress/problems/two-sum").set(auth).send({ flagged: true, admin: true });
    assert.equal(extra.status, 400);
    const goal = await request(app).patch("/api/progress/settings").set(auth).send({ dailyGoal: 99 });
    assert.equal(goal.status, 400);
    assert.equal((await request(app).patch("/api/progress/settings").set(auth).send({ dailyGoal: 8 })).status, 204);
    assert.equal((await get()).body.dailyGoal, 8);
  });

  test("design status and attempts", async () => {
    const q = "hld-url-shortener";
    assert.equal((await request(app).patch(`/api/progress/design/${q}`).set(auth).send({ status: "practised" })).status, 204);

    const attempt = { notes: "API + base62 ids + cache", covered: [2, 0, 2], revealed: true };
    assert.equal((await request(app).put(`/api/progress/design/${q}/attempt`).set(auth).send(attempt)).status, 204);

    let body = (await get()).body;
    assert.equal(body.design[q], "practised");
    assert.deepEqual(body.designAttempts[q], { notes: attempt.notes, covered: [0, 2], revealed: true });

    const outOfRange = await request(app)
      .put(`/api/progress/design/${q}/attempt`)
      .set(auth)
      .send({ ...attempt, covered: [99] });
    assert.equal(outOfRange.status, 400);

    assert.equal((await request(app).delete(`/api/progress/design/${q}/attempt`).set(auth)).status, 204);
    assert.equal((await request(app).patch(`/api/progress/design/${q}`).set(auth).send({ status: null })).status, 204);
    body = (await get()).body;
    assert.equal(body.designAttempts[q], undefined);
    assert.equal(body.design[q], undefined);
  });

  test("requires sign-in", async () => {
    assert.equal((await request(app).get("/api/progress")).status, 401);
  });
});

test("unknown routes return JSON 404", async () => {
  const res = await request(app).get("/api/nope");
  assert.equal(res.status, 404);
  assert.ok(res.body.message);
  await sequelize.close();
});
