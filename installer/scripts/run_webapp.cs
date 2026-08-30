using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

namespace AKLI_WebApp
{
    class Program
    {
        static void Main(string[] args)
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string serverJs = Path.Combine(baseDir, "server.js");

                if (!File.Exists(serverJs))
                {
                    Console.WriteLine("Error: Web app server file not found at: " + serverJs);
                    Console.WriteLine("Please ensure the application was installed correctly.");
                    Console.WriteLine("Press any key to exit...");
                    Console.ReadKey();
                    return;
                }

                Console.WriteLine("Starting AKLI Web App Server...");
                Console.WriteLine("Ensuring MySQL Service is running...");
                StartMySQLService();
                Console.WriteLine("The server will run in the background. Keep this window open to keep the server running.");
                Console.WriteLine("Close this window to stop the server.");

                var psi = new ProcessStartInfo
                {
                    FileName = "node",
                    Arguments = string.Format("\"{0}\"", serverJs),
                    WorkingDirectory = baseDir,
                    UseShellExecute = false,
                    CreateNoWindow = false
                };

                // Pass the port via environment variables
                psi.EnvironmentVariables["PORT"] = "3000";
                psi.EnvironmentVariables["NODE_ENV"] = "production";

                using (var process = Process.Start(psi))
                {
                    process.WaitForExit();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Failed to start the web app: " + ex.Message);
                Console.WriteLine("Press any key to exit...");
                Console.ReadKey();
            }
        }
        static void StartMySQLService()
        {
            try
            {
                // Try to find the MySQL service and start it if it's not running
                Process process = new Process();
                process.StartInfo.FileName = "powershell.exe";
                process.StartInfo.Arguments = "-Command \"$service = Get-Service -Name MySQL* -ErrorAction SilentlyContinue; if ($service) { if ($service.Status -ne 'Running') { Start-Service -Name $service.Name -ErrorAction SilentlyContinue } }\"";
                process.StartInfo.UseShellExecute = false;
                process.StartInfo.CreateNoWindow = true;
                process.Start();
                process.WaitForExit(3000); // Wait up to 3 seconds
            }
            catch (Exception)
            {
                // Silently ignore if we can't start the service (e.g. lack of elevation)
            }
        }
    }
}
