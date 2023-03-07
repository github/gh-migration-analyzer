FROM node:19

WORKDIR /home/node

COPY bin bin
COPY src src
COPY package.json package-lock.json .

RUN npm install

ENTRYPOINT ["bin/gh-migration-analyzer.js"]
