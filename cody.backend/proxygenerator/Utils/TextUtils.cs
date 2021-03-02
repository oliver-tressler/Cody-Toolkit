using System;
using System.Linq;
using System.Text;

namespace proxygenerator.Utils
{
    public static class TextUtils
    {
        public static string Indentation(int indentationLevel)
        {
            return new StringBuilder().Append('\t', indentationLevel).ToString();
        }

        public static string SmartLineBreakInserter(string prefix, string content, int maxLength)
        {
            if (string.IsNullOrWhiteSpace(content)) return string.Empty;

            if (content.Contains("\n") || content.Contains(Environment.NewLine))
            {
                return string.Join(string.Empty, content.Split(new[]
                    {
                        Environment.NewLine, "\n"
                    }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(line => SmartLineBreakInserter(prefix, line, maxLength)));
            }

            var output = new StringBuilder();

            var words = content.Split(new[] {' '}, StringSplitOptions.RemoveEmptyEntries);
            var wordIndex = 0;
            while (wordIndex < words.Length)
            {
                var currentLine = new StringBuilder();
                currentLine.Append(prefix);
                var lineIndex = 0;
                do
                {
                    currentLine.Append($"{(lineIndex == 0 ? string.Empty : " ")}" + words[wordIndex++]);
                    ++lineIndex;
                } while (currentLine.Length < maxLength - 1 && wordIndex < words.Length);

                output.AppendLine(currentLine.ToString());
            }

            return output.ToString();
        }
    }
}