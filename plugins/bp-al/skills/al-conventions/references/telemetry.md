# Telemetry and diagnosis: you cannot attach a debugger to a customer

Once the app ships, the only thing you know about a failure is what you decided to emit before
it happened. That is the whole subject: the signal you need is the one you added in advance.

## Emitting

```al
var
    Dimensions: Dictionary of [Text, Text];
begin
    Dimensions.Add('itemStatus', Format(Rec.Status));
    Dimensions.Add('recordId', Format(Rec.SystemId, 0, 4));
    Session.LogMessage(
        'APP-0042',
        'Work item escalation declined',
        Verbosity::Warning,
        DataClassification::SystemMetadata,
        TelemetryScope::ExtensionPublisher,
        Dimensions);
```

**The event ID is the query key, and it is stable forever.** Message text gets reworded,
translated and tidied; the ID is what a dashboard filters on and an alert fires from. Pick a
scheme with your app's affix and a number, keep them in one place, and never reuse one for a
different event.

The message is for a human reading one record. The dimensions are for everyone querying a
million of them. Anything you would want to group or filter by is a dimension, not a sentence.

## Never put customer data in telemetry

`DataClassification::SystemMetadata` is the only classification that belongs in a
`LogMessage` you send to your own Application Insights.

No customer names, no contact details, no document numbers, no amounts, no free-text the user
typed. If you need to correlate a signal back to a record, emit the `SystemId` — it identifies
the row to someone with database access and means nothing to anyone else.

This is not a style preference. Telemetry leaves the customer's tenant, and an extension that
exports business data to its publisher's subscription is a compliance problem regardless of
what it was for.

## Scope decides who sees it

| Scope | Goes to |
|---|---|
| `TelemetryScope::ExtensionPublisher` | your Application Insights only |
| `TelemetryScope::All` | yours **and** the customer's environment telemetry |

`All` is for signals the customer's own administrator needs — a failed integration, an
exhausted number series. Routine diagnostics are `ExtensionPublisher`; sending them to `All`
fills the customer's telemetry with your internals.

## What is worth emitting

- **Every error on a path a user can reach**, with enough dimensions to tell which path.
- **Decisions that change behaviour** — a setup flag that took a branch, a fallback that
  triggered. These are the ones you wish you had during an incident, because the code looks
  correct and the data made it take the other road.
- **Feature entry points**, once per invocation, so you can tell whether anyone uses it.

And what is not: success chatter at every step, anything inside a loop. **Telemetry in a
per-row loop is the same cost mistake as `CalcFields` in one** — a round trip per row — and it
buries the signal you wanted under the ones you did not.

The platform already emits its own dimensions for company, environment, user and session. Do
not duplicate them.

## Configuration

`applicationInsightsConnectionString` in `app.json`. The older `applicationInsightsKey` is
deprecated and a connection string is required for new work.

Without it nothing is emitted at all, which is a state that looks identical to a feature nobody
uses. `al-appsource` reports its absence for that reason.

## Errors a person can act on

```al
var
    Info: ErrorInfo;
begin
    Info.Message := ItemBlockedErr;
    Info.DetailedMessage := StrSubstNo(ItemBlockedDetailTxt, Rec."No.", Rec.Status);
    Info.AddAction(OpenItemLbl, Codeunit::"Work Item Mgt.", 'OpenItem');
    Error(Info);
```

`ErrorInfo` carries a short message for the user, a detailed message for the log, and an action
that takes them somewhere useful. A bare `Error('Cannot post.')` ends the conversation; this one
continues it.

## Collecting errors instead of stopping at the first

For a batch that processes many records, `ErrorBehavior::Collect` with `HasCollectedErrors` and
`GetCollectedErrors` reports everything wrong in one pass. A batch that stops at the first
failure makes the user fix one row, re-run, and find the next — which is the same information
delivered one item at a time over an afternoon.
