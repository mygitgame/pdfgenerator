export default {

async fetch(req, env) {

  const url = new URL(req.url)

  if (url.pathname === "/generate") {

    const text = url.searchParams.get("text") || "Confidential document"

    const pdf = `%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R
/MediaBox [0 0 300 200]
/Contents 4 0 R
/Resources << /Font << /F1 5 0 R >> >>
>>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 18 Tf
50 100 Td
(${text}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
0
%%EOF`

    const key = `raw/${crypto.randomUUID()}.pdf`

    await env.RAW_BUCKET.put(key, pdf)

    await env.PDF_QUEUE.send({ key })

    return new Response(JSON.stringify({
      status:"queued",
      key:key
    }),{
      headers:{ "content-type":"application/json" }
    })
  }

  if (url.pathname === "/download") {

    const key = url.searchParams.get("key")

    if (!key) {
      return new Response("key parameter required",{status:400})
    }

    const finalKey = key.replace("raw/","secure/")

    const file = await env.FINAL_BUCKET.get(finalKey)

    if(!file){
      return new Response("file not ready",{status:404})
    }

    const signedUrl = await env.FINAL_BUCKET.getSignedUrl(finalKey, {
      expiration: 30 * 60
    })

    return Response.redirect(signedUrl, 302)
  }

  return new Response("PDF Pipeline Worker Running")

},

async queue(batch, env){

  for(const msg of batch.messages){
    try {

    const { key } = msg.body

    const pdf = await env.RAW_BUCKET.get(key)

    if (!pdf) {
      console.log("PDF not found in raw bucket:", key)
      msg.ack()
      continue
    }

    const encrypted = await env.PDF_ENCRYPTOR.fetch("http://localhost/",{
      method:"POST",
      body:pdf.body
    })

    if (!encrypted.ok) {
      throw new Error(`Container returned ${encrypted.status}`)
    }

    const buffer = await encrypted.arrayBuffer()

    const finalKey = key.replace("raw/","secure/")

    await env.FINAL_BUCKET.put(finalKey, buffer)

    await env.RAW_BUCKET.delete(key)

    console.log("encrypted:", finalKey)
    msg.ack()

    } catch (err) {
      console.error("Encryption failed:", err)
      msg.retry()
    }
  }

}

}