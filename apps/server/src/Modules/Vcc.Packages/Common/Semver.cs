namespace Vcc.Packages.Common;

public static class Semver
{
    public static (int, int, int) Key(string v)
    {
        var core = v.Split('-')[0].Split('.');
        int P(int i) => i < core.Length && int.TryParse(core[i], out var n) ? n : 0;
        return (P(0), P(1), P(2));
    }

    public static int Compare(string a, string b) => Key(a).CompareTo(Key(b));
}
