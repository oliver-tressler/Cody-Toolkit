namespace proxygenerator
{
    public class ProxyGenerationOptions
    {
        public string[] EntityLogicalNames { get; set; }
        public string Path { get; set; }
        public string ProxyNamespace { get; set; }
        public bool GlobalEnums { get; set; }
    }
}
