namespace ActionableIQ.Core.Extensions
{
    public static class StringExtensions
    {
        /// <summary>
        /// Adds padding to a Base64 string if needed
        /// </summary>
        /// <param name="input">The Base64 string that might need padding</param>
        /// <returns>A properly padded Base64 string</returns>
        public static string PadBase64(this string input)
        {
            // Add padding if needed
            switch (input.Length % 4)
            {
                case 2: return input + "==";
                case 3: return input + "=";
                default: return input;
            }
        }
    }
} 