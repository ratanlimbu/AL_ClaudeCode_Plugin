table 50200 "FFS Service Task"
{
    Caption = 'Service Task';
    DataClassification = CustomerContent;

    fields
    {
        field(1; "No."; Code[20])
        {
            Caption = 'No.';
        }
        field(2; Description; Text[100])
        {
            Caption = 'Description';
        }
        field(3; Closed; Boolean)
        {
            Caption = 'Closed';
        }
    }

    keys
    {
        key(PK; "No.")
        {
            Clustered = true;
        }
        key(Open; Closed)
        {
        }
    }
}
