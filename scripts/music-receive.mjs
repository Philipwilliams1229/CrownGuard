// A throwaway local receiver for the music lab's window.lab.send(id): it
// saves each POSTed WAV into samples/ (gitignored). Run it, then in the lab:
//   await lab.send("greenwood-build")
import http from "node:http";
import fs from "node:fs";
const port = Number(process.argv[2] || 5199);
fs.mkdirSync("samples", { recursive: true });
http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.end();
  const name = decodeURIComponent(req.url.slice(1)).replace(/[^\w.-]/g, "_");
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => { fs.writeFileSync(`samples/${name}`, Buffer.concat(chunks)); console.log("saved", name); res.end("ok"); });
}).listen(port, "127.0.0.1", () => console.log("listening", port));
