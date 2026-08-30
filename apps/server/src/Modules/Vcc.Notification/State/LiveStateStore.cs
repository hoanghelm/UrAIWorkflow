using System.Collections.Concurrent;

namespace Vcc.Notification.State;

public sealed class LiveStateStore : ILiveStateStore
{
    private readonly ConcurrentDictionary<string, object> _state = new();

    public void Set(string key, object value) => _state[key] = value;

    public object? Get(string key) => _state.TryGetValue(key, out var v) ? v : null;
}
