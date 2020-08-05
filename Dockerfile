FROM node:12-alpine as build-env

LABEL maintainer "DevYukine <DevYukine@gmx.de> @ bots.best"

WORKDIR /usr/src/graphql-gateway/build

RUN apk add --update \
	&& apk add --no-cache --virtual .build-deps curl build-base python g++ make

COPY . .

RUN curl -L https://unpkg.com/@pnpm/self-installer | node \
	&& pnpm config set store-dir ~/.pnpm-store && pnpm install && pnpm run build

FROM node:12-alpine

WORKDIR /usr/src/graphql-gateway

RUN apk add --update \
	&& apk add --no-cache --virtual .build-deps curl

COPY package.json pnpm-lock.yaml ./

RUN curl -L https://unpkg.com/@pnpm/self-installer | node \
	&& pnpm config set store-dir ~/.pnpm-store && pnpm install --prod

COPY --from=build-env /usr/src/graphql-gateway/build/dist ./dist

RUN apk del .build-deps

CMD ["node", "."]
