namespace Vcc.Shared.Application.Common;

public enum DeploymentMode { Local, Hosted }

public enum RunStatus { Pending, Running, NeedsInput, Done, Failed, Cancelled }

public enum StageStatus { Pending, Running, Passed, Failed, Skipped }
