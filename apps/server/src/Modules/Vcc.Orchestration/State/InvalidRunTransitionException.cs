using Vcc.Shared.Application.Common;

namespace Vcc.Orchestration.State;

public sealed class InvalidRunTransitionException(RunStatus from, RunTrigger trigger)
    : Exception($"Illegal run transition: {trigger} from {from}")
{
    public RunStatus From { get; } = from;
    public RunTrigger Trigger { get; } = trigger;
}
