# Cloudflare PDF Pipeline Pro

Production-ready serverless document pipeline built on:

- Cloudflare Workers
- Cloudflare R2
- Cloudflare Queues
- Cloudflare Containers
- GitHub Actions CI/CD

This system generates PDFs at the edge and processes them asynchronously.

---

# Architecture

Client
→ Worker (/generate)
→ R2 raw bucket
→ Queue message
→ Worker Queue Consumer
→ Container Encryption Service
→ R2 encrypted bucket
→ Worker (/download)

---

# Project Structure

src/
 worker.js

container/
 Dockerfile
 server.js

.github/workflows/
 deploy.yml

wrangler.toml

---

# Step 1 Install Wrangler

npm install -g wrangler

Login:

wrangler login

---

# Step 2 Create R2 Buckets

wrangler r2 bucket create raw-pdf
wrangler r2 bucket create encrypted-pdf

---

# Step 3 Create Queue

wrangler queues create pdf-jobs

---

# Step 4 Deploy Worker

wrangler deploy

---

# Step 5 Build Encryption Container

cd container

docker build -t pdf-encrypt .

Deploy container to Cloudflare Containers.

Expose internal service:

ENCRYPT_SERVICE=http://container:3000

---

# Step 6 Test

Generate PDF:

/generate?text=hello

Download encrypted file:

/download?key=secure/<uuid>.pdf

---

# GitHub Auto Deployment

Add repository secret:

CLOUDFLARE_API_TOKEN

Every push to main automatically deploys Worker.

---

# Performance

Worker generation: ~5ms
Queue processing: ~100ms
Encryption: ~20ms

---

# Notes

The encryption demo uses AES. Real PDF password permissions can be added with a PDF security handler.