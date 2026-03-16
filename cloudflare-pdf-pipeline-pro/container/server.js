import http from "http"
import { spawn } from "child_process"
import fs from "fs"
import path from "path"
import os from "os"

const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "owner-password"

http.createServer(async (req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405)
    res.end("Method not allowed")
    return
  }

  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }

  const inputBuffer = Buffer.concat(chunks)

  const tmpDir = os.tmpdir()
  const inputPath = path.join(tmpDir, `input-${Date.now()}.pdf`)
  const outputPath = path.join(tmpDir, `output-${Date.now()}.pdf`)

  try {
    await fs.promises.writeFile(inputPath, inputBuffer)

    const qpdf = spawn("qpdf", [
      "--encrypt",
      "",                          // user password (empty = no open password)
      OWNER_PASSWORD,                // owner password
      "256",                       // key length
      "--",                        // end of options
      inputPath,
      outputPath
    ])

    await new Promise((resolve, reject) => {
      qpdf.on("close", (code) => {
        if (code === 0) resolve()
        else reject(new Error(`qpdf exited with code ${code}`))
      })
      qpdf.on("error", reject)
    })

    const protectedPdf = await fs.promises.readFile(outputPath)

    res.writeHead(200, {
      "content-type": "application/pdf"
    })
    res.end(protectedPdf)

  } catch (err) {
    console.error("Encryption failed:", err)
    res.writeHead(500)
    res.end("Encryption failed")
  } finally {
    fs.unlink(inputPath, () => {})
    fs.unlink(outputPath, () => {})
  }

}).listen(3000)

console.log("PDF encryption service running on port 3000")