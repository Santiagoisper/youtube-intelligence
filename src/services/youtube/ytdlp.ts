import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export type RunYtDlp = (args: string[]) => Promise<{ stdout: string; stderr: string }>;

/** Use a private cookie jar when one is provisioned; never read cookies from the container browser. */
export const defaultRunYtDlp: RunYtDlp = (args) => {
  const cookieFile = process.env.YOUTUBE_COOKIES_FILE;
  if (cookieFile && existsSync(cookieFile)) args = ["--cookies", cookieFile, ...args];
  return execFileAsync("yt-dlp", args, { windowsHide: true, maxBuffer: 1024 * 1024 * 50 });
};
