FROM node:24-alpine as build


ARG BUILD_DATE
ARG APP_VERSION

LABEL org.opencontainers.image.authors='Martin Reinhardt (martin@m13t.de)' \
    org.opencontainers.image.created=$BUILD_DATE \
    org.opencontainers.image.version=$APP_VERSION \
    org.opencontainers.image.url='https://hub.docker.com/r/tools4homeautomation/solix-exporter' \
    org.opencontainers.image.documentation='https://github.com/t21n/solix-exporter' \
    org.opencontainers.image.source='https://github.com/t21n/solix-exporter.git' \
    org.opencontainers.image.licenses='MIT'


RUN mkdir /app
WORKDIR /app
COPY . .
RUN npm ci \
    && npm run build \
    && npm prune --production \
    && mkdir out \
    && mv bin out/ \
    && mv node_modules out/

FROM alpine
RUN apk add --update nodejs
RUN mkdir /app
WORKDIR /app
COPY --from=build /app/out /app

CMD [ "node", "/app/bin/src/app.js" ]
