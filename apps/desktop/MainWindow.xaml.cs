using System.IO;
using System.Net.Http;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace Vcc.Desktop;

public partial class MainWindow : Window
{
    private static readonly string BaseUrl = Environment.GetEnvironmentVariable("VCC_URL") ?? "http://localhost:5086";
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(3) };

    public MainWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "VCC-Workflow", "WebView2");
            Directory.CreateDirectory(userData);
            var env = await CoreWebView2Environment.CreateAsync(null, userData);
            await Web.EnsureCoreWebView2Async(env);
        }
        catch (Exception ex)
        {
            Status.Text = $"WebView2 failed to start: {ex.Message}";
            return;
        }

        Web.CoreWebView2.NavigationCompleted += (_, args) =>
        {
            if (!args.IsSuccess) return;
            Splash.Visibility = Visibility.Collapsed;
            Web.Visibility = Visibility.Visible;
        };

        await WaitForServiceAsync();
        Web.Source = new Uri(BaseUrl);
    }

    private async Task WaitForServiceAsync()
    {
        for (var attempt = 1; attempt <= 120; attempt++)
        {
            try
            {
                using var resp = await Http.GetAsync($"{BaseUrl}/api/health");
                if (resp.IsSuccessStatusCode) return;
            }
            catch
            {
            }

            Status.Text = attempt <= 5 ? "Loading resources…" : "Starting local service…";
            await Task.Delay(1000);
        }

        Status.Text = "Could not reach the local service. Check the VCC-Workflow Windows service, then reopen.";
    }
}
