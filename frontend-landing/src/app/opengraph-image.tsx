import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "NexxCloud - Self-hosted cloud storage and Docker apps for your server";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logoData = await readFile(
    join(process.cwd(), "public", "nexxcloud-mark.png"),
    "base64"
  );
  const logoSrc = `data:image/png;base64,${logoData}`;

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "radial-gradient(circle at 76% 24%, #172554 0%, #08081e 34%, #030303 72%)",
          color: "#f4f4f5",
          display: "flex",
          fontFamily: "Arial, sans-serif",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px 80px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
          <div
            style={{
              color: "#06b6d4",
              display: "flex",
              fontSize: 22,
              letterSpacing: 3,
              marginBottom: 30,
              textTransform: "uppercase",
            }}
          >
            NexxCloud
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 62,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.08,
            }}
          >
            Self-hosted cloud storage and Docker apps
          </div>
          <div
            style={{
              color: "#a1a1aa",
              display: "flex",
              fontSize: 25,
              lineHeight: 1.45,
              marginTop: 30,
            }}
          >
            Private file storage with LAN access, bulk downloads, native clients,
            live logs, and Docker Hub app hosting.
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders images from JSX. */}
        <img
          src={logoSrc}
          alt=""
          width={190}
          height={190}
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 42,
            marginLeft: 50,
            objectFit: "cover",
          }}
        />
      </div>
    ),
    size
  );
}
