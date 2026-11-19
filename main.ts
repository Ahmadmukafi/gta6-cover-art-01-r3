// VICE GRID — gta6-cover-art-01 entry (Node 22, standard library only).
//
// Hands the app in: copies the app/ folder and the screenshots/ folder that
// sit beside this file into the output directory, then writes the dossier
// the judge reads with the vendored make.fun library.
//
// The copy is deliberately plain — no build step, no transform — so the
// dossier the scorer rebuilds from /output is byte for byte the one this
// program writes. The only files that ever land in /output are the app, its
// screenshots, and dossier.json itself.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copy a folder tree when it exists; skip it quietly when it does not, so a
// missing screenshots/ folder fails loudly in buildDossier instead of here.
function copyTree(src: string, dst: string): void {
  if (!existsSync(src)) return;
  mkdirSync(dst, { recursive: true });
  cpSync(src, dst, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree(join(root, 'app'), join(outDir, 'app'));
copyTree(join(root, 'screenshots'), join(outDir, 'screenshots'));

// The scorer's own caps: only text_max_bytes shapes the dossier's bytes;
// the rest refuse an entry the scorer would refuse, so passing them here
// makes this program fail exactly where the scorer would.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
