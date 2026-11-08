import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const out = join(root, 'dist');
await mkdir(out, { recursive: true });
for (const file of ['config.js', 'manifest.webmanifest', 'sw.js']) {
  await cp(join(root, file), join(out, file));
}
await cp(join(root, 'icons'), join(out, 'icons'), { recursive: true });

const html = await readFile(join(root, 'index.html'), 'utf8');
const marker = '<script>';
const appScript = html.lastIndexOf(marker);
if (appScript < 0) throw new Error('Could not find the app script in index.html');
await writeFile(join(out, 'index.html'), html.slice(0, appScript) + '<script src="native-camera.js"></script>\n' + html.slice(appScript));
await build({
  entryPoints: [join(root, 'src/native-camera.js')],
  outfile: join(out, 'native-camera.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
});
