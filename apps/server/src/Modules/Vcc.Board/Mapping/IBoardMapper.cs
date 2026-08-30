using Vcc.Board.Contracts;
using Vcc.Domain.Entities;

namespace Vcc.Board.Mapping;

public interface IBoardMapper
{
    BoardCardDto ToDto(BoardCard card);
    SprintDto ToDto(Sprint sprint);
    BoardCommentDto ToDto(BoardComment comment);
    BoardAutomationDto ToDto(BoardAutomation automation);
    ArtifactVersionDto ToVersionDto(Artifact artifact, string type);
    BundleDto ToBundleDto(Artifact artifact);
    IReadOnlyList<string> ParseStrings(string json);
    IReadOnlyList<ArtifactFileRef> ParseFiles(string json);
    string SerializeStrings(IEnumerable<string> values);
    string SerializeArtifacts(IEnumerable<ArtifactRef> refs);
}
