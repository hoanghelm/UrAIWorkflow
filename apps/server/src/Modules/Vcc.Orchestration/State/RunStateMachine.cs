using Vcc.Domain.Entities;
using Vcc.Shared.Application.Common;

namespace Vcc.Orchestration.State;

public interface IRunStateMachine
{
    bool Apply(Run run, RunTrigger trigger, string? reason = null, string? question = null);
    RunStatus StatusOf(Run run);
}

public sealed class RunStateMachine : IRunStateMachine
{
    public RunStatus StatusOf(Run run) => FromWire(run.Status);

    public bool Apply(Run run, RunTrigger trigger, string? reason = null, string? question = null)
    {
        var from = FromWire(run.Status);
        var (legal, noop, to) = Resolve(from, trigger);
        if (!legal) throw new InvalidRunTransitionException(from, trigger);
        if (noop) return false;

        run.Status = ToWire(to);
        switch (trigger)
        {
            case RunTrigger.Resume:
            case RunTrigger.Rerun:
            case RunTrigger.Complete:
                run.Question = null;
                run.Breach = null;
                break;
            case RunTrigger.AwaitInput:
                run.Question = question;
                run.Breach = reason;
                break;
            case RunTrigger.Fail:
                run.Question = null;
                if (reason is not null) run.Breach = reason;
                break;
            case RunTrigger.Cancel:
                if (reason is not null) run.Breach = reason;
                break;
        }
        run.UpdatedAt = DateTime.UtcNow;
        return true;
    }

    private static (bool legal, bool noop, RunStatus to) Resolve(RunStatus from, RunTrigger trigger) => trigger switch
    {
        RunTrigger.Begin => from is RunStatus.Pending or RunStatus.Running
            ? (true, false, RunStatus.Running)
            : (false, false, default),
        RunTrigger.AwaitInput => from is RunStatus.Running
            ? (true, false, RunStatus.NeedsInput)
            : (false, false, default),
        RunTrigger.Complete => from is RunStatus.Running
            ? (true, false, RunStatus.Done)
            : (false, false, default),
        RunTrigger.Fail => IsTerminal(from)
            ? (true, true, default)
            : (true, false, RunStatus.Failed),
        RunTrigger.Cancel => IsTerminal(from)
            ? (true, true, default)
            : (true, false, RunStatus.Cancelled),
        RunTrigger.Resume => from is RunStatus.NeedsInput or RunStatus.Failed or RunStatus.Cancelled
            ? (true, false, RunStatus.Running)
            : (false, false, default),
        RunTrigger.Rerun => (true, false, RunStatus.Running),
        _ => (false, false, default),
    };

    private static bool IsTerminal(RunStatus s) => s is RunStatus.Done or RunStatus.Failed or RunStatus.Cancelled;

    private static RunStatus FromWire(string status) => status switch
    {
        "running" => RunStatus.Running,
        "waiting" => RunStatus.NeedsInput,
        "done" => RunStatus.Done,
        "stopped" => RunStatus.Cancelled,
        "failed" => RunStatus.Failed,
        _ => RunStatus.Pending,
    };

    private static string ToWire(RunStatus status) => status switch
    {
        RunStatus.Running => "running",
        RunStatus.NeedsInput => "waiting",
        RunStatus.Done => "done",
        RunStatus.Cancelled => "stopped",
        RunStatus.Failed => "failed",
        _ => "pending",
    };
}
