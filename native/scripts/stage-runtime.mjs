import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nativeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(nativeRoot, "..");
const backendRoot = path.join(repositoryRoot, "backend");
const frontendRoot = path.join(repositoryRoot, "frontend");
const runtimeRoot = path.join(nativeRoot, "runtime");
const runtimeBackend = path.join(runtimeRoot, "backend");
const runtimeFrontend = path.join(runtimeRoot, "frontend");
const npmCli = process.env.npm_execpath;

function run(command, args, cwd, env = {}) {
  console.log(`[native runtime] ${command} ${args.join(" ")}`);
  execFileSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
}

function runNpm(args, cwd, env = {}) {
  if (!npmCli) throw new Error("Run native runtime staging through npm so its CLI path is available.");
  run(process.execPath, [npmCli, ...args], cwd, env);
}

function copyDirectory(source, target) {
  fs.cpSync(source, target, { recursive: true, force: true });
}

fs.rmSync(runtimeRoot, { recursive: true, force: true });
fs.mkdirSync(runtimeBackend, { recursive: true });
fs.mkdirSync(runtimeFrontend, { recursive: true });

runNpm(["run", "build"], backendRoot);

const sourceSchema = fs.readFileSync(path.join(backendRoot, "prisma", "schema.prisma"), "utf8");
const sqliteSchema = sourceSchema
  .replace('provider = "postgresql"', 'provider = "sqlite"')
  .replace(/\bJson\?/g, "String?")
  .replace(/\bJson\b/g, "String");
const nativePrisma = path.join(runtimeBackend, "prisma", "native");
const migrationsDirectory = path.join(nativePrisma, "migrations", "000001_native_initial");
fs.mkdirSync(migrationsDirectory, { recursive: true });
fs.writeFileSync(path.join(nativePrisma, "schema.prisma"), sqliteSchema);
fs.writeFileSync(path.join(nativePrisma, "migrations", "migration_lock.toml"), 'provider = "sqlite"\n');

copyDirectory(path.join(backendRoot, "dist"), path.join(runtimeBackend, "dist"));
fs.copyFileSync(path.join(backendRoot, "package.json"), path.join(runtimeBackend, "package.json"));
fs.copyFileSync(path.join(backendRoot, "package-lock.json"), path.join(runtimeBackend, "package-lock.json"));
runNpm(["ci", "--omit=dev"], runtimeBackend);
const prismaCli = path.join(runtimeBackend, "node_modules", "prisma", "build", "index.js");
run(process.execPath, [prismaCli, "generate", "--schema", path.join("prisma", "native", "schema.prisma")], runtimeBackend);

const migrationSql = execFileSync(
  process.execPath,
  [prismaCli, "migrate", "diff", "--from-empty", "--to-schema-datamodel", path.join("prisma", "native", "schema.prisma"), "--script"],
  { cwd: runtimeBackend, encoding: "utf8" }
);
fs.writeFileSync(
  path.join(migrationsDirectory, "migration.sql"),
  `BEGIN TRANSACTION;\n${migrationSql.trim()}\nCOMMIT;\n`
);

runNpm(["run", "build"], frontendRoot, {
  INTERNAL_API_URL: "http://127.0.0.1:4010",
  NEXT_PUBLIC_API_URL: "",
});
copyDirectory(path.join(frontendRoot, ".next", "standalone"), runtimeFrontend);
copyDirectory(path.join(frontendRoot, ".next", "static"), path.join(runtimeFrontend, ".next", "static"));
copyDirectory(path.join(frontendRoot, "public"), path.join(runtimeFrontend, "public"));

console.log(`[native runtime] Installer payload staged in ${runtimeRoot}`);
