using Vcc.Domain.Entities;
using Vcc.Orchestration.State;

namespace Vcc.Modules.Tests;

public sealed class RunStateMachineTests
{
    private readonly RunStateMachine _sm = new();
    private static Run Run(string status) => new() { Id = "r", Status = status };

    [Fact]
    public void Begin_FromPending_SetsRunning()
    {
        var run = Run("pending");
        Assert.True(_sm.Apply(run, RunTrigger.Begin));
        Assert.Equal("running", run.Status);
    }

    [Fact]
    public void Begin_FromRunning_IsIdempotent()
    {
        var run = Run("running");
        Assert.True(_sm.Apply(run, RunTrigger.Begin));
        Assert.Equal("running", run.Status);
    }

    [Fact]
    public void AwaitInput_SetsWaiting_WithQuestionAndReason()
    {
        var run = Run("running");
        _sm.Apply(run, RunTrigger.AwaitInput, reason: "budget_hit", question: "Resume?");
        Assert.Equal("waiting", run.Status);
        Assert.Equal("budget_hit", run.Breach);
        Assert.Equal("Resume?", run.Question);
    }

    [Fact]
    public void Complete_FromRunning_ClearsQuestionAndBreach()
    {
        var run = Run("running");
        run.Question = "q"; run.Breach = "b";
        _sm.Apply(run, RunTrigger.Complete);
        Assert.Equal("done", run.Status);
        Assert.Null(run.Question);
        Assert.Null(run.Breach);
    }

    [Fact]
    public void Cancel_FromRunning_SetsStopped_WithBreach()
    {
        var run = Run("running");
        Assert.True(_sm.Apply(run, RunTrigger.Cancel, "user_stop"));
        Assert.Equal("stopped", run.Status);
        Assert.Equal("user_stop", run.Breach);
    }

    [Fact]
    public void Cancel_OnTerminalRun_IsNoOp()
    {
        var run = Run("done");
        Assert.False(_sm.Apply(run, RunTrigger.Cancel, "user_stop"));
        Assert.Equal("done", run.Status);
    }

    [Fact]
    public void Fail_OnTerminalRun_IsNoOp()
    {
        var run = Run("stopped");
        Assert.False(_sm.Apply(run, RunTrigger.Fail));
        Assert.Equal("stopped", run.Status);
    }

    [Fact]
    public void Resume_FromWaiting_SetsRunning_ClearsQuestion()
    {
        var run = Run("waiting");
        run.Question = "q"; run.Breach = "b";
        _sm.Apply(run, RunTrigger.Resume);
        Assert.Equal("running", run.Status);
        Assert.Null(run.Question);
        Assert.Null(run.Breach);
    }

    [Fact]
    public void Complete_FromPending_Throws()
        => Assert.Throws<InvalidRunTransitionException>(() => _sm.Apply(Run("pending"), RunTrigger.Complete));

    [Fact]
    public void AwaitInput_FromDone_Throws()
        => Assert.Throws<InvalidRunTransitionException>(() => _sm.Apply(Run("done"), RunTrigger.AwaitInput));
}
