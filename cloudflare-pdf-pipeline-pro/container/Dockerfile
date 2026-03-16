FROM node:20

RUN apt-get update && apt-get install -y qpdf && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server.js .

CMD ["node","server.js"]