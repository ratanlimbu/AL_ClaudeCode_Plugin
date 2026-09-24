# Verifying a base or dependency symbol

A design built on an event that does not exist, or that Microsoft is withdrawing, is the most
expensive mistake this stage can make — it survives until the spec is implemented and the
build fails, or until the next major version removes it. So every event, procedure, object and
field the design relies on is looked up, and the lookup is recorded.

## Order

1. **Source on disk** — the repository, then every `dependencies[].sourcePath` in the profile.
2. **Symbol packages** — gather the packages from **all** of these locations, then choose among
   them (next section): `.alpackages/` beside each `app.json`; each `al.packageCachePath` entry
   in `.vscode/settings.json`; the `baselinePackageCachePath` in `AppSourceCop.json`. Read these
   paths; never assume them. AL-Go and container-based repositories often have none on disk,
   because symbols are fetched at build time — then go to step 4 and say so.
3. **Record** each item: found or not, where, and which package version.
4. **Neither available** → `UNVERIFIED`, listed in the design with the decision it undermines.
   Mention `/bp-al:mcp` once as a way to resolve base symbols that are not on disk.

## Which package

Packages are named `<Publisher>_<Name>_<version>.app` — the Base Application is
`Microsoft_Base Application_<version>.app`; a dependency uses its own publisher and name.

There are usually several versions side by side. Check **existence** against the lowest
version that satisfies the app's floor — `application` in `app.json` for Microsoft's apps, the
dependency's `version` for others — because that is the version the app promises to run on.
Check **obsolescence** against the highest version present, because that is where a withdrawal
shows first. Say which versions you used.

**No package at or above the floor** — a stale `.alpackages`, say — means `UNVERIFIED` for the
floor, with the versions that were present. Never check existence against a version below the
floor: something added after it would pass.

**A Base Application package is one country version.** `.alpackages` holds W1 or a single
localisation, and the file name does not say which. An event verified there may be absent from
another country's base application. When `appsource.target` is `appsource`, report the result
as *verified for one localisation* — Microsoft validates the app against every country it is
offered in.

## Reading a package

An `.app` is a `NAVX` header followed by a zip archive. The header length is the unsigned
32-bit integer at byte offset 4 (40 in every package seen so far — read it, do not assume it);
the zip starts there. `SymbolReference.json` is a plain entry in that zip.

Extract that one entry to a temporary directory **outside the repository** — the scratchpad,
or the system temp directory — never beside the code.

**Any system with `od`, `tail` and `unzip`** (Git Bash on Windows, macOS, Linux):

```bash
APP='<path to the .app>'
OUT="${TMPDIR:-${TEMP:-/tmp}}/bp-al-symbols"; mkdir -p "$OUT"
HDR=$(od -An -tu4 -j4 -N4 "$APP" | tr -d ' ')
SYM="$OUT/$(basename "$APP").SymbolReference.json"   # one file per package — never shared
tail -c +$((HDR + 1)) "$APP" > "$OUT/pkg.zip"
unzip -p "$OUT/pkg.zip" SymbolReference.json > "$SYM"
rm "$OUT/pkg.zip"
echo "$SYM"
```

**Windows without those tools** — PowerShell:

```powershell
$app = '<path to the .app>'
$out = Join-Path ([System.IO.Path]::GetTempPath()) 'bp-al-symbols'
New-Item -ItemType Directory -Force $out | Out-Null
Add-Type -AssemblyName System.IO.Compression
$fs = [System.IO.File]::OpenRead($app)
$hdr = New-Object byte[] 8; [void]$fs.Read($hdr, 0, 8)
$fs.Position = [BitConverter]::ToUInt32($hdr, 4)
$zipBytes = New-Object System.IO.MemoryStream; $fs.CopyTo($zipBytes); $fs.Close()
$zipBytes.Position = 0
$zip = New-Object System.IO.Compression.ZipArchive($zipBytes)
$entry = $zip.GetEntry('SymbolReference.json')
$target = Join-Path $out ((Split-Path $app -Leaf) + '.SymbolReference.json')
$s = $entry.Open(); $f = [System.IO.File]::Create($target); $s.CopyTo($f); $f.Close(); $s.Close()
$target
```

## Finding a symbol — parse, do not grep

The file is one line of JSON, tens of megabytes long, and it begins with a byte-order mark.
**Never print it.** And do not confirm a symbol by reading text around a match: an object's own
name comes *after* its whole member list, so for a large codeunit the owner is hundreds of
thousands of characters from the event — and the same name can exist on several objects. Parse
it, and walk `Namespaces` → every object list (`Tables`, `Codeunits`, `TableExtensions`,
`PageExtensions`, `Interfaces`, `EnumTypes` and the rest) → the object, its `Methods` and its
`Fields`.

Write this to the temporary directory and run it with Node (`node find.js <json> <Name>`):

```js
const [file, name] = process.argv.slice(2);
const d = JSON.parse(require("fs").readFileSync(file, "utf8").replace(/^﻿/, ""));
const obsolete = (props) => (props || []).filter((p) => /^Obsolete/.test(p.Name))
  .map((p) => p.Name + "=" + p.Value).join(" ") || "-";
const attrs = (m) => (m.Attributes || [])
  .map((a) => a.Name + "(" + (a.Arguments || []).map((x) => x.Value).join(", ") + ")").join(" ");
const out = (...cols) => console.log(cols.join("\t"));
(function walk(n) {
  for (const [kind, list] of Object.entries(n)) {
    if (kind === "Namespaces" || !Array.isArray(list)) continue;
    for (const o of list) {
      if (!o || typeof o !== "object") continue;
      if (o.Name === name) out("OBJECT", kind, o.Name, "-", obsolete(o.Properties));
      for (const m of o.Methods || [])
        if (m.Name === name) out("METHOD", kind, o.Name, attrs(m), obsolete(o.Properties));
      for (const f of o.Fields || [])
        if (f.Name === name) out("FIELD", kind, o.Name, "-", obsolete(f.Properties));
    }
  }
  for (const c of n.Namespaces || []) walk(c);
})(d);
```

or, without Node, with Python (`python find.py <json> <Name>`):

```python
import json, re, sys
path, name = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8-sig") as f:
    root = json.load(f)
def obsolete(props):
    return " ".join(p["Name"] + "=" + str(p["Value"]) for p in (props or [])
                    if re.match(r"Obsolete", p["Name"])) or "-"
def attrs(m):
    return " ".join(a["Name"] + "(" + ", ".join(str(x.get("Value")) for x in a.get("Arguments", [])) + ")"
                    for a in m.get("Attributes", []))
def walk(n):
    for kind, items in n.items():
        if kind == "Namespaces" or not isinstance(items, list):
            continue
        for o in items:
            if not isinstance(o, dict):
                continue
            if o.get("Name") == name:
                print("\t".join(["OBJECT", kind, o["Name"], "-", obsolete(o.get("Properties"))]))
            for m in o.get("Methods", []):
                if m.get("Name") == name:
                    print("\t".join(["METHOD", kind, o["Name"], attrs(m), obsolete(o.get("Properties"))]))
            for f in o.get("Fields", []):
                if f.get("Name") == name:
                    print("\t".join(["FIELD", kind, o["Name"], "-", obsolete(f.get("Properties"))]))
    for c in n.get("Namespaces", []):
        walk(c)
walk(root)
```

One line per match: **what matched** (`OBJECT`, `METHOD` or `FIELD`) · the object kind ·
**the owning object** · the method's attributes · the obsolete properties of the object (for
`OBJECT` and `METHOD`) or of the field (for `FIELD`). No output means not found.

Reading the result:

- **An event** is a `METHOD` with `IntegrationEvent(…)`, `BusinessEvent(…)` or
  `InternalEvent(…)` among its attributes. More than one line means the name exists on several
  objects — use the one the design means, and say which.
- **An obsolete method** has `Obsolete(<reason>, <tag>)` among its attributes.
- **An obsolete object or field** shows `ObsoleteState=Pending` or `ObsoleteState=Removed`, with
  reason and tag, in the last column. A removed field **is still listed** — being found does not
  make it usable.
- **An event from a table or page extension** of a non-Microsoft dependency is found under
  `TableExtensions` or `PageExtensions` in that dependency's package.
- **Not found in the floor version** means it cannot be used, whatever a later version has.

**An `Obsolete` attribute, or `ObsoleteState` Pending or Removed, is a finding** — present it as
a decision with alternatives, never as a pass.

**Neither Node nor Python available:** search the text for `"Name":"<Name>"` to establish that
the name exists at all, and record the result as *found, owner unconfirmed*. That is weaker
than verified, and the design says so.

Delete the extracted files when the design is done.
