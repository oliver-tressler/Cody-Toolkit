using System;

namespace proxygenerator.Utils
{
    public static class ConsoleHelper
    {
        private const int DefaultWidth = 250;
        private static int _windowWidth;

        public static void RefreshLine(string text)
        {
            if (_windowWidth <= 0)
                try
                {
                    _windowWidth = Console.WindowWidth;
                }
                catch
                {
                    _windowWidth = DefaultWidth;
                }

            Console.Write($"\r{text}".PadRight(_windowWidth));
        }
    }
}