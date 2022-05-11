FROM node:16.15.0 as builder

RUN npm install -g \
    npm@8.5.5 \
    typescript@4.6.4 \
    @nestjs/cli@8.2.5

WORKDIR /build

COPY package.json /build
COPY package-lock.json /build
RUN npm install

COPY tsconfig.json /build
COPY tsconfig.build.json /build
COPY nest-cli.json /build
COPY src  /build/src

RUN mkdir stats
RUN npm run build

FROM node:16.15.0
WORKDIR /app
COPY --from=builder /build/dist /app/dist
COPY --from=builder /build/node_modules /app/node_modules
COPY --from=builder /build/stats /app/stats
COPY --from=builder /build/package.json /app
COPY --from=builder /build/package-lock.json /app

CMD npm run start:prod
