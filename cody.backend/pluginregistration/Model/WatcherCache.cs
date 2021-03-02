using System;
using System.Collections.Concurrent;
using System.IO;

namespace pluginregistration.Model {

    public class WatcherCache
    {
        public ConcurrentDictionary<Guid, FileSystemWatcher> Watchers { get; }
        public WatcherCache()
        {
            Watchers = new ConcurrentDictionary<Guid, FileSystemWatcher>();
        }
    }
}