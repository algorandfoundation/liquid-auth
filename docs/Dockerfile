FROM node:22 AS BUILDER

WORKDIR /home/node

ENV PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev -y

COPY . .

RUN npm ci

RUN npx playwright-core install --with-deps chromium && npm run build

FROM node:22-slim as DEV

WORKDIR /home/node

COPY --from=BUILDER /home/node ./

CMD ["npm", "run", "dev"]
