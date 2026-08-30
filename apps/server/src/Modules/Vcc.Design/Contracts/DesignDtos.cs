namespace Vcc.Design.Contracts;

public sealed record DesignDto(string Id, string ProjectId, string Name, string Description, string CreatedAt, int ArtifactCount);

public sealed record DesignArtifactDto(
    string Id, string DesignId, string Kind, string Title, string Format, string Content,
    int Version, string CreatedAt, string UpdatedAt);

public sealed record DesignVersionDto(string Id, string ArtifactId, int Build, string Content, string CreatedAt);

public sealed record DesignPreviewResult(string Content, string Format, string Summary);
