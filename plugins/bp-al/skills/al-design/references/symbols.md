# Verifying a base or dependency symbol

A design built on an event that does not exist, or that Microsoft is withdrawing, is the most
expensive mistake this stage can make — it survives until the spec is implemented and the
build fails, or until the next major version removes it. So every event, procedure or object
the design relies on is looked up, and the lookup is recorded.

## Order

1. **Source on disk** — the repository, then every `dependencies[].sourcePath` in the profile.
2. **Symbol packages** — look, in order, in: `.alpackages/` beside each `app.json`; each
   `al.packageCachePath` entry in `.vscode/settings.json`; the `baselinePackageCachePath` in
   `AppSourceCop.json`. Read these paths; never assume them. AL-Go and container-based
   repositories often have none on disk, because symbols are fetched at build time — then go
   to step 4 and say so.
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
tail -c +$((HDR + 1)) "$APP" > "$OUT/pkg.zip"
unzip -p "$OUT/pkg.zip" SymbolReference.json > "$OUT/SymbolReference.json"
rm "$OUT/pkg.zip"
echo "$OUT/SymbolReference.json"
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
**Never print it.** And do not confirm an event by reading text around a match: an object's own
name comes *after* its whole method list, so for a large codeunit the owner is hundreds of
thousands of characters from the event — and the same event name can exist on several objects.
Parse it, and walk `Namespaces` → object lists → `Methods`.

Write this to the temporary directory and run it with Node (`node find.js <json> <Name>`):

```js
const [file, name] = process.argv.slice(2);
const d = JSON.parse(require("fs").readFileSync(file, "utf8").replace(/^﻿/, ""));
const kinds = ["Tables", "Codeunits", "Pages", "Reports", "Queries", "XmlPorts"];
const args = (a) => a.Name + "(" + (a.Arguments || []).map((x) => x.Value).join(", ") + ")";
(function walk(n) {
  for (const k of kinds)
    for (const o of n[k] || [])
      for (const m of o.Methods || [])
        if (m.Name === name) {
          const objObsolete = (o.Properties || []).filter((p) => /^Obsolete/.test(p.Name))
            .map((p) => p.Name + "=" + p.Value);
          console.log([k, o.Name, m.Name, (m.Attributes || []).map(args).join(" "),
            objObsolete.join(" ") || "-"].join("\t"));
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
KINDS = ["Tables", "Codeunits", "Pages", "Reports", "Queries", "XmlPorts"]
def args(a):
    return a["Name"] + "(" + ", ".join(str(x.get("Value")) for x in a.get("Arguments", [])) + ")"
def walk(n):
    for k in KINDS:
        for o in n.get(k, []):
            for m in o.get("Methods", []):
                if m.get("Name") == name:
                    obs = [p["Name"] + "=" + str(p["Value"]) for p in o.get("Properties", [])
                           if re.match(r"Obsolete", p["Name"])]
                    print("\t".join([k, o["Name"], m["Name"],
                                     " ".join(args(a) for a in m.get("Attributes", [])),
                                     " ".join(obs) or "-"]))
    for c in n.get("Namespaces", []):
        walk(c)
walk(root)
```

Each output line is: object kind · **owning object** · method · its attributes · the object's
obsolete properties. No output means not found.

Reading the result:

- **An event** has `IntegrationEvent(…)`, `BusinessEvent(…)` or `InternalEvent(…)` among its
  attributes. More than one line means the name exists on several objects — use the one the
  design means, and say which.
- **An obsolete method** has `Obsolete(<reason>, <tag>)` among its attributes.
- **An obsolete object** shows `ObsoleteState=Pending` (with reason and tag) in the last column.
- **Not found in the floor version** means it cannot be used, whatever a later version has.

**An `Obsolete` attribute or `ObsoleteState=Pending` is a finding** — present it as a decision
with alternatives, never as a pass.

**Neither Node nor Python available:** search the text for `"Name":"<Name>"` to establish that
the name exists at all, and record the result as *found, owner unconfirmed*. That is weaker
than verified, and the design says so.

Delete the extracted files when the design is done.
