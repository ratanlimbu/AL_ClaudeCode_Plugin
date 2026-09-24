# Integration: calls out, secrets in, and work that runs later

Everything here crosses a boundary the compiler cannot see — another system, a vault, a
session that runs after the user's has ended. It all compiles. It fails in production, at a
distance, often silently. `api` covers the inbound half (API pages). This theme is the rest.

## An HTTP call never runs inside someone else's transaction

The session that makes an `HttpClient` call is blocked until the call returns — a user watching
a spinner, or a posting routine holding its locks for as long as the other side takes. Inside
an event subscriber or a posting transaction, a slow endpoint becomes a slow posting for every
user, and a retry loop there multiplies it.

- Make the call **after** the transaction that decided to make it has finished — from a Job
  Queue entry, a task, or a user action — not from inside it.
- Set the client's timeout deliberately, to what the operation can afford to wait.
- Retry through a queue, not a loop: a failed attempt becomes a record that is retried later
  and visible to someone, never a `repeat..until` with a sleep.
- Send an idempotency key the other side can use to discard a duplicate. A retried request
  that already succeeded once is otherwise a second order, a second payment.
- Check both outcomes: the call itself can fail inside the platform before it reaches the
  service, and the service can answer with an error status. `IsSuccessStatusCode` is a separate
  question from whether `Send` returned true.

## Outbound calls are blocked until someone allows them

An extension's HTTP requests are refused until **Allow HttpClient Requests** is switched on for
it — Extension Management, **Configure**, Extension Settings — and that holds for **each** app,
library apps included. The refusal reads *The request was blocked by the runtime to prevent
accidental use of production services*, which users report as a network fault. Put the setting
in the setup instructions of anything that calls out, and turn the refusal into a readable,
actionable error.

## Online cannot reach private addresses

Business Central online blocks requests to internal IP addresses (anti-SSRF validation), and
that cannot be switched off. An endpoint on a customer's internal network is unreachable
directly, however the firewall is configured. It needs a public, authenticated endpoint in
front of it — an Azure Function or a relay — and that belongs in the design, not in go-live.

## There is no IP address of your own to whitelist

Outbound traffic from Business Central online comes from a shared range, published as the
`Dynamics365BusinessCentral` Azure service tag. The range is used by every Business Central
environment, it changes over time, and there is no dedicated address per environment. A
firewall rule on the service tag admits every tenant's traffic, so it narrows the source, not
the caller: the call must still authenticate. Agree this with whoever owns the other side's
firewall early — a request for "Business Central's IP address" has no answer.

## A secret is never data

- **Never in a table field.** Table data is exported, copied to sandboxes, read by anyone with
  table permissions, and restored from backups nobody thought of as containing credentials.
- Store it in `IsolatedStorage` with the narrowest `DataScope` that works: `Module` for the app
  as a whole, `Company`, `User`, or `CompanyAndUser` when it genuinely varies.
- Carry it as `SecretText` (runtime 12.0 and later) from the moment it is read to the moment it
  goes into the request. It is not visible in the debugger. `Unwrap()` turns it back into plain
  text; it exists for compatibility, and every call to it is a place the secret can leak.
- Credentials that belong to the publisher rather than the customer — an API key for your own
  service — belong in an Azure Key Vault listed in `keyVaultUrls`. In Business Central online
  that is supported for AppSource apps only.
- Never in telemetry, whatever its classification.

## Authenticate with OAuth, not stored passwords

Use the platform's OAuth 2.0 support and store the refresh token as a secret. A stored
username and password is a credential that outlives the employee who typed it and cannot be
scoped.

## Choosing where background work runs

| Mechanism | Use it for | What happens on failure |
|---|---|---|
| Job Queue entry | recurring or retryable work a person should be able to see and restart | the entry shows the error and a log; **Maximum No. of Attempts** with **Rerun Delay** retries it; entries sharing a **category** run one at a time |
| `TaskScheduler.CreateTask` | one-off work, optionally not before a given time | runs the failure codeunit you pass — pass one, or a non-retriable failure is simply a failed task |
| `StartSession` | bounded work that must start now | nothing records it; the session ends |
| Page background task | read-only values for a page | see `pages` |

**Job Queue is the default for anything that talks to another system**: it is the only one of
the four that leaves a record a person can find and restart. Use a category to serialise work
that must not overlap — two syncs of the same entity running at once is the usual cause of
duplicates.

`StartSession` runs with the caller's credentials and costs as much to start as a user session.
It is not for small tasks that happen often.

## Letting the outside world react

| Need | Mechanism |
|---|---|
| another system is told when an entity changes | webhook subscription on an API page — custom API pages are webhook-enabled |
| Power Automate or Dataverse reacts to a business moment | external business event |
| Power Platform apps read and write Business Central data in place | virtual tables in Dataverse, built on the APIs |

An external business event (runtime 11.0 and later) is a published contract, like an API
version: its name and payload are frozen once someone has built a flow on it. It is declared
with `[ExternalBusinessEvent(Name, DisplayName, Description, Category [, Version])]`, where the
category is an extensible enum — reuse an existing category or extend it. Design the name, the
category, the payload and the version together; all four are part of the contract.

## Calling Azure Functions

The System Application's Azure Functions module — the `Azure Functions`, `Azure Functions
Authentication` and `Azure Functions Response` codeunits — sends the request, handles OAuth 2.0
or code authentication, and emits telemetry on success and failure. Use it rather than
hand-building the `HttpClient` call.

## What does not belong in AL at all

The SaaS sandbox has no file system and no .NET interop, and a session has limits on time and
memory. Work that needs either — large file transformations, long-running computation,
libraries AL cannot call — belongs in an Azure component that the extension calls: moving a
.NET interop component into an Azure Function is the case Microsoft describes. The extension
still owns the retry and the visible failure record; moving the work out does not move the
responsibility.
