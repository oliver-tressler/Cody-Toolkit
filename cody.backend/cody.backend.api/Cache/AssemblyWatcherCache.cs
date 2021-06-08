using System;
using System.Collections.Concurrent;
using pluginregistration.Model;

namespace cody.backend.api.Cache {

    public class AssemblyWatcherCache
    {
        private static readonly Lazy<ConcurrentDictionary<string, WatcherCache>> Cache = new Lazy<ConcurrentDictionary<string, WatcherCache>>();
        public static WatcherCache GetInstance(string organization)
        {
            if (Cache.Value.ContainsKey(organization))
            {
                return Cache.Value[organization];
            }

            Cache.Value[organization] = new WatcherCache();
            return Cache.Value[organization];
        }

        private AssemblyWatcherCache(){}
    }
}