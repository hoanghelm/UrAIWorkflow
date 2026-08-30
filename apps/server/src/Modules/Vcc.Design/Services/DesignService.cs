using Microsoft.EntityFrameworkCore;
using Vcc.Design.Common;
using Vcc.Design.Contracts;
using Vcc.Design.Generation;
using Vcc.Design.Mapping;
using Vcc.Domain.Entities;
using Vcc.Infrastructure.Persistence.Abstractions;

namespace Vcc.Design.Services;

public sealed class DesignService(IDesignDbContext db, IDesignMapper mapper) : IDesignService
{
    public async Task<IReadOnlyList<DesignDto>> ListAsync(string projectId, CancellationToken ct)
    {
        var designs = await db.Designs.Where(d => d.ProjectId == projectId).OrderByDescending(d => d.CreatedAt).ToListAsync(ct);
        var ids = designs.Select(d => d.Id).ToList();
        var counts = await db.DesignArtifacts.Where(a => ids.Contains(a.DesignId))
            .GroupBy(a => a.DesignId).Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct);
        var map = counts.ToDictionary(c => c.Key, c => c.Count);
        return designs.Select(d => mapper.ToDto(d, map.GetValueOrDefault(d.Id, 0))).ToList();
    }

    public async Task<DesignDto> CreateAsync(CreateDesignInput input, CancellationToken ct)
    {
        var design = new Domain.Entities.Design { ProjectId = input.ProjectId, Name = input.Name, Description = input.Description ?? "" };
        db.Designs.Add(design);
        await db.SaveChangesAsync(ct);
        return mapper.ToDto(design, 0);
    }

    public async Task<DesignDto?> GetAsync(string id, CancellationToken ct)
    {
        var design = await db.Designs.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (design is null) return null;
        var count = await db.DesignArtifacts.CountAsync(a => a.DesignId == id, ct);
        return mapper.ToDto(design, count);
    }

    public async Task<DesignDto?> UpdateAsync(string id, UpdateDesignInput input, CancellationToken ct)
    {
        var design = await db.Designs.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (design is null) return null;
        if (input.Name is not null) design.Name = input.Name;
        if (input.Description is not null) design.Description = input.Description;
        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        var design = await db.Designs.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (design is null) return false;
        var artifacts = await db.DesignArtifacts.Where(a => a.DesignId == id).ToListAsync(ct);
        var artifactIds = artifacts.Select(a => a.Id).ToList();
        db.DesignVersions.RemoveRange(db.DesignVersions.Where(v => artifactIds.Contains(v.ArtifactId)));
        db.DesignArtifacts.RemoveRange(artifacts);
        db.Designs.Remove(design);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<DesignArtifactDto>> ArtifactsAsync(string designId, CancellationToken ct)
        => (await db.DesignArtifacts.Where(a => a.DesignId == designId).OrderBy(a => a.CreatedAt).ToListAsync(ct)).Select(mapper.ToDto).ToList();

    public async Task<DesignArtifactDto> CreateArtifactAsync(CreateDesignArtifactInput input, CancellationToken ct)
    {
        var kind = input.Kind ?? DesignFormats.DefaultKind;
        var artifact = new DesignArtifact
        {
            DesignId = input.DesignId,
            Kind = kind,
            Title = input.Title,
            Format = DesignFormats.ForKind(kind),
            Content = input.Content ?? "",
        };
        db.DesignArtifacts.Add(artifact);
        await db.SaveChangesAsync(ct);
        return mapper.ToDto(artifact);
    }

    public async Task<DesignArtifactDto?> GetArtifactAsync(string id, CancellationToken ct)
    {
        var a = await db.DesignArtifacts.FirstOrDefaultAsync(x => x.Id == id, ct);
        return a is null ? null : mapper.ToDto(a);
    }

    public async Task<DesignArtifactDto?> UpdateArtifactAsync(string id, UpdateDesignArtifactInput input, CancellationToken ct)
    {
        var a = await db.DesignArtifacts.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (a is null) return null;
        if (input.Content is not null && input.Content != a.Content)
        {
            db.DesignVersions.Add(new DesignVersion { ArtifactId = a.Id, Build = a.Version, Content = a.Content });
            a.Version += 1;
            a.Content = input.Content;
        }
        if (input.Title is not null) a.Title = input.Title;
        a.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return mapper.ToDto(a);
    }

    public async Task<bool> DeleteArtifactAsync(string id, CancellationToken ct)
    {
        var a = await db.DesignArtifacts.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (a is null) return false;
        db.DesignVersions.RemoveRange(db.DesignVersions.Where(v => v.ArtifactId == id));
        db.DesignArtifacts.Remove(a);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IReadOnlyList<DesignVersionDto>> VersionsAsync(string artifactId, CancellationToken ct)
        => (await db.DesignVersions.Where(v => v.ArtifactId == artifactId).OrderByDescending(v => v.Build).ToListAsync(ct)).Select(mapper.ToDto).ToList();

    public async Task<DesignArtifactDto?> RestoreVersionAsync(string artifactId, string versionId, CancellationToken ct)
    {
        var a = await db.DesignArtifacts.FirstOrDefaultAsync(x => x.Id == artifactId, ct);
        var version = await db.DesignVersions.FirstOrDefaultAsync(v => v.Id == versionId, ct);
        if (a is null || version is null) return null;
        db.DesignVersions.Add(new DesignVersion { ArtifactId = a.Id, Build = a.Version, Content = a.Content });
        a.Version += 1;
        a.Content = version.Content;
        a.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return mapper.ToDto(a);
    }

    public async Task<DesignArtifactDto?> GenerateArtifactAsync(string artifactId, GenerateArtifactInput input, CancellationToken ct)
    {
        var a = await db.DesignArtifacts.FirstOrDefaultAsync(x => x.Id == artifactId, ct);
        if (a is null) return null;
        var generated = DesignGenerator.Generate(a.Kind, input.Requirement);
        if (a.Content.Length > 0)
        {
            db.DesignVersions.Add(new DesignVersion { ArtifactId = a.Id, Build = a.Version, Content = a.Content });
            a.Version += 1;
        }
        a.Content = generated;
        a.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return mapper.ToDto(a);
    }

    public DesignPreviewResult GeneratePreview(GeneratePreviewInput input)
    {
        var kind = input.Kind ?? DesignFormats.DefaultKind;
        var content = DesignGenerator.Generate(kind, input.Requirement);
        return new DesignPreviewResult(content, DesignFormats.ForKind(kind), $"Generated {kind} for: {input.Requirement}");
    }

    public IReadOnlyList<object> Workflows() => DesignGenerator.Workflows;
}
