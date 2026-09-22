# Upgrade and deprecation: the code that runs once, on someone else's data

Everything here is about a tenant you cannot see, holding data you did not create, on a version
you did not install. It is the only code in an extension that cannot be tested by running it
again, and the only code whose failure is discovered by a customer.

## Install and upgrade are different codeunits

| Subtype | Triggers | Runs |
|---|---|---|
| `Install` | `OnInstallAppPerCompany`, `OnInstallAppPerDatabase` | on a fresh install of any version |
| `Upgrade` | `OnUpgradePerCompany`, `OnUpgradePerDatabase` | when an installed app moves to a new version |

Per-database runs once for the tenant; per-company runs once for each company in it. Putting
company-scoped work in the per-database trigger means it runs against whichever company
happened to be current.

## Upgrade tags are the mechanism, not a convention

Without a tag, an upgrade codeunit's body runs on **every** version bump, forever. The tag is
what makes it once.

```al
trigger OnUpgradePerCompany()
begin
    if UpgradeTag.HasUpgradeTag(GetBackfillStatusTag()) then
        exit;
    BackfillStatus();
    UpgradeTag.SetUpgradeTag(GetBackfillStatusTag());
end;
```

The second half is the one that gets forgotten:

```al
[EventSubscriber(ObjectType::Codeunit, Codeunit::"Upgrade Tag", 'OnGetPerCompanyUpgradeTags', '', false, false)]
local procedure RegisterTagsOnFreshInstall(var PerCompanyUpgradeTags: List of [Code[250]])
begin
    PerCompanyUpgradeTags.Add(GetBackfillStatusTag());
end;
```

A fresh install has no old data to convert, so every tag is set at install time and no upgrade
body ever runs on it. Omit this and the first upgrade after a new install runs conversion logic
over data that was never in the old shape.

Tag strings carry a publisher-unique prefix and a date, and are **never reused or edited** — an
edited tag is a tag whose upgrade runs a second time on tenants that already ran it.

## Removing a field takes two versions

Schema sync happens **before** the upgrade codeunit runs. A field deleted in the same version
as the upgrade that reads it is already gone when the upgrade starts.

1. **Version N** — mark it `ObsoleteState = Pending`, with `ObsoleteReason` and `ObsoleteTag`.
   The field still exists and still holds data. The upgrade in this version moves the data
   somewhere else.
2. **Version N+1** — `ObsoleteState = Removed`. Nothing reads it by now.

One major version in `Pending` is the minimum, and it is also what gives consumers of your app
a build warning rather than a build failure. The same lifecycle applies to procedures, events,
enum values, tables and pages.

A removed field's ID is not free again. Neither is an obsoleted one.

## Move data with `DataTransfer`, not a loop

```al
DataTransfer.SetTables(Database::"Old Record", Database::"New Record");
DataTransfer.AddFieldValue(OldRec.FieldNo(Status), NewRec.FieldNo(Status));
DataTransfer.AddConstantValue(true, NewRec.FieldNo(Migrated));
DataTransfer.CopyRows();
```

One statement against the database rather than one round trip per row. On a tenant with real
volume, the `repeat..until` version is the difference between an upgrade that takes a minute
and one that times out — and an upgrade that times out leaves the tenant part-converted.

`DataTransfer` runs no field validation and fires no triggers. That is usually what you want
here: validation logic has changed since the old rows were written, and re-running it against
historical data rewrites history.

## Upgrade code must be idempotent anyway

A failed upgrade is retried. Something that appends, increments or inserts unconditionally
double-applies on the second run, and the tag was not set because the first run did not finish.

Write it so that running it twice is indistinguishable from running it once, and let the tag be
the optimisation rather than the correctness argument.

## Read what is there; never assume the previous version

A tenant may be several versions behind. An upgrade that only handles N-1 silently skips
everything on a tenant coming from N-3 — the tags for those versions were never set, so their
bodies run, in an order worth checking rather than hoping about.

Branch on the data's actual shape, not on a version number you inferred.

## What to verify before shipping it

- The fresh-install path: install the new version clean and confirm no upgrade body ran.
- The upgrade path: install the previous version, put real-shaped data in it, then upgrade.
- The retry path: the same upgrade, run twice.

Testing only the end state confirms the schema and tells you nothing about the conversion,
which is the part that touches the customer's data.
