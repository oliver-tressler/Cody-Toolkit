using System;

namespace proxygenerator.Data.Model
{
    [Serializable]
    public enum DateTimeType
    {
        UserLocal = 1,
        DateOnly = 2,
        TimeZoneIndependent = 3
    }
}