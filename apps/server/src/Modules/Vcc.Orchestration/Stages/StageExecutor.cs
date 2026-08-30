using System.Text;
using Vcc.Orchestration.Context;
using Vcc.Shared.Application.Interfaces;
using Vcc.Orchestration.Workflow;
using Vcc.Orchestration.Events;

namespace Vcc.Orchestration.Stages;

public sealed record StageExecutionContext(string RunId, string ProjectId, StageDef Stage, GuardrailsDef Guardrails, string Model, string Prompt, string Cwd);

public sealed record StageOutcome(bool Passed, string Output, string Breach, int TokensSpent, int Attempts, string LogText, string LogTrace);

public interface IStageExecutor
{
    Task<StageOutcome> ExecuteAsync(StageExecutionContext ctx, CancellationToken runCt);
}

public sealed class StageExecutor(IConnectorRouter connectors, IMetricsRecorder metrics, IStageVerifier verifier, IVerdictParser verdicts, IRunEventLog events) : IStageExecutor
{
    public async Task<StageOutcome> ExecuteAsync(StageExecutionContext ctx, CancellationToken runCt)
    {
        var g = ctx.Guardrails;
        var logText = new StringBuilder();
        var logTrace = new StringBuilder();
        var tokens = 0;
        var attempts = 0;

        async Task<(bool passed, string output, string breach)> Attempt(string model)
        {
            attempts++;
            var trace = new StringBuilder();
            using var stageCts = CancellationTokenSource.CreateLinkedTokenSource(runCt);
            stageCts.CancelAfter(g.StageTimeoutMs);
            StageResult result;
            try
            {
                var req = new StageRequest(ctx.RunId, ctx.Stage.Id, ctx.ProjectId, model, ctx.Prompt, ctx.Cwd);
                result = await connectors.RunStageAsync(req,
                    line => { trace.AppendLine(line); return events.DeltaAsync(ctx.RunId, ctx.Stage.Id, line, runCt); }, stageCts.Token);
            }
            catch (OperationCanceledException) when (runCt.IsCancellationRequested) { throw; }
            catch (OperationCanceledException)
            {
                Append(logText, "stage timed out");
                Append(logTrace, trace.ToString());
                return (false, "stage timed out", "timeout");
            }

            await metrics.RecordAsync(ctx.RunId, ctx.Stage.Id, result.InputTokens, result.OutputTokens, runCt);
            tokens += result.InputTokens + result.OutputTokens;
            Append(logText, result.Output);
            Append(logTrace, trace.ToString());

            if (!result.Passed) return (false, result.Output, "retry_exhausted");

            if (!string.IsNullOrEmpty(ctx.Stage.Verify) && !ctx.Stage.Verify!.Equals("none", StringComparison.OrdinalIgnoreCase))
            {
                VerifyResult vr;
                try { vr = await verifier.VerifyAsync(ctx.Cwd, ctx.Stage.Verify!, stageCts.Token); }
                catch (OperationCanceledException) when (runCt.IsCancellationRequested) { throw; }
                catch (OperationCanceledException) { vr = new VerifyResult(false, "verify timed out"); }
                Append(logText, "[verify] " + vr.Detail);
                await events.TraceAsync(ctx.RunId, ctx.Stage.Id, "[verify] " + (vr.Ok ? "passed" : "failed"), runCt);
                if (!vr.Ok && g.QualityThreshold != "advisory") return (false, result.Output, "quality_fail");
            }

            var verdict = verdicts.Parse(result.Output);
            if (verdict is { Passed: false } && g.QualityThreshold != "advisory")
            {
                var detail = verdict.Issues.Count > 0 ? string.Join("; ", verdict.Issues) : "reviewer rejected the result";
                Append(logText, "[verdict] " + detail);
                await events.TraceAsync(ctx.RunId, ctx.Stage.Id, "[verdict] rejected", runCt);
                return (false, verdict.Issues.Count > 0 ? string.Join("\n", verdict.Issues) : result.Output, "quality_fail");
            }

            return (true, result.Output, "");
        }

        var passed = false; var output = ""; var breach = "retry_exhausted";
        var maxAttempts = Math.Max(1, g.MaxRetries + 1);
        for (var a = 1; a <= maxAttempts; a++)
        {
            (passed, output, breach) = await Attempt(ctx.Model);
            if (passed) break;
            if (a < maxAttempts)
                await events.EmitAsync(ctx.RunId, "warn", ctx.Stage.Id, "running", null, $"retry {a}/{g.MaxRetries} for {ctx.Stage.Title} ({breach})", runCt);
        }

        if (!passed && g.OnBreach == "fallback" && !string.IsNullOrEmpty(g.FallbackModel))
        {
            await events.EmitAsync(ctx.RunId, "warn", ctx.Stage.Id, "running", null, $"falling back to {g.FallbackModel}", runCt);
            (passed, output, breach) = await Attempt(g.FallbackModel!);
        }

        return new StageOutcome(passed, output, breach, tokens, attempts, logText.ToString(), logTrace.ToString());
    }

    private static void Append(StringBuilder sb, string add)
    {
        if (string.IsNullOrEmpty(add)) return;
        if (sb.Length > 0) sb.Append('\n');
        sb.Append(add);
    }
}
