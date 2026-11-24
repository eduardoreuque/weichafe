import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SESSION_IDLE_SECONDS,
  SESSION_MAX_SECONDS,
  nextSessionExpiry,
  shouldRenewSession,
} from "./session-policy";

const DAY = 60 * 60 * 24;
const login = 1_000_000;
const fresh = { issuedAt: login, expiresAt: login + SESSION_IDLE_SECONDS, loginAt: login };

test("una sesión recién emitida no se renueva", () => {
  assert.equal(shouldRenewSession(fresh, login + 60), false);
  assert.equal(shouldRenewSession(fresh, login + DAY - 1), false);
});

test("con uso después de un día, la sesión se extiende 7 días desde ese momento", () => {
  const now = login + 6 * DAY;
  assert.equal(shouldRenewSession(fresh, now), true);
  assert.equal(nextSessionExpiry(login, now), now + SESSION_IDLE_SECONDS);
});

test("el tope es 30 días desde el inicio de sesión", () => {
  const now = login + 28 * DAY;
  assert.equal(nextSessionExpiry(login, now), login + SESSION_MAX_SECONDS);
  // Ya emitida hasta el tope: renovarla no la extendería.
  const atCap = { issuedAt: login + 25 * DAY, expiresAt: login + SESSION_MAX_SECONDS, loginAt: login };
  assert.equal(shouldRenewSession(atCap, now), false);
});

test("una sesión antigua sin fecha de inicio usa su fecha de emisión", () => {
  // auth.ts entrega loginAt = issuedAt para esas sesiones: se renuevan igual.
  assert.equal(shouldRenewSession({ ...fresh, loginAt: fresh.issuedAt }, login + 2 * DAY), true);
});
