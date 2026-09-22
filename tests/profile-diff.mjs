#!/usr/bin/env node
// Compare a profile produced by /bp-al:scan against a golden file, and print the paths that
// differ. Run: node tests/profile-diff.mjs <actual.json> <expected.json>
//
// This replaces the snippet that used to live in tests/BEHAVIOURAL.md:
//
//   const s = o => JSON.stringify(o, Object.keys(o).sort(), 2);
//
// The array form of JSON.stringify's replacer is an allowlist applied at EVERY level, not
// only the top one, so every nested object came out empty and the comparison silently ignored
// build.command, policy.*, appsource.*, tests.*, apps[].prefix and everything else that
// matters. A profile with a wrong build command compared equal. `diffProfiles` is exported and
// self-tested from lint.mjs so that cannot happen again unnoticed.
//
// Two rules the comparison exists to enforce:
//   - `null` and absent are different. A detection step that found nothing must write null;
//     a field that is simply missing changes the profile's shape, and every later stage reads
//     it by name.
//   - Array order is significant. `authority` is in precedence order and `apps` is positional,
//     so these are compared by index, never as sets.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ABSENT = Symbol("absent");

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const show = (v) => {
  if (v === ABSENT) return "<absent>";
  const s = JSON.stringify(v);
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
};

const kind = (v) =>
  v === ABSENT ? "absent" : v === null ? "null" : Array.isArray(v) ? "array" : typeof v;

/**
 * Deep-compare two parsed profiles.
 * @returns {{path: string, actual: unknown, expected: unknown, note?: string}[]}
 */
export function diffProfiles(actual, expected) {
  const out = [];

  const walk = (a, e, path) => {
    if (a === ABSENT || e === ABSENT) {
      out.push({ path, actual: a, expected: e, note: a === ABSENT ? "missing" : "unexpected" });
      return;
    }

    if (kind(a) !== kind(e)) {
      out.push({ path, actual: a, expected: e, note: `type ${kind(a)} != ${kind(e)}` });
      return;
    }

    if (Array.isArray(e)) {
      if (a.length !== e.length)
        out.push({
          path: `${path}.length`,
          actual: a.length,
          expected: e.length,
          note: "array length",
        });
      for (let i = 0; i < Math.max(a.length, e.length); i++)
        walk(i < a.length ? a[i] : ABSENT, i < e.length ? e[i] : ABSENT, `${path}[${i}]`);
      return;
    }

    if (isPlainObject(e)) {
      const keys = [...new Set([...Object.keys(a), ...Object.keys(e)])].sort();
      for (const k of keys)
        walk(
          k in a ? a[k] : ABSENT,
          k in e ? e[k] : ABSENT,
          path ? `${path}.${k}` : k
        );
      return;
    }

    // Object.is rather than ===, so NaN compares equal to itself and -0 does not equal 0.
    if (!Object.is(a, e)) out.push({ path, actual: a, expected: e });
  };

  walk(actual, expected, "");
  return out;
}

export function formatDiff(diffs) {
  if (diffs.length === 0) return "profile: MATCH";
  const width = Math.max(...diffs.map((d) => d.path.length));
  const lines = diffs.map((d) => {
    const note = d.note ? `  (${d.note})` : "";
    return `  ${d.path.padEnd(width)}  ${show(d.actual)} -> ${show(d.expected)}${note}`;
  });
  return [
    `profile: DIFFERS — ${diffs.length} path(s)`,
    "  actual -> expected",
    ...lines,
  ].join("\n");
}

// ---------------------------------------------------------------- CLI

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const [actualPath, expectedPath] = process.argv.slice(2);
  if (!actualPath || !expectedPath) {
    console.error("usage: node tests/profile-diff.mjs <actual.json> <expected.json>");
    console.error("  e.g. node tests/profile-diff.mjs .claude/bp-al.json expected-profile.json");
    process.exit(2);
  }

  let actual, expected;
  try {
    actual = JSON.parse(readFileSync(actualPath, "utf8"));
  } catch (e) {
    console.error(`cannot read ${actualPath} — ${e.message}`);
    process.exit(2);
  }
  try {
    expected = JSON.parse(readFileSync(expectedPath, "utf8"));
  } catch (e) {
    console.error(`cannot read ${expectedPath} — ${e.message}`);
    process.exit(2);
  }

  const diffs = diffProfiles(actual, expected);
  console.log(formatDiff(diffs));
  process.exit(diffs.length === 0 ? 0 : 1);
}
