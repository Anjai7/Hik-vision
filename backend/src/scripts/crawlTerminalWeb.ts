import { HikvisionClient } from '../hikvision/HikvisionClient';
import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const client = new HikvisionClient({
    host: config.HIKVISION_HOST,
    username: config.HIKVISION_USERNAME,
    password: config.HIKVISION_PASSWORD,
    verifyTls: false,
    timeoutMs: 15000,
  });

  console.log('Fetching /doc/index.html...');
  const html = await client.get<string>('/doc/index.html');
  
  // Extract all script and link src/href
  const scriptRegex = /src=["']([^"']+\.js[^"']*)["']/gi;
  let match: RegExpExecArray | null;
  const scriptUrls: string[] = [];

  while ((match = scriptRegex.exec(html)) !== null) {
    scriptUrls.push(match[1]);
  }

  console.log('Found scripts in index.html:', scriptUrls);

  const isapiEndpoints = new Set<string>();
  const isapiWithMethods = new Map<string, Set<string>>();

  // Also extract scripts dynamically loaded or listed in manifests
  for (let scriptUrl of scriptUrls) {
    let cleanUrl = scriptUrl.startsWith('/') ? scriptUrl : `/doc/${scriptUrl}`;
    cleanUrl = cleanUrl.replace(/^\/doc\/\.\//, '/doc/');
    console.log(`Downloading bundle: ${cleanUrl}...`);
    try {
      const content = await client.get<string>(cleanUrl);
      if (typeof content === 'string') {
        // Search for all /ISAPI/... patterns in the bundle
        const isapiMatches = content.match(/\/ISAPI\/[a-zA-Z0-9_\-\/]+/g) || [];
        for (const ep of isapiMatches) {
          // clean up trailing slashes or parameters
          const cleanEp = ep.replace(/\/+$/, '');
          isapiEndpoints.add(cleanEp);
        }

        // Also look for other chunk files mentioned in webpack/bundle
        const chunkMatches = content.match(/[a-zA-Z0-9_\-~]+\.[a-f0-9]+\.js/g) || [];
        for (const chunk of chunkMatches) {
          if (!scriptUrls.some(s => s.includes(chunk))) {
            const chunkPath = `/doc/js/${chunk}`;
            if (!scriptUrls.includes(chunkPath)) {
              scriptUrls.push(chunkPath);
            }
          }
        }
      }
    } catch (e: any) {
      console.warn(`Failed to fetch ${cleanUrl}: ${e.message}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`Discovered ${isapiEndpoints.size} ISAPI endpoints across Web UI bundles:`);
  console.log(`======================================================`);

  const sorted = Array.from(isapiEndpoints).sort();
  // Group by section (System, AccessControl, Security, Network, etc.)
  const grouped: Record<string, string[]> = {};
  for (const ep of sorted) {
    const parts = ep.split('/');
    const section = parts[2] || 'Other';
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(ep);
  }

  for (const [section, endpoints] of Object.entries(grouped)) {
    console.log(`\n### [${section}] (${endpoints.length} endpoints):`);
    for (const ep of endpoints) {
      console.log(`  - ${ep}`);
    }
  }

  // Save to JSON
  fs.writeFileSync(
    path.join(__dirname, 'discovered_endpoints.json'),
    JSON.stringify({ total: isapiEndpoints.size, sections: grouped, all: sorted }, null, 2)
  );
  console.log(`\nSaved endpoint list to discovered_endpoints.json!`);
}

main().catch(console.error);
