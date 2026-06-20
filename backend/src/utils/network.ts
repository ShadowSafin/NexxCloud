import os from "os";

export interface LanAddressCandidate {
  interfaceName: string;
  address: string;
  score: number;
}

const VIRTUAL_INTERFACE_PATTERN =
  /(virtual|virtualbox|vmware|hyper-v|vethernet|wsl|docker|container|loopback|bluetooth|tap|tun|vpn|zerotier|tailscale|hamachi|host-only|npcap)/i;
const PHYSICAL_INTERFACE_PATTERN = /(wi-?fi|wireless|wlan|ethernet|realtek|intel|mediatek|qualcomm|broadcom|killer)/i;

export const isPrivateIpv4 = (ip: string): boolean => {
  const parts = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return false;
  const [first, second] = parts;

  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
};

export const isLinkLocalIpv4 = (ip: string): boolean => ip.startsWith("169.254.");

export const scoreLanAddress = (interfaceName: string, address: string): number => {
  let score = 0;

  if (isPrivateIpv4(address)) score += 500;
  if (address.startsWith("192.168.")) score += 120;
  if (address.startsWith("10.")) score += 80;
  if (address.startsWith("172.")) score += 40;
  if (PHYSICAL_INTERFACE_PATTERN.test(interfaceName)) score += 220;
  if (VIRTUAL_INTERFACE_PATTERN.test(interfaceName)) score -= 1000;
  if (isLinkLocalIpv4(address)) score -= 1200;

  // VirtualBox host-only networks commonly use this range and are not reachable
  // from phones or other LAN devices.
  if (address.startsWith("192.168.56.")) score -= 500;

  return score;
};

export const getFrontendPort = (): number => {
  const explicitPort = Number.parseInt(process.env.FRONTEND_PORT || "", 10);
  if (Number.isInteger(explicitPort) && explicitPort > 0) return explicitPort;

  if (process.env.FRONTEND_URL) {
    try {
      const url = new URL(process.env.FRONTEND_URL);
      const port = Number.parseInt(url.port || "", 10);
      if (Number.isInteger(port) && port > 0) return port;
    } catch {
      // Fall through to the default port.
    }
  }

  return 3000;
};

export const getLanAddressInfo = () => {
  const interfaces = os.networkInterfaces();
  const candidates: LanAddressCandidate[] = [];

  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (!ifaceList) continue;

    for (const iface of ifaceList) {
      if (iface.family === "IPv4" && !iface.internal) {
        candidates.push({
          interfaceName: name,
          address: iface.address,
          score: scoreLanAddress(name, iface.address),
        });
      }
    }
  }

  if (process.env.HOST_LAN_IP && !candidates.some((candidate) => candidate.address === process.env.HOST_LAN_IP)) {
    candidates.unshift({
      interfaceName: "HOST_LAN_IP",
      address: process.env.HOST_LAN_IP,
      score: 2000,
    });
  }

  const sortedCandidates = candidates
    .filter((candidate) => !isLinkLocalIpv4(candidate.address))
    .sort((a, b) => b.score - a.score);
  const fallbackCandidates = candidates.sort((a, b) => b.score - a.score);
  const ips = [...new Set((sortedCandidates.length ? sortedCandidates : fallbackCandidates).map((candidate) => candidate.address))];
  const primaryIp = process.env.HOST_LAN_IP || ips[0] || "127.0.0.1";

  const hostNameVal = process.env.HOST_HOSTNAME || os.hostname();
  const machineHostname = hostNameVal.endsWith(".local") ? hostNameVal : `${hostNameVal}.local`;

  return {
    ips,
    primaryIp,
    hostname: machineHostname,
    machineHostname,
  };
};

export const getLanConnectionHosts = () => {
  const info = getLanAddressInfo();
  return [...new Set([info.primaryIp, ...info.ips, info.machineHostname, "localhost"].filter(Boolean))];
};
