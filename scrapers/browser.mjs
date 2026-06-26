import { execFile } from 'child_process';
import { promisify } from 'util';
import { isBlockedHtml } from './utils.mjs';

const execFileAsync = promisify(execFile);
const DEFAULT_EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

export function findEdgePath() {
  return process.env.EDGE_PATH || DEFAULT_EDGE;
}

export async function fetchWithBrowser(url, options = {}) {
  const { waitMs = 45000 } = options;
  const edgePath = findEdgePath();

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--disable-blink-features=AutomationControlled',
    `--virtual-time-budget=${waitMs}`,
    '--dump-dom',
    url,
  ];

  let stdout = '';

  if (process.platform === 'win32') {
    const quotedArgs = args.map((a) => `'${a.replace(/'/g, "''")}'`).join(' ');
    const command = `& '${edgePath.replace(/'/g, "''")}' ${quotedArgs}`;
    const result = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
      {
        maxBuffer: 20 * 1024 * 1024,
        timeout: waitMs + 20000,
        windowsHide: true,
      }
    );
    stdout = result.stdout;
  } else {
    const result = await execFileAsync(edgePath, args, {
      maxBuffer: 20 * 1024 * 1024,
      timeout: waitMs + 120000,
      windowsHide: true,
    });
    stdout = result.stdout;
  }

  if (!stdout?.trim()) {
    throw new Error(`Browser returned empty HTML for ${url}`);
  }

  if (isBlockedHtml(stdout)) {
    throw new Error('Page blocked by bot protection');
  }

  return stdout;
}
