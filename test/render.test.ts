import { test } from "node:test";
import assert from "node:assert/strict";
import { render } from "../watch.ts";
import type { Listing } from "../types.ts";

const search = { name: "Test", url: "https://www.njuskalo.hr/x" };
const make = (n: number): Listing[] =>
  Array.from({ length: n }, (_, i) => ({
    id: String(i),
    title: `Ad ${i}`,
    url: `https://www.njuskalo.hr/x-oglas-${i}`,
    price: null,
    priceText: null,
  }));

test("a short list fits in one message with no part counter", () => {
  const msgs = render(search, make(3));
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /— 3 new\n/);
});

test("a long list is split, never truncated", () => {
  const msgs = render(search, make(23));
  assert.equal(msgs.length, 3);
  assert.match(msgs[0], /23 new \(1\/3\)/);
  assert.match(msgs[2], /23 new \(3\/3\)/);
  const all = msgs.join("\n");
  for (let i = 0; i < 23; i++) assert.ok(all.includes(`x-oglas-${i}"`), `ad ${i} missing`);
  assert.ok(!/more/.test(all));
});
