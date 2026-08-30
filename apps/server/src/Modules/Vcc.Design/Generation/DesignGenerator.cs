using System.Net;

namespace Vcc.Design.Generation;

internal static class DesignGenerator
{
    public static string Generate(string kind, string requirement)
    {
        var safe = WebUtility.HtmlEncode(requirement.Trim());
        return kind switch
        {
            "flow" => Mermaid(requirement),
            "diagram" => Mermaid(requirement),
            "design-system" => DesignSystem(safe),
            "wireframe" => Wireframe(safe),
            _ => Mockup(safe),
        };
    }

    private static string Mermaid(string requirement)
    {
        var steps = requirement.Split([',', '.', ';', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(s => s.Length > 0).Take(6).ToList();
        if (steps.Count == 0) steps = ["Start", "Process", "End"];
        var lines = new List<string> { "flowchart TD" };
        for (var i = 0; i < steps.Count; i++)
        {
            var label = steps[i].Replace("\"", "'");
            lines.Add($"    n{i}[\"{label}\"]");
            if (i > 0) lines.Add($"    n{i - 1} --> n{i}");
        }
        return string.Join("\n", lines);
    }

    private static string Shell(string title, string body) => $$"""
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{{title}}</title>
<style>
  :root { --bg:#0b0d10; --panel:#14171c; --line:#232830; --text:#e6e9ee; --muted:#8b93a1; --accent:#5b8cff; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:'Inter',system-ui,sans-serif; background:var(--bg); color:var(--text); }
  header { padding:20px 28px; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; }
  header h1 { font-size:18px; margin:0; }
  .btn { background:var(--accent); color:#fff; border:0; border-radius:8px; padding:9px 16px; font-weight:600; cursor:pointer; }
  main { padding:28px; max-width:1080px; margin:0 auto; }
  .grid { display:grid; gap:16px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:20px; }
  .muted { color:var(--muted); }
</style>
</head>
<body>
{{body}}
</body>
</html>
""";

    private static string Mockup(string requirement) => Shell($"Mockup", $$"""
<header>
  <h1>{{requirement}}</h1>
  <button class="btn">Primary action</button>
</header>
<main>
  <div class="grid" style="grid-template-columns:repeat(3,1fr)">
    <div class="card"><h3>Overview</h3><p class="muted">Summary panel for {{requirement}}.</p></div>
    <div class="card"><h3>Details</h3><p class="muted">Key fields and status.</p></div>
    <div class="card"><h3>Activity</h3><p class="muted">Recent events and history.</p></div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Content</h3><p class="muted">Main working area.</p></div>
</main>
""");

    private static string Wireframe(string requirement) => Shell("Wireframe", $$"""
<header><h1>{{requirement}}</h1><span class="muted">wireframe</span></header>
<main>
  <div class="grid" style="grid-template-columns:220px 1fr">
    <div class="card"><div class="muted">Navigation</div></div>
    <div class="grid">
      <div class="card" style="height:80px"></div>
      <div class="card" style="height:200px"></div>
      <div class="grid" style="grid-template-columns:1fr 1fr">
        <div class="card" style="height:120px"></div>
        <div class="card" style="height:120px"></div>
      </div>
    </div>
  </div>
</main>
""");

    private static string DesignSystem(string requirement) => Shell("Design System", $$"""
<header><h1>{{requirement}} design system</h1></header>
<main>
  <div class="card"><h3>Colors</h3>
    <div style="display:flex;gap:10px;margin-top:10px">
      <div style="width:56px;height:56px;border-radius:8px;background:#5b8cff"></div>
      <div style="width:56px;height:56px;border-radius:8px;background:#14171c;border:1px solid #232830"></div>
      <div style="width:56px;height:56px;border-radius:8px;background:#e6e9ee"></div>
    </div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Typography</h3>
    <p style="font-size:28px;margin:6px 0">Heading</p>
    <p style="margin:6px 0">Body text</p>
    <p class="muted" style="margin:6px 0">Muted caption</p>
  </div>
  <div class="card" style="margin-top:16px"><h3>Buttons</h3>
    <button class="btn">Primary</button>
  </div>
</main>
""");

    public static readonly IReadOnlyList<object> Workflows =
    [
        new { kind = "mockup", label = "UI Mockup", agent = "design", agentTitle = "Design Engineer", model = "sonnet",
              steps = new[] { new { name = "frame", detail = "Define layout and regions" }, new { name = "style", detail = "Apply the visual system" }, new { name = "polish", detail = "Refine spacing and states" } },
              skills = new[] { new { name = "html-ui", title = "HTML UI" } }, rules = new[] { "self-contained HTML" }, commands = Array.Empty<string>() },
        new { kind = "wireframe", label = "Wireframe", agent = "design", agentTitle = "Design Engineer", model = "haiku",
              steps = new[] { new { name = "blocks", detail = "Lay out low-fidelity blocks" }, new { name = "flow", detail = "Connect the primary path" } },
              skills = new[] { new { name = "html-ui", title = "HTML UI" } }, rules = new[] { "grayscale only" }, commands = Array.Empty<string>() },
        new { kind = "flow", label = "Flow Diagram", agent = "design", agentTitle = "Design Engineer", model = "sonnet",
              steps = new[] { new { name = "nodes", detail = "Identify steps" }, new { name = "edges", detail = "Connect transitions" } },
              skills = new[] { new { name = "mermaid", title = "Mermaid" } }, rules = new[] { "mermaid flowchart" }, commands = Array.Empty<string>() },
        new { kind = "design-system", label = "Design System", agent = "design", agentTitle = "Design Engineer", model = "sonnet",
              steps = new[] { new { name = "tokens", detail = "Colors and type" }, new { name = "components", detail = "Buttons and cards" } },
              skills = new[] { new { name = "html-ui", title = "HTML UI" } }, rules = new[] { "token driven" }, commands = Array.Empty<string>() },
    ];
}
