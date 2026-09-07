namespace Vcc.Orchestration.State;

public enum RunTrigger
{
    Begin,
    AwaitInput,
    Complete,
    Fail,
    Cancel,
    Resume,
    Rerun,
}
