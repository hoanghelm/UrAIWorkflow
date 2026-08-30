using Vcc.Board.Contracts;

namespace Vcc.Board.Preview;

public interface IPreviewStateStore
{
    PreviewStateDto? Get(string cardId);
    void Set(string cardId, PreviewStateDto state);
    void Remove(string cardId);
}
