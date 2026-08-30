namespace Vcc.Board.Common;

public static class BoardDefaults
{
    public const string Type = "task";
    public const string Pack = "eng-loop";
    public const string Model = "sonnet";
    public const int MaxLoops = 8;

    public const string StatusTodo = "todo";
    public const string StatusInProcess = "in_process";
    public const string ReviewNone = "none";
    public const string ReviewApproved = "approved";
    public const string ReviewChangesRequested = "changes_requested";

    public const string CommentAuthor = "human";
    public const string CommentKind = "comment";
    public const string CommentApprove = "approve";
    public const string CommentRequestChanges = "request_changes";
}
