namespace Vcc.Migrations.Abstractions;

public sealed class SchemaContext
{
    private readonly List<string> _statements = [];
    public void Execute(string sql) => _statements.Add(sql);
    public IReadOnlyList<string> Statements => _statements;
}
