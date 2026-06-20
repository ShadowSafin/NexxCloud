const fs = require("node:fs");
const { createWriteStream } = require("node:fs");
const https = require("node:https");
const path = require("node:path");

const nativeRoot = path.resolve(__dirname, "..");
const dockerDir = path.join(nativeRoot, "vendor", "docker");
const dockerInstallerPath = path.join(dockerDir, "Docker Desktop Installer.exe");
const dockerInstallerUrl =
  process.env.DOCKER_DESKTOP_INSTALLER_URL ||
  "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe";

function download(url, target, redirectCount = 0) {
  if (redirectCount > 5) {
    return Promise.reject(new Error("Too many redirects while downloading Docker Desktop"));
  }

  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.resume();
        const nextUrl = new URL(response.headers.location, url).toString();
        download(nextUrl, target, redirectCount + 1).then(resolve, reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Docker Desktop download failed with status ${response.statusCode}`));
        return;
      }

      const file = createWriteStream(target);
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
      file.on("error", reject);
    });

    request.on("error", reject);
  });
}

async function prepareDockerDesktop(context = {}) {
  if (context.electronPlatformName && context.electronPlatformName !== "win32") {
    console.log("[native docker] Skipping Docker Desktop bundle for non-Windows package");
    return;
  }

  fs.mkdirSync(dockerDir, { recursive: true });

  if (fs.existsSync(dockerInstallerPath)) {
    const size = fs.statSync(dockerInstallerPath).size;
    if (size > 50 * 1024 * 1024) {
      console.log(`[native docker] Using existing bundled Docker Desktop installer (${Math.round(size / 1024 / 1024)} MB)`);
      return;
    }
    fs.rmSync(dockerInstallerPath, { force: true });
  }

  const tempPath = `${dockerInstallerPath}.download`;
  fs.rmSync(tempPath, { force: true });

  console.log(`[native docker] Downloading Docker Desktop installer from ${dockerInstallerUrl}`);
  await download(dockerInstallerUrl, tempPath);

  const size = fs.statSync(tempPath).size;
  if (size < 50 * 1024 * 1024) {
    fs.rmSync(tempPath, { force: true });
    throw new Error("Downloaded Docker Desktop installer is unexpectedly small");
  }

  fs.renameSync(tempPath, dockerInstallerPath);
  console.log(`[native docker] Bundled Docker Desktop installer at ${dockerInstallerPath} (${Math.round(size / 1024 / 1024)} MB)`);
}

module.exports = prepareDockerDesktop;

if (require.main === module) {
  prepareDockerDesktop().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
