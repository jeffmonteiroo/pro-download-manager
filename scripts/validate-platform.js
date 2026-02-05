/**
 * Cross-platform validation script
 * Checks if the environment is ready for the Pro Download Manager
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const isWindows = os.platform() === 'win32';
const isLinux = os.platform() === 'linux';
const isMac = os.platform() === 'darwin';

console.log(`[Validation] Running on: ${os.platform()} (${os.release()})`);

const results = {
    platform: os.platform(),
    binaries: {
        ytDlp: false,
        ffmpeg: false
    },
    paths: {
        cwd: process.cwd(),
        userData: 'Not checked (requires Electron context)'
    }
};

function checkBinary(name) {
    const command = isWindows ? 'where' : 'which';
    try {
        const result = execSync(`${command} ${name}`, { stdio: 'pipe', encoding: 'utf8' }).trim();
        console.log(`[Binary] Found ${name} at: ${result.split('\n')[0]}`);
        return true;
    } catch (e) {
        console.warn(`[Binary] ${name} NOT found in system PATH`);
        return false;
    }
}

console.log('\n--- Checking Binaries ---');
results.binaries.ytDlp = checkBinary('yt-dlp');
results.binaries.ffmpeg = checkBinary('ffmpeg');

console.log('\n--- Path Separator Check ---');
const testPath = path.join('test', 'folder', 'file.txt');
console.log(`[Path] path.join('test', 'folder', 'file.txt') => ${testPath}`);
if (isWindows && testPath.includes('\\')) {
    console.log('[Path] Windows backslash detected (Correct)');
} else if (!isWindows && testPath.includes('/')) {
    console.log('[Path] POSIX forward slash detected (Correct)');
} else {
    console.warn('[Path] Unexpected path separator behavior');
}

console.log('\n--- Summary ---');
console.log(JSON.stringify(results, null, 2));

if (!results.binaries.ytDlp || !results.binaries.ffmpeg) {
    console.warn('\n[WARNING] Some binaries are missing. The app will need them to be bundled or installed manually.');
} else {
    console.log('\n[SUCCESS] Basic platform requirements met.');
}
