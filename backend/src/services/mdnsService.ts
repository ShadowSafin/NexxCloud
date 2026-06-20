import Bonjour from "bonjour-service";

class MdnsService {
  private bonjour: Bonjour | null = null;

  start() {
    try {
      this.bonjour = new Bonjour();

      // Advertise Web App (port 3000)
      this.bonjour.publish({
        name: "NexxCloud Web App",
        type: "http",
        port: 3000,
        txt: { platform: "NexxCloud" }
      });

      // Advertise API (port 4000)
      this.bonjour.publish({
        name: "NexxCloud API",
        type: "http",
        port: 4000,
        txt: { platform: "NexxCloud" }
      });

      console.log("[mDNS] Bonjour services published successfully on local network");
    } catch (error) {
      console.error("[mDNS] Failed to start Bonjour services:", error);
    }
  }

  stop() {
    if (!this.bonjour) return;
    try {
      this.bonjour.unpublishAll(() => {
        this.bonjour?.destroy();
        this.bonjour = null;
        console.log("[mDNS] Bonjour services unpublished");
      });
    } catch (error) {
      console.error("[mDNS] Failed to stop Bonjour services:", error);
    }
  }
}

export const mdnsService = new MdnsService();
