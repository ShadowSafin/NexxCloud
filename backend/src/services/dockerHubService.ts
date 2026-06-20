import { BadRequestError, NotFoundError } from "../utils/errors";

const DOCKER_HUB_BASE_URL = "https://hub.docker.com/v2";
const REQUEST_TIMEOUT_MS = 12_000;

interface DockerHubSearchResult {
  repo_name: string;
  short_description?: string;
  star_count?: number;
  pull_count?: number;
  repo_owner?: string;
  is_automated?: boolean;
  is_official?: boolean;
}

interface DockerHubRepository {
  user?: string;
  name: string;
  namespace: string;
  repository_type?: string | null;
  status?: number;
  status_description?: string;
  description?: string;
  full_description?: string;
  is_private?: boolean;
  is_automated?: boolean;
  star_count?: number;
  pull_count?: number;
  last_updated?: string;
  last_modified?: string;
  date_registered?: string;
  affiliation?: string | null;
  hub_user?: string;
  categories?: Array<{ name: string; slug: string }>;
  storage_size?: number | null;
}

interface DockerHubTag {
  name: string;
  last_updated?: string;
  full_size?: number;
  tag_status?: string;
  digest?: string;
  images?: Array<{
    architecture?: string;
    os?: string;
    variant?: string | null;
    size?: number;
    digest?: string;
  }>;
}

interface DockerHubListResponse<T> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

export interface MarketplaceImage {
  name: string;
  namespace: string;
  repository: string;
  image: string;
  description: string;
  pullCount: number;
  starCount: number;
  official: boolean;
  verified: boolean;
  popular: boolean;
  automated: boolean;
  confidence: number;
  risk: "low" | "medium" | "high";
  trustIndicators: string[];
  warnings: string[];
  lastUpdated: string | null;
  categories: string[];
  storageSize: number | null;
  logoUrl: string | null;
  dockerHubUrl: string;
}

export interface MarketplaceImageDetails extends MarketplaceImage {
  fullDescription: string;
  latestTag: string;
  tags: Array<{
    name: string;
    lastUpdated: string | null;
    size: number | null;
    digest: string | null;
    architectures: string[];
  }>;
}

const normalizeRepositoryName = (value: string) => {
  const trimmed = value.trim().replace(/^docker\.io\//, "");
  const withoutTag = trimmed.includes(":") ? trimmed.split(":")[0] : trimmed;
  if (!withoutTag || withoutTag.includes("..")) {
    throw new BadRequestError("Invalid Docker image name");
  }

  const parts = withoutTag.split("/").filter(Boolean);
  if (parts.length === 1) {
    return { name: parts[0], namespace: "library", repository: parts[0], image: parts[0] };
  }
  if (parts.length === 2) {
    return { name: parts[1], namespace: parts[0], repository: parts[1], image: `${parts[0]}/${parts[1]}` };
  }
  throw new BadRequestError("Only Docker Hub namespace/repository images are supported");
};

const NON_APP_IMAGE_BLOCK_MESSAGE =
  "This Docker image is hidden because it is a runtime, base OS, database, queue, proxy, or raw infrastructure component rather than a one-click NexxCloud app.";

const DEVELOPER_RUNTIME_REPOSITORIES = new Set([
  "almalinux",
  "alpine",
  "amazonlinux",
  "amazoncorretto",
  "archlinux",
  "bash",
  "buildpack-deps",
  "busybox",
  "centos",
  "clearlinux",
  "clojure",
  "composer",
  "dart",
  "debian",
  "deno",
  "dotnet",
  "eclipse-temurin",
  "elixir",
  "erlang",
  "fedora",
  "gcc",
  "golang",
  "gradle",
  "groovy",
  "haskell",
  "java",
  "jdk",
  "jre",
  "jruby",
  "julia",
  "maven",
  "mono",
  "node",
  "openjdk",
  "opensuse",
  "oraclelinux",
  "perl",
  "php",
  "pypy",
  "python",
  "r-base",
  "rockylinux",
  "ruby",
  "rust",
  "sapmachine",
  "swift",
  "ubuntu",
]);

const DEVELOPER_RUNTIME_IMAGE_KEYS = new Set([
  "library/docker",
]);

const RAW_INFRASTRUCTURE_REPOSITORIES = new Set([
  "adminer",
  "aerospike",
  "arangodb",
  "cassandra",
  "chronograf",
  "consul",
  "couchbase",
  "couchdb",
  "eclipse-mosquitto",
  "elasticsearch",
  "etcd",
  "haproxy",
  "hello-world",
  "httpd",
  "influxdb",
  "kapacitor",
  "kibana",
  "kong",
  "logstash",
  "mariadb",
  "memcached",
  "mongo",
  "mongodb",
  "mysql",
  "nats",
  "neo4j",
  "nginx",
  "postgres",
  "postgresql",
  "rabbitmq",
  "redpanda",
  "redis",
  "registry",
  "rethinkdb",
  "solr",
  "sonarqube",
  "telegraf",
  "traefik",
  "varnish",
  "vault",
  "zookeeper",
  "caddy",
  "flink",
  "percona",
  "phpmyadmin",
  "tomcat",
]);

const RAW_INFRASTRUCTURE_NAMESPACES = new Set([
  "caddy",
  "elastic",
  "haproxy",
  "kong",
  "mariadb",
  "mongo",
  "mongodb",
  "mysql",
  "nginx",
  "percona",
  "postgres",
  "rabbitmq",
  "redis",
  "traefik",
]);

const RAW_INFRASTRUCTURE_TERMS = [
  "caddy",
  "cassandra",
  "couchdb",
  "elastic",
  "elasticsearch",
  "etcd",
  "flink",
  "haproxy",
  "httpd",
  "influxdb",
  "ingress",
  "kafka",
  "kong",
  "mariadb",
  "maxscale",
  "memcached",
  "mongo",
  "mongodb",
  "mysql",
  "nginx",
  "operator",
  "percona",
  "postgres",
  "prometheus-exporter",
  "rabbitmq",
  "redis",
  "solr",
  "telegraf",
  "tomcat",
  "traefik",
  "varnish",
  "zookeeper",
];

const hasBlockedInfrastructureTerm = (repository: string) =>
  RAW_INFRASTRUCTURE_TERMS.some((term) => {
    if (repository === term) return true;
    return (
      repository.startsWith(`${term}-`) ||
      repository.endsWith(`-${term}`) ||
      repository.includes(`-${term}-`)
    );
  });

const isFilteredMarketplaceImage = (namespace: string, repository: string) => {
  const normalizedNamespace = namespace.toLowerCase();
  const normalizedRepository = repository.toLowerCase();
  return (
    DEVELOPER_RUNTIME_REPOSITORIES.has(normalizedRepository) ||
    RAW_INFRASTRUCTURE_REPOSITORIES.has(normalizedRepository) ||
    RAW_INFRASTRUCTURE_NAMESPACES.has(normalizedNamespace) ||
    hasBlockedInfrastructureTerm(normalizedRepository) ||
    DEVELOPER_RUNTIME_IMAGE_KEYS.has(`${normalizedNamespace}/${normalizedRepository}`)
  );
};

const parseRepositoryFromSearchResult = (result: DockerHubSearchResult) =>
  normalizeRepositoryName(result.repo_name);

const jsonRequest = async <T>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "NexxCloud Apps Platform",
      },
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new NotFoundError("Docker Hub image not found");
    }

    if (!response.ok) {
      throw new BadRequestError(`Docker Hub request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
};

const numberOrZero = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const isRecentlyUpdated = (dateValue?: string | null) => {
  if (!dateValue) return false;
  const updated = new Date(dateValue).getTime();
  if (!Number.isFinite(updated)) return false;
  return Date.now() - updated < 1000 * 60 * 60 * 24 * 180;
};

const calculateConfidence = (input: {
  official: boolean;
  verified: boolean;
  pullCount: number;
  starCount: number;
  lastUpdated?: string | null;
}) => {
  let score = 30;
  if (input.official) score += 35;
  if (input.verified && !input.official) score += 20;
  score += Math.min(Math.log10(input.pullCount + 1) * 4, 22);
  score += Math.min(Math.log10(input.starCount + 1) * 3, 10);
  if (isRecentlyUpdated(input.lastUpdated)) score += 8;
  return Math.max(5, Math.min(99, Math.round(score)));
};

const riskFromConfidence = (confidence: number): "low" | "medium" | "high" => {
  if (confidence >= 80) return "low";
  if (confidence >= 55) return "medium";
  return "high";
};

const buildTrustSignals = (image: {
  official: boolean;
  verified: boolean;
  popular: boolean;
  pullCount: number;
  starCount: number;
  lastUpdated?: string | null;
}) => {
  const trustIndicators: string[] = [];
  const warnings: string[] = [];

  if (image.official) trustIndicators.push("Official Image");
  if (image.verified && !image.official) trustIndicators.push("Verified Publisher");
  if (image.popular) trustIndicators.push("Popular Image");
  if (image.pullCount >= 1_000_000) trustIndicators.push("Frequently Installed");
  if (!image.official && !image.verified) warnings.push("Unverified Publisher");
  if (image.pullCount < 10_000) warnings.push("Low Popularity");
  if (!isRecentlyUpdated(image.lastUpdated)) warnings.push("May be outdated");

  return { trustIndicators, warnings };
};

const BRAND_LOGOS: Record<string, string> = {
  "library/amazonlinux": "amazonaws/ff9900",
  "library/golang": "go/00add8",
  "library/mongo": "mongodb/47a248",
  "library/node": "nodedotjs/5fa04e",
  "library/openjdk": "openjdk/ffffff",
  "library/postgres": "postgresql/4169e1",
  "library/rabbitmq": "rabbitmq/ff6600",
  "linuxserver/jellyfin": "jellyfin/00a4dc",
  "jellyfin/jellyfin": "jellyfin/00a4dc",
  "jellyfin/jellyfin-vue": "jellyfin/00a4dc",
  amazonlinux: "amazonaws/ff9900",
  elasticsearch: "elasticsearch/005571",
  grafana: "grafana/f46800",
  influxdb: "influxdb/22adf6",
  jellyfin: "jellyfin/00a4dc",
  mariadb: "mariadb/003545",
  mongo: "mongodb/47a248",
  mongodb: "mongodb/47a248",
  mysql: "mysql/4479a1",
  nextcloud: "nextcloud/0082c9",
  nginx: "nginx/009639",
  node: "nodedotjs/5fa04e",
  php: "php/777bb4",
  postgres: "postgresql/4169e1",
  postgresql: "postgresql/4169e1",
  python: "python/3776ab",
  rabbitmq: "rabbitmq/ff6600",
  redis: "redis/dc382d",
  ruby: "ruby/cc342d",
  sonarqube: "sonarqube/4e9bcd",
  ubuntu: "ubuntu/e95420",
  wordpress: "wordpress/21759b",
};

const BRAND_DESCRIPTIONS: Record<string, string> = {
  "library/amazonlinux": "Amazon Linux provides a stable, secure, high-performance Linux runtime for cloud-native applications and AWS workloads.",
  "library/golang": "Go is a modern programming language built for fast, reliable services, command-line tools, and distributed systems.",
  "library/mongo": "MongoDB is a document database designed for flexible schemas, fast queries, and scalable application data.",
  "library/node": "Node.js is a JavaScript runtime for building fast server-side apps, APIs, tools, and real-time network services.",
  "library/openjdk": "OpenJDK provides the open source Java runtime and development kit for running and building JVM applications.",
  "library/php": "PHP is a flexible server-side scripting runtime for web apps, APIs, automation, and command-line tools.",
  "library/rabbitmq": "RabbitMQ is a reliable message broker for event-driven services, background jobs, and distributed application workflows.",
  "library/sonarqube": "SonarQube analyzes code quality and security so teams can catch bugs, vulnerabilities, and maintainability issues before release.",
  "linuxserver/jellyfin": "Jellyfin is a free media server for organizing, streaming, and sharing movies, music, photos, and TV from your own hardware.",
  "jellyfin/jellyfin": "Jellyfin is a free media server for organizing, streaming, and sharing movies, music, photos, and TV from your own hardware.",
  "jellyfin/jellyfin-vue": "Jellyfin Vue is an experimental web client for Jellyfin, built as a modern alternative interface for self-hosted media streaming.",
  elasticsearch: "Elasticsearch is a distributed search and analytics engine for exploring logs, metrics, documents, and application data at scale.",
  grafana: "Grafana turns metrics, logs, and traces into dashboards and alerts for monitoring infrastructure and applications.",
  influxdb: "InfluxDB stores and analyzes time-series data for monitoring, sensors, telemetry, finance, and real-time analytics.",
  mariadb: "MariaDB is a fast open source relational database, forked from MySQL and built for dependable application storage.",
  mysql: "MySQL is a widely used relational database for web apps, services, analytics, and structured application data.",
  nextcloud: "Nextcloud is a private cloud workspace for files, calendars, contacts, photos, sharing, and collaboration across devices.",
  nginx: "NGINX is a high-performance web server, reverse proxy, load balancer, and static content gateway.",
  postgres: "PostgreSQL is a powerful open source relational database with strong SQL support, reliability, and extensibility.",
  postgresql: "PostgreSQL is a powerful open source relational database with strong SQL support, reliability, and extensibility.",
  python: "Python is a versatile programming runtime for web services, scripts, automation, data work, and machine learning.",
  redis: "Redis is an in-memory data store used for caching, queues, sessions, rate limits, and fast real-time workloads.",
  ruby: "Ruby is a dynamic programming language used for web apps, automation, developer tools, and scripting.",
  ubuntu: "Ubuntu is a popular Debian-based Linux image for servers, development environments, containers, and cloud workloads.",
  wordpress: "WordPress is a publishing and website platform for blogs, landing pages, content sites, and custom web projects.",
};

const brandLogoUrl = (namespace: string, repository: string) => {
  const key = `${namespace}/${repository}`.toLowerCase();
  const simpleIcon = BRAND_LOGOS[key] || BRAND_LOGOS[repository.toLowerCase()];
  return simpleIcon ? `https://cdn.simpleicons.org/${simpleIcon}` : null;
};

const brandDescription = (namespace: string, repository: string) => {
  const key = `${namespace}/${repository}`.toLowerCase();
  return BRAND_DESCRIPTIONS[key] || BRAND_DESCRIPTIONS[repository.toLowerCase()] || null;
};

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));

const cleanMarkdownText = (markdown: string) =>
  decodeHtmlEntities(markdown)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?(p|div|section|article|h[1-6]|li|ul|ol|table|thead|tbody|tr|td|th)\b[^>]*>/gi, " ")
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[#>*_`|]/g, " ")
    .replace(/-{3,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const shorten = (value: string, maxLength = 260) => {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 3).replace(/\s+\S*$/, "")}...`;
};

const isGenericDescription = (value: string) => {
  const lower = value.toLowerCase();
  return (
    lower.length < 45 ||
    lower.includes("manual docker image") ||
    lower === "official image" ||
    lower === "community image"
  );
};

const isBoilerplateDescription = (value: string) => {
  const lower = value.toLowerCase();
  return (
    lower.includes("quick reference") ||
    lower.includes("where to get help") ||
    lower.includes("docker community slack") ||
    lower.includes("server fault") ||
    lower.includes("stack overflow") ||
    lower.includes("supported tags") ||
    lower.includes("dockerfile") ||
    lower.includes("supported architectures") ||
    lower.includes("published image artifact") ||
    lower.includes("source of this description") ||
    lower.includes("image updates") ||
    lower.includes("description for this image is longer than") ||
    lower.includes("do not edit this file") ||
    lower.includes("regular and timely application updates") ||
    lower.includes("easy user mappings") ||
    lower.includes("custom base image with s6 overlay") ||
    lower.includes("weekly base os updates") ||
    lower.includes("simply pulling")
  );
};

const descriptionScore = (value: string, repositoryName: string) => {
  const lower = value.toLowerCase();
  const repoWords = repositoryName.toLowerCase().split(/[-_.\s]+/).filter((word) => word.length > 2);
  let score = 0;

  if (repoWords.some((word) => lower.includes(word))) score += 40;
  if (/\bis\b|\bare\b|\bprovides\b|\ballows\b|\benables\b/.test(lower)) score += 18;
  if (value.length >= 90 && value.length <= 360) score += 18;
  if (value.length > 360) score += 8;
  if (lower.includes("maintained by") || lower.includes("license")) score -= 15;
  if (isBoilerplateDescription(value)) score -= 80;
  return score;
};

const extractLogoUrl = (markdown?: string | null) => {
  if (!markdown) return null;

  const candidates = [
    ...[...markdown.matchAll(/!\[[^\]]*]\((https?:\/\/[^)\s]+)[^)]*\)/gi)].map((match) => ({
      source: match[0],
      url: match[1],
    })),
    ...[...markdown.matchAll(/<img\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["'][^>]*>/gi)].map((match) => ({
      source: match[0],
      url: match[1],
    })),
  ].filter((match) => {
    const url = match.url.toLowerCase();
    const source = match.source.toLowerCase();
    return !(
      url.includes("img.shields.io") ||
      url.includes("scarf.sh") ||
      url.includes("opencollective.com") ||
      url.includes("badge") ||
      url.includes("badgen.net") ||
      source.includes("docker pulls") ||
      source.includes("build status")
    );
  });

  const preferred =
    candidates.find((match) => /logo|icon|brand|banner/i.test(match.source)) ||
    candidates.find((match) => /logo|icon|brand|banner/i.test(match.url)) ||
    candidates[0];

  return preferred?.url || null;
};

const extractReadableDescription = (repository: DockerHubRepository) => {
  const fallback = repository.description ? cleanMarkdownText(repository.description) : "";
  const fullDescription = repository.full_description || "";
  if (!fullDescription) {
    return shorten(fallback || "No description provided by Docker Hub.");
  }

  const sections = fullDescription
    .split(/\n(?=# )/g)
    .map((section) => section.trim())
    .filter(Boolean);
  const whatIsSection = sections.find((section) => /^#\s+what\s+is/i.test(section));
  const candidates = (whatIsSection || fullDescription)
    .split(/\n{2,}/g)
    .map(cleanMarkdownText)
    .filter((paragraph) => {
      if (paragraph.length < 60) return false;
      if (isBoilerplateDescription(paragraph)) return false;
      if (/^(quick reference|supported tags|image variants|license|how to use|where to)/i.test(paragraph)) return false;
      if (/^(architecture|available|tag|parameter|version)\s+\|/i.test(paragraph)) return false;
      return true;
    });

  const bestCandidate = candidates
    .map((paragraph) => ({
      paragraph,
      score: descriptionScore(paragraph, repository.name),
    }))
    .sort((a, b) => b.score - a.score)[0];

  const fallbackScore = fallback && !isGenericDescription(fallback)
    ? descriptionScore(fallback, repository.name) + 12
    : -1;
  const bestText = bestCandidate && bestCandidate.score > fallbackScore
    ? bestCandidate.paragraph
    : fallback;

  return shorten(bestText || "No description provided by Docker Hub.");
};

export class DockerHubService {
  async search(params: {
    query: string;
    page?: number;
    pageSize?: number;
    filter?: "all" | "official" | "verified" | "popular" | "recent";
  }) {
    const query = params.query.trim();
    if (!query) {
      return this.home();
    }

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(Math.max(params.pageSize || 24, 1), 50);
    const url = new URL(`${DOCKER_HUB_BASE_URL}/search/repositories/`);
    url.searchParams.set("query", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(pageSize));

    const payload = await jsonRequest<DockerHubListResponse<DockerHubSearchResult>>(url.toString());
    let results = this.filterInstallableImages(payload.results.map((item) => this.fromSearchResult(item)));

    if (params.filter === "official") {
      results = results.filter((item) => item.official);
    }
    if (params.filter === "verified") {
      results = results.filter((item) => item.verified);
    }
    if (params.filter === "popular") {
      results = results.filter((item) => item.popular);
    }
    if (params.filter === "recent") {
      results = results.filter((item) => isRecentlyUpdated(item.lastUpdated));
    }

    results = await this.enrichImages(results, 18);

    return {
      count: results.length,
      next: payload.next,
      previous: payload.previous,
      results,
    };
  }

  async home() {
    const official = await this.officialRepositories(100);
    const sortedByPulls = [...official].sort((a, b) => b.pullCount - a.pullCount);
    const sortedByUpdated = [...official].sort((a, b) => {
      const aTime = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const bTime = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return bTime - aTime;
    });

    const popularImages = await this.enrichImages(sortedByPulls.slice(0, 24), 24);
    const recentlyUpdated = await this.enrichImages(sortedByUpdated.slice(0, 12), 12);

    return {
      count: official.length,
      next: null,
      previous: null,
      results: popularImages,
      sections: {
        popularImages: popularImages.slice(0, 12),
        recentlyUpdated,
        officialImages: popularImages.slice(0, 12),
        verifiedPublishers: [],
        trendingApps: recentlyUpdated,
      },
      notes: [
        "Docker Hub public search requires a query. The homepage is generated from the live Docker Official Images namespace.",
        "Docker Hub does not expose every publisher verification signal through the unauthenticated public endpoints, so verification is shown only when available.",
      ],
    };
  }

  async getDetails(namespace: string, repository: string): Promise<MarketplaceImageDetails> {
    const detail = await jsonRequest<DockerHubRepository>(
      `${DOCKER_HUB_BASE_URL}/repositories/${encodeURIComponent(namespace)}/${encodeURIComponent(repository)}/`
    );

    const image = this.fromRepository(detail);
    if (isFilteredMarketplaceImage(image.namespace, image.repository)) {
      throw new BadRequestError(NON_APP_IMAGE_BLOCK_MESSAGE);
    }

    const tagPayload = await jsonRequest<DockerHubListResponse<DockerHubTag>>(
      `${DOCKER_HUB_BASE_URL}/repositories/${encodeURIComponent(namespace)}/${encodeURIComponent(repository)}/tags?page_size=25&ordering=last_updated`
    );

    const tags = tagPayload.results.map((tag) => ({
      name: tag.name,
      lastUpdated: tag.last_updated || null,
      size: tag.full_size ?? null,
      digest: tag.digest || null,
      architectures: Array.from(
        new Set(
          (tag.images || [])
            .map((imageInfo) => [imageInfo.os, imageInfo.architecture, imageInfo.variant].filter(Boolean).join("/"))
            .filter(Boolean)
        )
      ),
    }));

    return {
      ...image,
      fullDescription: detail.full_description || detail.description || "",
      latestTag: tags.some((tag) => tag.name === "latest") ? "latest" : tags[0]?.name || "latest",
      tags,
    };
  }

  async assertRepositoryExists(image: string) {
    const parsed = normalizeRepositoryName(image);
    const details = await this.getDetails(parsed.namespace, parsed.repository);
    return details;
  }

  parseImageName(image: string) {
    return normalizeRepositoryName(image);
  }

  private async officialRepositories(pageSize: number) {
    const url = `${DOCKER_HUB_BASE_URL}/repositories/library/?page_size=${Math.min(pageSize, 100)}&ordering=last_updated`;
    const payload = await jsonRequest<DockerHubListResponse<DockerHubRepository>>(url);
    return this.filterInstallableImages(payload.results.map((item) => this.fromRepository(item)));
  }

  private async enrichImages(images: MarketplaceImage[], maxItems: number) {
    const head = images.slice(0, maxItems);
    const tail = images.slice(maxItems);

    const enriched = await Promise.all(
      head.map(async (image) => {
        try {
          const detail = await this.repositoryDetails(image.namespace, image.repository);
          return this.fromRepository(detail);
        } catch {
          return image;
        }
      })
    );

    return this.filterInstallableImages([...enriched, ...tail]);
  }

  private filterInstallableImages(images: MarketplaceImage[]) {
    return images.filter((image) => !isFilteredMarketplaceImage(image.namespace, image.repository));
  }

  private repositoryDetails(namespace: string, repository: string) {
    return jsonRequest<DockerHubRepository>(
      `${DOCKER_HUB_BASE_URL}/repositories/${encodeURIComponent(namespace)}/${encodeURIComponent(repository)}/`
    );
  }

  private fromSearchResult(result: DockerHubSearchResult): MarketplaceImage {
    const parsed = parseRepositoryFromSearchResult(result);
    const official = Boolean(result.is_official || parsed.namespace === "library");
    const verified = official;
    const pullCount = numberOrZero(result.pull_count);
    const starCount = numberOrZero(result.star_count);
    const popular = pullCount >= 1_000_000 || starCount >= 100;
    const confidence = calculateConfidence({ official, verified, pullCount, starCount });
    const signals = buildTrustSignals({ official, verified, popular, pullCount, starCount });

    return {
      ...parsed,
      description: brandDescription(parsed.namespace, parsed.repository) || (result.short_description
        ? cleanMarkdownText(result.short_description)
        : "No description provided by Docker Hub."),
      pullCount,
      starCount,
      official,
      verified,
      popular,
      automated: Boolean(result.is_automated),
      confidence,
      risk: riskFromConfidence(confidence),
      trustIndicators: signals.trustIndicators,
      warnings: signals.warnings,
      lastUpdated: null,
      categories: [],
      storageSize: null,
      logoUrl: brandLogoUrl(parsed.namespace, parsed.repository),
      dockerHubUrl: `https://hub.docker.com/${official ? "_" : "r"}/${parsed.image}`,
    };
  }

  private fromRepository(repository: DockerHubRepository): MarketplaceImage {
    const parsed = normalizeRepositoryName(`${repository.namespace}/${repository.name}`);
    const official = parsed.namespace === "library";
    const verified = official || Boolean(repository.affiliation && repository.affiliation !== "user");
    const pullCount = numberOrZero(repository.pull_count);
    const starCount = numberOrZero(repository.star_count);
    const popular = pullCount >= 1_000_000 || starCount >= 100;
    const lastUpdated = repository.last_updated || repository.last_modified || null;
    const confidence = calculateConfidence({ official, verified, pullCount, starCount, lastUpdated });
    const signals = buildTrustSignals({ official, verified, popular, pullCount, starCount, lastUpdated });

    return {
      ...parsed,
      description: brandDescription(parsed.namespace, parsed.repository) || extractReadableDescription(repository),
      pullCount,
      starCount,
      official,
      verified,
      popular,
      automated: Boolean(repository.is_automated),
      confidence,
      risk: riskFromConfidence(confidence),
      trustIndicators: signals.trustIndicators,
      warnings: signals.warnings,
      lastUpdated,
      categories: (repository.categories || []).map((category) => category.name),
      storageSize: repository.storage_size ?? null,
      logoUrl: brandLogoUrl(parsed.namespace, parsed.repository) || extractLogoUrl(repository.full_description),
      dockerHubUrl: `https://hub.docker.com/${official ? "_" : "r"}/${parsed.image}`,
    };
  }
}

export const dockerHubService = new DockerHubService();
