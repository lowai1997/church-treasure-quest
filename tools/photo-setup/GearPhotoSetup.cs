using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace ChurchGamePhotoSetup
{
    public class MainForm : Form
    {
        private readonly ComboBox typeBox = new ComboBox();
        private readonly TextBox nameBox = new TextBox();
        private readonly TextBox imageBox = new TextBox();
        private readonly TextBox projectBox = new TextBox();
        private readonly TextBox commitBox = new TextBox();
        private readonly CheckBox photoOnlyBox = new CheckBox();
        private readonly CheckBox runCheckBox = new CheckBox();
        private readonly Label statusLabel = new Label();

        public MainForm()
        {
            Text = "Church Game Photo Setup";
            Width = 620;
            Height = 450;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;

            var root = FindProjectRoot(AppDomain.CurrentDomain.BaseDirectory) ?? FindProjectRoot(Environment.CurrentDirectory) ?? "";

            var title = new Label
            {
                Text = "Map an exact gear or boss name to a local image file.",
                Left = 18,
                Top = 16,
                Width = 560,
                Height = 24,
                Font = new Font(Font.FontFamily, 10, FontStyle.Bold)
            };
            Controls.Add(title);

            AddLabel("Project folder", 18, 55);
            projectBox.Left = 140;
            projectBox.Top = 52;
            projectBox.Width = 340;
            projectBox.ReadOnly = true;
            projectBox.Text = root;
            Controls.Add(projectBox);

            var projectButton = new Button { Text = "Browse", Left = 490, Top = 50, Width = 90 };
            projectButton.Click += delegate { BrowseProjectFolder(); };
            Controls.Add(projectButton);

            AddLabel("Image type", 18, 92);
            typeBox.Left = 140;
            typeBox.Top = 89;
            typeBox.Width = 160;
            typeBox.DropDownStyle = ComboBoxStyle.DropDownList;
            typeBox.Items.AddRange(new object[] { "Gear", "Boss" });
            typeBox.SelectedIndex = 0;
            Controls.Add(typeBox);

            AddLabel("Exact game name", 18, 129);
            nameBox.Left = 140;
            nameBox.Top = 126;
            nameBox.Width = 440;
            Controls.Add(nameBox);

            AddLabel("Image file", 18, 166);
            imageBox.Left = 140;
            imageBox.Top = 163;
            imageBox.Width = 340;
            imageBox.ReadOnly = true;
            Controls.Add(imageBox);

            var imageButton = new Button { Text = "Choose", Left = 490, Top = 161, Width = 90 };
            imageButton.Click += delegate { BrowseImageFile(); };
            Controls.Add(imageButton);

            var setupButton = new Button
            {
                Text = "Set Up Image",
                Left = 140,
                Top = 205,
                Width = 160,
                Height = 36
            };
            setupButton.Click += delegate { RunSetup(); };
            Controls.Add(setupButton);

            var publishTitle = new Label
            {
                Text = "Publish the photo update to GitHub and trigger the internet version.",
                Left = 18,
                Top = 260,
                Width = 560,
                Height = 24,
                Font = new Font(Font.FontFamily, 10, FontStyle.Bold)
            };
            Controls.Add(publishTitle);

            AddLabel("Commit message", 18, 299);
            commitBox.Left = 140;
            commitBox.Top = 296;
            commitBox.Width = 440;
            commitBox.Text = "Update gear and boss photos";
            Controls.Add(commitBox);

            runCheckBox.Left = 140;
            runCheckBox.Top = 328;
            runCheckBox.Width = 210;
            runCheckBox.Checked = true;
            runCheckBox.Text = "Run npm check first";
            Controls.Add(runCheckBox);

            photoOnlyBox.Left = 350;
            photoOnlyBox.Top = 328;
            photoOnlyBox.Width = 230;
            photoOnlyBox.Checked = true;
            photoOnlyBox.Text = "Publish photo files only";
            Controls.Add(photoOnlyBox);

            var publishButton = new Button
            {
                Text = "Publish Photo Update",
                Left = 140,
                Top = 359,
                Width = 180,
                Height = 36
            };
            publishButton.Click += delegate { RunPublish(); };
            Controls.Add(publishButton);

            statusLabel.Left = 18;
            statusLabel.Top = 402;
            statusLabel.Width = 560;
            statusLabel.Height = 40;
            statusLabel.Text = "Images are copied into frontend/assets/custom. No gear or boss photo is stored in the database.";
            Controls.Add(statusLabel);
        }

        private void AddLabel(string text, int left, int top)
        {
            Controls.Add(new Label { Text = text, Left = left, Top = top + 4, Width = 115, Height = 22 });
        }

        private void BrowseProjectFolder()
        {
            using (var dialog = new FolderBrowserDialog())
            {
                dialog.Description = "Select the church-treasure-quest project folder";
                dialog.ShowNewFolderButton = false;

                if (dialog.ShowDialog(this) == DialogResult.OK)
                {
                    projectBox.Text = dialog.SelectedPath;
                }
            }
        }

        private void BrowseImageFile()
        {
            using (var dialog = new OpenFileDialog())
            {
                dialog.Title = "Select image file";
                dialog.Filter = "Image files (*.png;*.jpg;*.jpeg;*.webp)|*.png;*.jpg;*.jpeg;*.webp|All files (*.*)|*.*";
                dialog.Multiselect = false;

                if (dialog.ShowDialog(this) == DialogResult.OK)
                {
                    imageBox.Text = dialog.FileName;
                }
            }
        }

        private void RunSetup()
        {
            try
            {
                var projectRoot = projectBox.Text.Trim();
                var customRoot = Path.Combine(projectRoot, "frontend", "assets", "custom");

                if (!Directory.Exists(customRoot) || !File.Exists(Path.Combine(projectRoot, "package.json")))
                {
                    throw new InvalidOperationException("Please select the church-treasure-quest project folder.");
                }

                var exactName = nameBox.Text.Trim();
                if (exactName.Length == 0)
                {
                    throw new InvalidOperationException("Please enter the exact name shown in the game.");
                }

                var imageFile = imageBox.Text.Trim();
                if (!File.Exists(imageFile))
                {
                    throw new InvalidOperationException("Please choose an image file.");
                }

                var isGear = String.Equals(typeBox.SelectedItem.ToString(), "Gear", StringComparison.OrdinalIgnoreCase);
                var folderName = isGear ? "gear" : "bosses";
                var mapFileName = isGear ? "gear-images.json" : "boss-images.json";
                var targetFolder = Path.Combine(customRoot, folderName);
                Directory.CreateDirectory(targetFolder);

                var extension = Path.GetExtension(imageFile).ToLowerInvariant();
                var safeName = SanitizeFileName(exactName);
                var targetName = safeName + extension;
                var targetPath = Path.Combine(targetFolder, targetName);

                if (File.Exists(targetPath))
                {
                    targetName = safeName + "-" + DateTime.Now.ToString("yyyyMMddHHmmss") + extension;
                    targetPath = Path.Combine(targetFolder, targetName);
                }

                File.Copy(imageFile, targetPath);

                var mapPath = Path.Combine(customRoot, mapFileName);
                var map = ReadMap(mapPath);
                var relativePath = "assets/custom/" + folderName + "/" + targetName;
                map[exactName] = relativePath;
                WriteMap(mapPath, map);

                statusLabel.Text = exactName + " -> " + relativePath;
                MessageBox.Show(this,
                    "Done.\n\n" + exactName + " -> " + relativePath + "\n\nCommit, push, and redeploy the project to publish it online.",
                    "Image setup complete",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, ex.Message, "Image setup failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void RunPublish()
        {
            try
            {
                var projectRoot = projectBox.Text.Trim();
                ValidateProjectRoot(projectRoot);

                var message = commitBox.Text.Trim();
                if (message.Length == 0)
                {
                    throw new InvalidOperationException("Please enter a commit message.");
                }

                var confirmText = photoOnlyBox.Checked
                    ? "This will publish files under frontend/assets/custom, commit them, and push to GitHub."
                    : "This will publish all current project changes, commit them, and push to GitHub.";

                if (MessageBox.Show(this,
                    confirmText + "\n\nRender will normally redeploy the internet version after GitHub receives the push.",
                    "Publish photo update?",
                    MessageBoxButtons.OKCancel,
                    MessageBoxIcon.Question) != DialogResult.OK)
                {
                    return;
                }

                Cursor = Cursors.WaitCursor;
                statusLabel.Text = "Publishing...";
                statusLabel.Refresh();

                var log = new StringBuilder();

                if (runCheckBox.Checked)
                {
                    AppendStep(log, "npm run check");
                    var check = RunCommand(projectRoot, "cmd.exe", "/c npm run check");
                    log.AppendLine(check.Output);
                    if (check.ExitCode != 0)
                    {
                        throw new InvalidOperationException("npm run check failed.\n\n" + ShortLog(log.ToString()));
                    }
                }

                if (photoOnlyBox.Checked)
                {
                    AppendStep(log, "git diff --cached --quiet before staging");
                    var stagedBefore = RunCommand(projectRoot, "git", "diff --cached --quiet");
                    log.AppendLine(stagedBefore.Output);
                    if (stagedBefore.ExitCode > 1)
                    {
                        throw new InvalidOperationException("Could not check existing staged changes.\n\n" + ShortLog(log.ToString()));
                    }

                    if (stagedBefore.ExitCode == 1)
                    {
                        throw new InvalidOperationException("There are already staged git changes. Please commit or unstage them before publishing photo files only.");
                    }
                }

                var addArgs = photoOnlyBox.Checked ? "add frontend/assets/custom" : "add -A";
                AppendStep(log, "git " + addArgs);
                var add = RunCommand(projectRoot, "git", addArgs);
                log.AppendLine(add.Output);
                if (add.ExitCode != 0)
                {
                    throw new InvalidOperationException("git add failed.\n\n" + ShortLog(log.ToString()));
                }

                AppendStep(log, "git diff --cached --quiet");
                var diff = RunCommand(projectRoot, "git", "diff --cached --quiet");
                log.AppendLine(diff.Output);
                if (diff.ExitCode > 1)
                {
                    throw new InvalidOperationException("Could not check staged changes.\n\n" + ShortLog(log.ToString()));
                }

                if (diff.ExitCode == 1)
                {
                    AppendStep(log, "git commit");
                    var commit = RunCommand(projectRoot, "git", "commit -m " + QuoteArgument(message));
                    log.AppendLine(commit.Output);
                    if (commit.ExitCode != 0)
                    {
                        throw new InvalidOperationException("git commit failed.\n\n" + ShortLog(log.ToString()));
                    }
                }
                else
                {
                    log.AppendLine("No new staged photo changes. The tool will still push the current branch.");
                }

                AppendStep(log, "git branch");
                var branch = RunCommand(projectRoot, "git", "rev-parse --abbrev-ref HEAD");
                log.AppendLine(branch.Output);
                if (branch.ExitCode != 0)
                {
                    throw new InvalidOperationException("Could not read the current git branch.\n\n" + ShortLog(log.ToString()));
                }

                var branchName = branch.Output.Trim();
                if (branchName.Length == 0 || branchName == "HEAD")
                {
                    throw new InvalidOperationException("Please switch to a named git branch before publishing.");
                }

                AppendStep(log, "git push origin " + branchName);
                var push = RunCommand(projectRoot, "git", "push origin " + QuoteArgument(branchName));
                log.AppendLine(push.Output);
                if (push.ExitCode != 0)
                {
                    throw new InvalidOperationException("git push failed.\n\n" + ShortLog(log.ToString()));
                }

                statusLabel.Text = "Published. GitHub received the update; Render should redeploy if auto deploy is enabled.";
                MessageBox.Show(this,
                    "Published successfully.\n\nGitHub received the update. If Render auto deploy is enabled, the internet version will update shortly.",
                    "Publish complete",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, ex.Message, "Publish failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
                statusLabel.Text = "Publish failed. Please read the message and try again.";
            }
            finally
            {
                Cursor = Cursors.Default;
            }
        }

        private static void ValidateProjectRoot(string projectRoot)
        {
            var customRoot = Path.Combine(projectRoot, "frontend", "assets", "custom");

            if (!Directory.Exists(customRoot) ||
                !File.Exists(Path.Combine(projectRoot, "package.json")) ||
                !Directory.Exists(Path.Combine(projectRoot, ".git")))
            {
                throw new InvalidOperationException("Please select the church-treasure-quest git project folder.");
            }
        }

        private static void AppendStep(StringBuilder log, string step)
        {
            log.AppendLine();
            log.AppendLine("> " + step);
        }

        private static CommandResult RunCommand(string workingDirectory, string fileName, string arguments)
        {
            var output = new StringBuilder();
            var process = new Process();
            process.StartInfo.FileName = fileName;
            process.StartInfo.Arguments = arguments;
            process.StartInfo.WorkingDirectory = workingDirectory;
            process.StartInfo.UseShellExecute = false;
            process.StartInfo.RedirectStandardOutput = true;
            process.StartInfo.RedirectStandardError = true;
            process.StartInfo.CreateNoWindow = true;
            process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs args)
            {
                if (args.Data != null)
                {
                    output.AppendLine(args.Data);
                }
            };
            process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs args)
            {
                if (args.Data != null)
                {
                    output.AppendLine(args.Data);
                }
            };

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            process.WaitForExit();

            return new CommandResult
            {
                ExitCode = process.ExitCode,
                Output = output.ToString()
            };
        }

        private static string QuoteArgument(string value)
        {
            return "\"" + value.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
        }

        private static string ShortLog(string value)
        {
            const int maxLength = 3000;
            if (String.IsNullOrEmpty(value) || value.Length <= maxLength)
            {
                return value;
            }

            return value.Substring(value.Length - maxLength);
        }

        private static string FindProjectRoot(string start)
        {
            var directory = new DirectoryInfo(start);

            while (directory != null)
            {
                var customPath = Path.Combine(directory.FullName, "frontend", "assets", "custom");
                var packagePath = Path.Combine(directory.FullName, "package.json");

                if (Directory.Exists(customPath) && File.Exists(packagePath))
                {
                    return directory.FullName;
                }

                directory = directory.Parent;
            }

            return null;
        }

        private static string SanitizeFileName(string value)
        {
            var safe = Regex.Replace(value.ToLowerInvariant(), "[^a-z0-9._-]+", "-").Trim('-');
            return String.IsNullOrWhiteSpace(safe) ? "image" : safe;
        }

        private static Dictionary<string, string> ReadMap(string path)
        {
            if (!File.Exists(path))
            {
                return new Dictionary<string, string>();
            }

            try
            {
                var json = File.ReadAllText(path, Encoding.UTF8);
                if (String.IsNullOrWhiteSpace(json))
                {
                    return new Dictionary<string, string>();
                }

                var serializer = new JavaScriptSerializer();
                return serializer.Deserialize<Dictionary<string, string>>(json) ?? new Dictionary<string, string>();
            }
            catch
            {
                return new Dictionary<string, string>();
            }
        }

        private static void WriteMap(string path, Dictionary<string, string> map)
        {
            var ordered = map.OrderBy(pair => pair.Key).ToDictionary(pair => pair.Key, pair => pair.Value);
            var serializer = new JavaScriptSerializer();
            var json = serializer.Serialize(ordered);
            File.WriteAllText(path, PrettyJson(json), new UTF8Encoding(false));
        }

        private static string PrettyJson(string json)
        {
            var indent = 0;
            var quoted = false;
            var builder = new StringBuilder();

            for (var i = 0; i < json.Length; i++)
            {
                var ch = json[i];
                if (ch == '"' && (i == 0 || json[i - 1] != '\\'))
                {
                    quoted = !quoted;
                }

                if (!quoted && (ch == '{' || ch == '['))
                {
                    builder.Append(ch).AppendLine();
                    builder.Append(new string(' ', ++indent * 2));
                }
                else if (!quoted && (ch == '}' || ch == ']'))
                {
                    builder.AppendLine();
                    builder.Append(new string(' ', --indent * 2)).Append(ch);
                }
                else if (!quoted && ch == ',')
                {
                    builder.Append(ch).AppendLine();
                    builder.Append(new string(' ', indent * 2));
                }
                else if (!quoted && ch == ':')
                {
                    builder.Append(": ");
                }
                else
                {
                    builder.Append(ch);
                }
            }

            return builder.ToString();
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }

    public class CommandResult
    {
        public int ExitCode { get; set; }
        public string Output { get; set; }
    }
}
