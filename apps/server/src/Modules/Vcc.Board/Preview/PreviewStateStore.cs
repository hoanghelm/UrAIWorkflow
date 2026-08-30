using System.Collections.Concurrent;
using Vcc.Board.Contracts;

namespace Vcc.Board.Preview;

public sealed class PreviewStateStore : IPreviewStateStore
{
    private readonly ConcurrentDictionary<string, PreviewStateDto> _states = new();

    public PreviewStateDto? Get(string cardId) => _states.TryGetValue(cardId, out var s) ? s : null;

    public void Set(string cardId, PreviewStateDto state) => _states[cardId] = state;

    public void Remove(string cardId) => _states.TryRemove(cardId, out _);
}
