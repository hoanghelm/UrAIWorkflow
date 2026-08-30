using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;
using Vcc.Projects.Common;
using Vcc.Projects.Contracts;
using Vcc.Projects.Mapping;
using Vcc.Projects.Scanning;
using Vcc.Shared.Application.Common;
using Vcc.Shared.Application.Interfaces;

namespace Vcc.Projects.Services;

public sealed class ProjectService(
    IProjectDbContext projects,
    IBoardDbContext board,
    IRunDbContext runs,
    IDesignDbContext designs,
    IPackageDbContext packages,
    IProjectMapper mapper,
    IGitService git,
    IConfiguration config) : IProjectService
{
    private static readonly JsonSerializerOptions Json = JsonDefaults.Web;

    public async Task<IReadOnlyList<ProjectDto>> ListAsync(CancellationToken ct)
        => (await projects.Projects.OrderByDescending(p => p.CreatedAt).ToListAsync(ct)).Select(mapper.ToDto).ToList();

    public async Task<IReadOnlyList<ProjectSummaryDto>> SummariesAsync(CancellationToken ct)
    {
        var list = await projects.Projects.OrderByDescending(p => p.CreatedAt).ToListAsync(ct);
        var result = new List<ProjectSummaryDto>();
        foreach (var p in list)
        {
            var counts = new Dictionary<string, int>
            {
                ["cards"] = await board.BoardCards.CountAsync(c => c.ProjectId == p.Id, ct),
                ["runs"] = await runs.Runs.CountAsync(r => r.ProjectId == p.Id, ct),
                ["designs"] = await designs.Designs.CountAsync(d => d.ProjectId == p.Id, ct),
                ["catalog"] = await packages.CatalogItems.CountAsync(c => c.ProjectId == p.Id, ct),
            };
            result.Add(new ProjectSummaryDto(p.Id, p.Name, p.Root, p.Persona, counts));
        }
        return result;
    }

    public async Task<ProjectDto> RegisterAsync(RegisterProjectInput input, CancellationToken ct)
    {
        var project = new Project { Name = input.Name, Root = input.Root, Persona = input.Persona ?? ProjectDefaults.Persona };
        projects.Projects.Add(project);
        await projects.SaveChangesAsync(ct);
        return mapper.ToDto(project);
    }

    public async Task<ProjectDto> CloneAsync(CloneProjectInput input, CancellationToken ct)
    {
        var workspaces = config["WORKSPACES_ROOT"] ?? Path.Combine(Path.GetTempPath(), "vcc-workspaces");
        Directory.CreateDirectory(workspaces);
        var target = Path.Combine(workspaces, SafeName(input.Name));

        await git.CloneAsync(input.GitUrl, target, ct);

        var project = new Project { Name = input.Name, Root = target, Persona = input.Persona ?? ProjectDefaults.Persona };
        projects.Projects.Add(project);
        await projects.SaveChangesAsync(ct);
        return mapper.ToDto(project);
    }

    public async Task<ProjectDto?> SetPersonaAsync(string id, string persona, CancellationToken ct)
    {
        var project = await projects.Projects.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (project is null) return null;
        project.Persona = persona;
        await projects.SaveChangesAsync(ct);
        return mapper.ToDto(project);
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        var project = await projects.Projects.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (project is null) return false;
        projects.Projects.Remove(project);
        await projects.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<CatalogItemDto>> DiscoverAsync(string id, CancellationToken ct)
    {
        var project = await projects.Projects.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (project is null) return [];

        var found = CatalogScanner.Scan(project.Root);
        var existing = await packages.CatalogItems.Where(c => c.ProjectId == id).ToListAsync(ct);
        foreach (var item in found)
        {
            var match = existing.FirstOrDefault(e => e.Kind == item.Kind && e.Name == item.Name);
            if (match is null)
            {
                packages.CatalogItems.Add(new CatalogItem
                {
                    Kind = item.Kind, Name = item.Name, Scope = item.Scope, Path = item.Path,
                    Source = ProjectDefaults.DiscoveredSource, Trust = ProjectDefaults.CommunityTrust, ProjectId = id,
                    Meta = JsonSerializer.Serialize(new { description = item.Description }, Json),
                });
            }
            else { match.Path = item.Path; }
        }
        await packages.SaveChangesAsync(ct);
        return await CatalogAsync(id, ct);
    }

    public async Task<IReadOnlyList<CatalogItemDto>> CatalogAsync(string? projectId, CancellationToken ct)
    {
        var items = await packages.CatalogItems
            .Where(c => projectId == null || c.ProjectId == projectId || c.ProjectId == null)
            .OrderBy(c => c.Kind).ThenBy(c => c.Name).ToListAsync(ct);
        return items.Select(mapper.ToDto).ToList();
    }

    public async Task<bool> DeleteCatalogItemAsync(string id, CancellationToken ct)
    {
        var item = await packages.CatalogItems.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (item is null) return false;
        packages.CatalogItems.Remove(item);
        await packages.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<string>> FoldersAsync(string id, CancellationToken ct)
    {
        var project = await projects.Projects.FirstOrDefaultAsync(p => p.Id == id, ct);
        return project is null ? [] : CodeGraphBuilder.Folders(project.Root);
    }

    public async Task<DiagramResult> DiagramAsync(string id, CancellationToken ct)
    {
        var project = await projects.Projects.FirstOrDefaultAsync(p => p.Id == id, ct);
        return new DiagramResult(project is null ? "flowchart TD" : CodeGraphBuilder.FolderDiagram(project.Root));
    }

    public async Task<CodeGraph> CodeGraphAsync(string id, CancellationToken ct)
    {
        var project = await projects.Projects.FirstOrDefaultAsync(p => p.Id == id, ct);
        return project is null
            ? new CodeGraph([], [], new CodeGraphStats(0, 0, 0, 0, false))
            : CodeGraphBuilder.Build(project.Root);
    }

    public async Task<DiagramResult> CodeDiagramAsync(string id, string level, CancellationToken ct)
    {
        var project = await projects.Projects.FirstOrDefaultAsync(p => p.Id == id, ct);
        return new DiagramResult(project is null ? "flowchart LR" : CodeGraphBuilder.GraphDiagram(project.Root, level));
    }

    public async Task<ExplainResult> ExplainAsync(string id, ExplainInput input, CancellationToken ct)
    {
        var files = input.Files ?? [];
        var outline = input.Outline ?? [];
        var text = new StringBuilder();
        text.AppendLine($"Question: {input.Question}");
        if (!string.IsNullOrEmpty(input.Focus)) text.AppendLine($"Focus: {input.Focus}");
        if (files.Length > 0) text.AppendLine($"Reviewed {files.Length} file(s): {string.Join(", ", files.Take(8))}");
        if (outline.Length > 0)
        {
            text.AppendLine("Outline:");
            foreach (var line in outline.Take(20)) text.AppendLine($"  - {line}");
        }
        text.AppendLine("This project follows a module-per-folder layout; entry points and shared code are separated by directory.");
        return new ExplainResult(input.StreamId ?? Guid.NewGuid().ToString("n"), text.ToString());
    }

    private static string SafeName(string name)
        => string.Concat(name.Select(c => char.IsLetterOrDigit(c) || c is '-' or '_' ? c : '-'));
}
