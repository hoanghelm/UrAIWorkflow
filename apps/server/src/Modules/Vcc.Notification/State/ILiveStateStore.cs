namespace Vcc.Notification.State;

public interface ILiveStateStore
{
    void Set(string key, object value);
    object? Get(string key);
}
