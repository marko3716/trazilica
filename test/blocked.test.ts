import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isBlockPage } from "../watch.ts";

const fixture = await readFile(new URL("./fixture.html", import.meta.url), "utf8");
const apartments = await readFile(new URL("./apartments.html", import.meta.url), "utf8");

// Real pages embed the Radware script too, so its name alone must not count.
test("real result pages are not mistaken for the bot wall", () => {
  assert.equal(isBlockPage("https://www.njuskalo.hr/mobiteli", fixture), false);
  assert.equal(isBlockPage("https://www.njuskalo.hr/prodaja-stanova", apartments), false);
});

test("ending up off njuskalo.hr is a block", () => {
  assert.equal(isBlockPage("https://validate.perfdrive.com/?ssa=1", "<html></html>"), true);
});

test("a Radware page with no ads on njuskalo.hr is a block", () => {
  const html = '<html><script src="https://cdn.perfdrive.com/x.js"></script></html>';
  assert.equal(isBlockPage("https://www.njuskalo.hr/mobiteli", html), true);
});
