codeunit 50100 "CWE Bin Helper"
{
    Access = Internal;

    procedure DefaultBinFor(LocationCode: Code[10]): Code[20]
    var
        Bin: Record Bin;
    begin
        Bin.SetLoadFields(Code);
        Bin.SetRange("Location Code", LocationCode);
        if Bin.FindFirst() then
            exit(Bin.Code);
        exit('');
    end;
}
