import { test } from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/greet.js";

test("defaults to world when no name is given", () => {
  assert.equal(greet(), "Hello, world!");
});

test("greets the given name", () => {
  assert.equal(greet("Ada"), "Hello, Ada!");
});

test("appends the secret phrase when provided", () => {
  assert.equal(greet("Ada", "shh"), "Hello, Ada! (shh)");
});
