# Events: publishing, subscribing, and the blast radius of both

An event is the extension model's only sanctioned way for two apps to affect each other. Both
halves are contracts, and both are easy to get wrong in ways that compile.

## Which publisher

| Attribute | Means |
|---|---|
| `[IntegrationEvent(IncludeSender, GlobalVarAccess [, Isolated])]` | an extensibility hook in your own code, for consumers you expect |
| `[BusinessEvent(IncludeSender [, Isolated])]` | a stable published contract, changed only at a major version |
| `[InternalEvent(IncludeSender [, Isolated])]` | inside this app only; not part of your public surface |

`[BusinessEvent]` is the heavier promise: it says other people may build on this and you will
not move it. Use `[IntegrationEvent]` unless you mean that.

Both booleans on `IntegrationEvent` matter. `IncludeSender` passes the publishing object so a
subscriber can call back into it; `GlobalVarAccess` exposes the publisher's globals and is
almost never what you want — it welds subscribers to your internals.

## A published signature is frozen

Adding a parameter to an existing event breaks every subscriber that compiled against it, and
the break shows up in *their* build, not yours. Additive only: a new event beside the old one,
or a new parameter on a new overload.

This is the same rule as the one in `extension-model`, and it bites harder here because event
subscribers are the code most likely to live outside your repository.

## The `Handled` pattern, and its trap

```al
[IntegrationEvent(false, false)]
local procedure OnBeforeCalculateDiscount(var Line: Record "Sales Line"; var Handled: Boolean)
begin
end;

// in the caller
OnBeforeCalculateDiscount(Line, Handled);
if Handled then
    exit;
// default calculation follows
```

The trap is the caller's, not the subscriber's: if you raise the event and then run the default
logic regardless, every subscriber's work is silently overwritten and nothing reports it.
Check `Handled` immediately, and exit.

Name events `OnBeforeX` and `OnAfterX`. An `OnBefore` that fires after something has already
happened is a naming bug that costs someone a day.

## Subscribing

```al
[EventSubscriber(ObjectType::Codeunit, Codeunit::"Sales-Post", 'OnAfterPostSalesDoc', '', false, false)]
local procedure HandlePostedDocument(var SalesHeader: Record "Sales Header")
```

The two trailing booleans are `SkipOnMissingLicense` and `SkipOnMissingPermission`. Leaving
both `false` means a user without the licence or permission gets an error instead of a silently
skipped subscriber — which is usually right, because a subscriber that quietly does not run is
a defect with no symptom.

Find the event by reading the base application source. An event name guessed from a pattern
compiles if it exists and does something else; it does not compile if it does not, which is the
better outcome of the two.

## A subscriber runs inside the publisher's transaction

This is the fact that everything else here follows from.

- **An `Error()` in a subscriber rolls back the publisher's work too.** Your validation failing
  aborts someone else's posting routine. If the failure is genuinely yours to raise, raise it;
  if it is advisory, it is not an error.
- **Never `Commit()` in a subscriber.** It closes a transaction you did not open, and the
  publisher's subsequent failure can no longer roll back what it wrote.
- **A slow subscriber is a slow publisher.** Subscribers run inline and in sequence. A web call
  or a table scan inside one lands on every user of the thing you subscribed to. Queue the work
  instead — a job queue entry, a task.

### The exception: isolated events

A publisher declared with `Isolated = true` runs each subscriber in its own transaction. A
failing subscriber has its own table changes rolled back, and the publisher carries on. Three
limits make it narrower than it sounds:

- **Only if the caller committed first.** Inside an open write transaction an isolated event
  runs like a normal one, and a subscriber's error fails the whole operation again.
- **Only table writes roll back.** An HTTP call, a `var` parameter, a `SingleInstance` global —
  all survive the failure.
- **Not during install, uninstall or upgrade**, which must be one transaction.

Isolation is the publisher's decision, not the subscriber's. Choosing it for an event you
publish is a design choice worth making on purpose: it trades "the subscriber can veto" for
"the subscriber cannot break me".

## `SingleInstance` subscribers keep state

A `SingleInstance` codeunit lives for the session, so a global set during one posting is still
set during the next. That is occasionally the point — a flag set by `BindSubscription` to
suppress behaviour for one operation — and otherwise it is a leak between operations that
reproduces only in a long session.

Reset explicitly, and never assume you are looking at a fresh instance.

## Manual binding

A codeunit with `EventSubscriberInstance = Manual` subscribes only while a `BindSubscription`
is in scope. Two legitimate uses: tests that need to intercept something without changing
production behaviour, and opt-in behaviour scoped to a single operation.

`UnbindSubscription` when the scope ends. A binding left open outlives the reason for it.

## Do not subscribe to your own publisher

If both the event and the subscriber are yours, call the procedure. The event adds a hop, an
ordering you do not control, and a contract you now cannot change — for a call you could have
written directly.

## Recursion

A subscriber that modifies the record whose modification it subscribed to fires itself again.
The platform does not stop you. Guard with a `SingleInstance` flag, or subscribe to a different
event than the one your write raises.
