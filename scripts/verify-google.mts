/* Checks that the server believes a Google ID token only when it should:
 *   node scripts/verify-google.mts
 * The tokens are signed here with keys made here, standing in for Google's. */

import assert from "node:assert/strict";
import { verifyIdToken, type KeyFinder } from "../src/app/(zetamath)/zetamath/_server/google.ts";
import { base64url, newProof, nonceFor, PROOF, suggestUsername } from "../src/app/(zetamath)/zetamath/_lib/google.ts";

const RS256 = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as const;
const make = () =>
  crypto.subtle.generateKey(
    { ...RS256, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) },
    true,
    ["sign", "verify"],
  );
const google = await make();
const stranger = await make();

const keys: KeyFinder = async (kid) => (kid === "google-1" ? google.publicKey : null);
const CLIENT = "1234-abc.apps.googleusercontent.com";
const NOW = Date.UTC(2026, 10, 26, 12, 0, 0);
const proof = newProof();
const nonce = await nonceFor(proof);

const part = (v: unknown) => base64url(new TextEncoder().encode(JSON.stringify(v)));

async function token(
  claims: Record<string, unknown> = {},
  header: Record<string, unknown> = {},
  key = google.privateKey,
) {
  const body = `${part({ alg: "RS256", kid: "google-1", typ: "JWT", ...header })}.${part({
    iss: "https://accounts.google.com",
    aud: CLIENT,
    azp: CLIENT,
    sub: "104729000000000000001",
    email: "someone@example.com",
    iat: NOW / 1000 - 10,
    exp: NOW / 1000 + 3590,
    nonce,
    ...claims,
  })}`;
  const signature = new Uint8Array(await crypto.subtle.sign(RS256, key, new TextEncoder().encode(body)));
  return `${body}.${base64url(signature)}`;
}

const check = (t: string, want: Partial<{ clientId: string; nonce: string; now: number }> = {}) =>
  verifyIdToken(t, { clientId: CLIENT, nonce, keys, now: NOW, ...want });

let count = 0;
async function test(name: string, body: () => Promise<void>) {
  try {
    await body();
    count++;
  } catch (e) {
    console.error(`FAILED: ${name}`);
    throw e;
  }
}

await test("a good token says who it is", async () => {
  assert.deepEqual(await check(await token()), { sub: "104729000000000000001", email: "someone@example.com" });
  assert.deepEqual(await check(await token({ iss: "accounts.google.com", email: undefined })), {
    sub: "104729000000000000001",
    email: undefined,
  });
  assert.ok(await check(await token({ azp: undefined })));
});

await test("only Google's signature will do", async () => {
  assert.equal(await check(await token({}, {}, stranger.privateKey)), null);
  assert.equal(await check(await token({}, { kid: "someone-else" })), null);
  // Changed after signing.
  const [h, b, s] = (await token()).split(".");
  const forged = part({ ...JSON.parse(Buffer.from(b, "base64url").toString()), sub: "1" });
  assert.equal(await check(`${h}.${forged}.${s}`), null);
  assert.ok(await check(`${h}.${b}.${s}`));
  // No signature at all, or another kind.
  const [head, body] = (await token({}, { alg: "none" })).split(".");
  assert.equal(await check(`${head}.${body}.`), null);
  assert.equal(await check(`${head}.${body}.AAAA`), null);
  assert.equal(await check(await token({}, { alg: "HS256" })), null);
  assert.equal(await check(await token({}, { kid: 7 })), null);
});

await test("from Google, for this site, lately, and for this page", async () => {
  assert.equal(await check(await token({ iss: "https://evil.example" })), null);
  assert.equal(await check(await token({ iss: undefined })), null);
  assert.equal(await check(await token({ aud: "someone-else.apps.googleusercontent.com" })), null);
  assert.equal(await check(await token({ aud: [CLIENT] })), null);
  assert.equal(await check(await token({ azp: "someone-else.apps.googleusercontent.com" })), null);
  assert.equal(await check(await token(), { clientId: "" }), null);
  // A minute of clock difference either way, and no more.
  assert.ok(await check(await token({ exp: NOW / 1000 - 30 })));
  assert.equal(await check(await token({ exp: NOW / 1000 - 90 })), null);
  assert.equal(await check(await token({ exp: String(NOW / 1000 + 100) })), null);
  assert.ok(await check(await token({ iat: NOW / 1000 + 30 })));
  assert.equal(await check(await token({ iat: NOW / 1000 + 90 })), null);
  assert.equal(await check(await token({ iat: undefined })), null);
  // Made for another page's sign-in, or none.
  assert.equal(await check(await token({ nonce: await nonceFor(newProof()) })), null);
  assert.equal(await check(await token({ nonce: proof })), null, "the hash, not the secret itself");
  assert.equal(await check(await token({ nonce: undefined })), null);
});

await test("a sub Google could have made", async () => {
  for (const sub of [undefined, 104729, "", "a b", "x".repeat(256), "ïd"]) {
    assert.equal(await check(await token({ sub })), null, String(sub));
  }
  assert.ok(await check(await token({ sub: "x".repeat(255) })));
});

await test("nothing malformed gets far", async () => {
  const good = await token();
  for (const bad of [
    "", "a.b", "a.b.c.d", `${good}.`, `${good}=`, good.replace(".", ".."), "x".repeat(9000),
    `${part([1])}.${good.split(".")[1]}.${good.split(".")[2]}`,
    `${base64url(new Uint8Array([0xff, 0xfe]))}.${good.split(".")[1]}.${good.split(".")[2]}`,
  ]) {
    assert.equal(await check(bad), null, bad.slice(0, 40));
  }
});

await test("the nonce is the proof's hash, and names come from the address", async () => {
  assert.match(proof, PROOF);
  assert.notEqual(newProof(), proof);
  assert.equal(nonce, await nonceFor(proof));
  assert.equal(nonce.length, 43);
  assert.equal(suggestUsername("Brendan.Lo+zeta@gmail.com"), "brendan_lo_zeta");
  assert.equal(suggestUsername("ab@example.com"), "");
  assert.equal(suggestUsername("a-very-long-name-indeed-yes@example.com"), "a_very_long_name_ind");
  assert.equal(suggestUsername("..x..y..@example.com"), "x_y");
  assert.equal(suggestUsername(undefined), "");
});

console.log(`${count} google token tests passed.`);
