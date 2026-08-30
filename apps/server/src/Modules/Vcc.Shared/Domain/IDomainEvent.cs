namespace Vcc.Shared.Domain;

public interface IDomainEvent
{
    DateTimeOffset OccurredAt { get; }
}
