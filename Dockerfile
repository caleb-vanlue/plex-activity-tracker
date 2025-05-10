FROM node:20-alpine AS base

# Test stage
FROM base AS test
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "test"]

FROM base AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npm run start:prod"]