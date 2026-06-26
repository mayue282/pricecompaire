FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server.mjs ./
COPY server ./server
COPY scrapers ./scrapers
COPY public ./public

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV TRUST_PROXY=1

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.mjs"]
