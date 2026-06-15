const { spawn } = require("node:child_process");

const host = process.env.WEB_HOST || "127.0.0.1";
const port = process.env.WEB_PORT || "18180";

const child = spawn(
  "ng",
  ["serve", "--host", host, "--port", port, "--proxy-config", "proxy.conf.cjs"],
  { stdio: "inherit", shell: process.platform === "win32" }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

