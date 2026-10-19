# Signaling server + mobile camera page in one image
FROM node:20-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "@air-device/signaling-server..." --filter "@air-device/mobile-client..." run build
RUN pnpm --filter @air-device/signaling-server deploy --prod /out \
  && cp -r apps/mobile-client/dist /out/public

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 MOBILE_DIR=/app/public
COPY --from=build /out ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/main.js"]
