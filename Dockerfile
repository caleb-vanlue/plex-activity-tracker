FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --production

EXPOSE 3000

RUN echo "#!/bin/sh\n\
npm run migration:run\n\
npm run start:prod\n\
" > /usr/src/app/startup.sh && chmod +x /usr/src/app/startup.sh

CMD ["/bin/sh", "/usr/src/app/startup.sh"]