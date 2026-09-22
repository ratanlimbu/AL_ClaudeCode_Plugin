codeunit 50300 "FFS Task Mgt. Tests"
{
    Subtype = Test;
    TestPermissions = Disabled;

    var
        LibraryAssert: Codeunit "Library Assert";
        NoOpenTasksLbl: Label 'An empty table has no open tasks.';

    [Test]
    procedure AnEmptyTableReportsNoOpenTasks()
    var
        ServiceTask: Record "FFS Service Task";
        TaskMgt: Codeunit "FFS Task Mgt.";
    begin
        ServiceTask.DeleteAll();
        LibraryAssert.IsFalse(TaskMgt.HasOpenTasks(), NoOpenTasksLbl);
    end;
}
