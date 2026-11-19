/* Leonida Ledger — entry program for make.fun gta6-trophy-guide-01.
 * Copies app/ and screenshots/ from this repository into the output
 * directory and writes /output/dossier.json with the kit's
 * buildDossier library. Standard library only; runs on Node 22.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || "/output";

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

function copyEntryTree(name: string): void {
  const source = join(REPO_ROOT, name);
  const target = join(OUTPUT_DIR, name);
  if (!existsSync(source)) throw new Error(`missing ${name}/ in repository`);
  // Clear any stale copy so a repeated run writes exactly the repo's files.
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
}

function buildLeonidaLedgerEntry(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  copyEntryTree("app");
  copyEntryTree("screenshots");
  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  writeFileSync(join(OUTPUT_DIR, "dossier.json"), dossier);
}

buildLeonidaLedgerEntry();
