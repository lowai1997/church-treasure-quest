using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
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
        private readonly Label statusLabel = new Label();

        public MainForm()
        {
            Text = "Church Game Photo Setup";
            Width = 620;
            Height = 330;
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

            statusLabel.Left = 18;
            statusLabel.Top = 252;
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
}
