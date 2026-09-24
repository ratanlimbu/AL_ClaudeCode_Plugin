---
name: al-spec
description: Stage 1 of the bp-al pipeline — turn a Business Central request into a contract with independently checkable acceptance criteria, before any AL is written. Used by /bp-al:spec and /bp-al:go.
version: 0.1.0
allowed-tools: Read, Glob, Grep, Bash, Write, AskUserQuestion
---

# Stage 1 — the contract

You turn a request into something the other two stages can be held to. **No code in this
stage**, not even a sketch.

## In

The request, `.claude/bp-al.json`, and **only the authority documents covering the area the
request touches** — chosen from the profile's `authority` list by what the request names, not
read wholesale. Reading all of a project's documentation to write one contract is the failure
this stage exists to avoid.

If the profile is absent, run `bp-al:al-profile` first.

### An approved design binds this spec

If an approved design exists for this request — its path given to you, or approved earlier in
this conversation — read it before anything else. A design whose Status is `Proposed` or
`Superseded` is a draft and binds nothing.

- The spec **must not contradict any `TD-n`**. OBJECTS and CRITERIA cite the decision they
  implement: `per TD-2`.
- If the spec needs to depart from a decision, stop and put the conflict in `OPEN`. The human
  either supersedes the design with `/bp-al:design` or changes the spec. You do not choose.
- The design's `UNVERIFIED` entries carry into `OPEN` unless you resolved them here.

## Locate before you specify

Find the objects the request concerns before describing a change to them. Grep for the
symbols by name; search the paths in `dependencies[].sourcePath` too, because **the object
you are about to add may already exist in a base application** you extend.

Then check: is what the request asks for already there? Half-built, commented out, or
present but never called? Say so now. A spec that adds a second copy of something is the most
expensive kind to discover at review.

## Out

Write the contract in this shape. On the `customisation` tier it is inline in the
conversation; on `product` it is a file in `specs.dir`. Nowhere else, ever.

```
PROBLEM        <what is wrong or missing, in the project's own terms>
RULE SOURCE    <the regulation, ticket, specification section or conversation that
                decides the behaviour — and where to read it>
OBJECTS        <each object to add or change: type, name, ID where the project
                claims IDs, and which app it lives in — plus every non-AL file
                the change must edit (app.json, the ID register), since stage 2
                edits nothing this list does not name>
CRITERIA       <numbered; each one independently checkable by someone who did not
                write the code>
OUT OF SCOPE   <explicitly; the things a reasonable reader would assume are included
                and are not>
HOTSPOTS HIT   <every hotspots glob the change will touch | none>
OPEN           <what the request does not settle, with your proposed assumption>
```

### What makes a criterion checkable

A criterion names an input, an action and an observable result. "Handles rounding correctly"
is not a criterion. "A line of 1234.995 posts 1234.99, not 1235.00" is.

If a criterion can only be verified by reading the implementer's reasoning, it is not
checkable — stage 3 will never see that reasoning.

### RULE SOURCE is not optional

Where the rule comes from decides everything downstream. **"The specification does not cover
X" is a claim about a search, not about the specification** — search the repository's own
documents, and any PDF or spreadsheet sitting beside them, before recording a gap.

If the rule genuinely cannot be established: record it in `OPEN`, and say plainly that
implementing it means guessing. **Detect and refuse rather than approximate.** A plausible
figure that is wrong is the worst failure mode this pipeline has, because there is no symptom.

## Gate

Stop. Present the contract and get explicit human approval. Do not proceed on silence, on
"looks good" about something else, or on your own judgement that it is obviously fine.

If `OPEN` has entries, the human resolves them at this gate — that is what it is for.
