import { releasesUrl, repositoryUrl, siteConfig, siteUrl } from "@/lib/site";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl.href}#website`,
      url: siteUrl.href,
      name: siteConfig.name,
      description: siteConfig.description,
      inLanguage: siteConfig.language,
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl.href}#application`,
      name: siteConfig.name,
      url: siteUrl.href,
      description: siteConfig.description,
      applicationCategory: "UtilitiesApplication",
      applicationSubCategory: "Self-hosted cloud storage and Docker app hosting",
      operatingSystem: "Docker, Windows, Android, Linux, macOS",
      codeRepository: repositoryUrl,
      downloadUrl: releasesUrl,
      featureList: [
        "Self-hosted private file storage",
        "Resumable large file uploads",
        "Bulk file and folder downloads",
        "Secure signed media delivery",
        "Content-addressed storage",
        "Docker Hub app marketplace",
        "Realtime Docker app logs and stats",
        "LAN access URLs",
        "Windows desktop and server applications",
        "Android companion application",
      ],
    },
  ],
};

export default function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
      }}
    />
  );
}
