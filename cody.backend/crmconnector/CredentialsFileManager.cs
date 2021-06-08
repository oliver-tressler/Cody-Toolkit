using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace crmconnector
{
    public class CredentialsFileManager
    {
        public void CreateEncryptedFile(string path, string userName, string password, string discoveryServiceUrl,
            string key)
        {
            using var fs = new FileStream(path, FileMode.OpenOrCreate);
            using var aes = Aes.Create();
            aes.Key = Encoding.UTF8.GetBytes(key);
            var iv = aes.IV;
            fs.Write(iv, 0, iv.Length);
            using var cryptStream = new CryptoStream(
                fs,
                aes.CreateEncryptor(),
                CryptoStreamMode.Write);
            using var writer = new StreamWriter(cryptStream);
            writer.Write(
                $"<AuthenticationDetails><Credentials><UserName>{userName}</UserName><Password>{password}</Password></Credentials><DiscoveryServiceUrl>{discoveryServiceUrl}</DiscoveryServiceUrl></AuthenticationDetails>");
        }

        public ICrmConnectionAuthenticationDetailsProvider DecryptCredentialsFile(string path, string key)
        {
            using var fs = new FileStream(path, FileMode.Open);
            using var aes = Aes.Create();
            var iv = new byte[aes.IV.Length];
            fs.Read(iv, 0, iv.Length);
            using var cryptStream = new CryptoStream(
                fs,
                aes.CreateDecryptor(Encoding.UTF8.GetBytes(key), iv),
                CryptoStreamMode.Read);
            return new CrmConnectionCredentialsFileBasedAuthenticationDetailsProvider(cryptStream);
        }
    }
}