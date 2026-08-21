import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export type RunYtDlp = (args: string[]) => Promise<{ stdout: string; stderr: string }>;

/** yt-dlp is what actually keeps working against YouTube's anti-scraping changes; plain HTTP requests to caption/RSS endpoints get silently blocked. */
export const defaultRunYtDlp: RunYtDlp = (args) => execFileAsync("yt-dlp", args, { windowsHide: true, maxBuffer: 1024 * 1024 * 50 });
