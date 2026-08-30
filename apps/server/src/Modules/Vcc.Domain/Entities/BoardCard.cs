using Vcc.Shared.Domain;
namespace Vcc.Domain.Entities;
public sealed class BoardCard : Entity
{
    public string ProjectId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Requirement { get; set; } = "";
    public string Type { get; set; } = "task";
    public string? ParentId { get; set; }
    public string Pack { get; set; } = "eng-loop";
    public string Model { get; set; } = "sonnet";
    public int MaxLoops { get; set; } = 8;
    public string Status { get; set; } = "todo";
    public string Review { get; set; } = "none";
    public string? RunId { get; set; }
    public string? Worktree { get; set; }
    public string Artifacts { get; set; } = "[]";
    public string Links { get; set; } = "[]";
    public string Labels { get; set; } = "[]";
    public string? SprintId { get; set; }
    public string? Assignee { get; set; }
    public int Order { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
