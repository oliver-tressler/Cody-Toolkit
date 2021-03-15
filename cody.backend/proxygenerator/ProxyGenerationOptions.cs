namespace proxygenerator
{
    public class EntityProxyGenerationOptions
    {
        public string[] EntityLogicalNames { get; set; }
        public string Path { get; set; }
        public string ProxyNamespace { get; set; }
        public bool GlobalEnums { get; set; }
    }
    
    public class ActionProxyGenerationOptions
    {
        public string[] ActionNames { get; set; }
        public string Path { get; set; }
        public string ProxyNamespace { get; set; }
    }
}
