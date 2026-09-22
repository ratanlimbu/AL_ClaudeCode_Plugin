# Testing, and what a passing suite actually claims

A test suite is a claim about behaviour. The failures below all make a suite that passes while
claiming less than the reader thinks — which is worse than no suite, because it is trusted.

## Tests live in a test app, never beside the code

A test codeunit in the shipped app ships to the customer, drags the Microsoft test libraries
into your dependency list, and blocks AppSource submission. The test app declares
`"target": "Test"` and depends on `Library Assert`, `Any` and whichever `Library - *` codeunits
it uses.

The dependency goes one way. The app under test never knows the test app exists.

## Given / When / Then, and one behaviour per test

```al
[Test]
procedure PostingLine_WithZeroQuantity_Errors()
var
    SalesLine: Record "Sales Line";
begin
    // [GIVEN] a released order line with quantity zero
    Initialize();
    CreateReleasedLine(SalesLine, 0);

    // [WHEN] the line is posted
    asserterror PostLine(SalesLine);

    // [THEN] posting is refused
    Assert.ExpectedError(ZeroQuantityErr);
end;
```

Name it `Subject_Condition_ExpectedOutcome`. The name is what a reader sees in a failure
report, and a test called `TestPosting` tells them nothing about what broke.

One behaviour per test. A test asserting four things reports the first failure and hides the
other three, so a single defect looks like a single defect when it may be several.

## Every test starts from the same state

```al
local procedure Initialize()
begin
    LibraryTestInitialize.OnTestInitialize(Codeunit::"My Feature Tests");
    if IsInitialized then
        exit;
    // one-time setup: company data, number series, posting setup
    IsInitialized := true;
end;
```

**No test may depend on another having run.** The runner's order is not yours to rely on, and
a suite that passes in file order and fails alphabetically has a defect in the tests, not in
the code. Shared mutable state between tests is the usual cause — a library codeunit holding a
global is a library codeunit that has made your tests order-dependent.

## `TestPermissions` is not a rollback setting

| Value | Runs as |
|---|---|
| `Disabled` | SUPER — permissions are not exercised at all |
| `Restrictive` | the test's own permission set only |
| `NonRestrictive` | the permissions plus SUPER-equivalent reads |

`Disabled` is the default and it is why permission defects survive a green suite: on the
development machine everyone is SUPER, and in production nobody is. If the change adds objects,
one test runs `Restrictive` against the permission set that ships with them.

`TransactionModel` is the separate setting that governs rollback — `AutoRollback` is the
default and returns the database to its prior state after each test.

## Handlers are declared, and must be consumed

```al
[Test]
[HandlerFunctions('ConfirmYesHandler,PostedMessageHandler')]
procedure PostingConfirmed_Posts()
```

A declared handler that the test never triggers **fails the test**. That is the platform doing
you a favour: it means a test claiming to answer a confirmation dialog cannot silently stop
exercising the path that raises one.

The handler types are `ConfirmHandler`, `MessageHandler`, `StrMenuHandler`, `PageHandler`,
`ModalPageHandler`, `ReportHandler`, `RequestPageHandler`, `HyperlinkHandler`,
`SendNotificationHandler` and `RecallNotificationHandler`. A modal page needs
`ModalPageHandler`; `PageHandler` will not catch it.

## Asserting on errors

`asserterror` catches it; `Assert.ExpectedError` checks it. Matching on the full message text
is brittle — it breaks on a reworded label and on every translated build. Match on the
distinctive fragment, or assert the error came from the path you meant by checking state that
the failed operation should not have changed.

An `asserterror` with no following assertion passes on **any** error, including a permission
failure or a typo in the test's own setup. That is the most common way a test claims more than
it checks.

## Delegate base data to the standard libraries

`Library - Sales`, `Library - Inventory`, `Library - Purchase` and the rest create records that
satisfy setup the platform requires and you have not thought about. A hand-built customer
record passes today and fails when a future version adds a mandatory field.

Your own helpers are stateless — parameters in, records out, no globals. A helper holding state
is the order-dependence described above, wearing a different hat.

`LibraryRandom` for values that must differ; `WorkDate()` rather than a hard-coded date, which
turns into a failing test on a date nobody predicted.

## Test the contract, not the implementation

A test that calls an internal procedure directly locks the implementation in place: the
refactor that preserves every observable behaviour still breaks the suite, so the suite starts
being edited to match the code rather than the code to match the suite.

Test what a caller can reach — the public procedure, the page action, the posting routine.

## What is worth a test

The acceptance criteria, first and always: a criterion nothing asserts is a criterion nobody
will notice losing. Then the boundaries — zero, empty, the maximum, the rounding case at the
midpoint — and the error paths, which is where untested code concentrates because the happy
path is the one people try by hand.
