codeunit 50201 "FFS Task Mgt."
{
    Access = Internal;

    var
        NothingOpenLbl: Label 'There are no open service tasks.';

    procedure HasOpenTasks(): Boolean
    var
        ServiceTask: Record "FFS Service Task";
    begin
        ServiceTask.SetCurrentKey(Closed);
        ServiceTask.SetRange(Closed, false);
        exit(not ServiceTask.IsEmpty());
    end;

    procedure OpenTaskMessage(): Text
    begin
        if HasOpenTasks() then
            exit('');
        exit(NothingOpenLbl);
    end;
}
