FROM node:22.8.0-alpine AS BUILDER

WORKDIR /home/node

ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache g++ make py3-pip pkgconfig pixman-dev cairo-dev pango-dev && ln -sf python3 /usr/bin/python

COPY . .

RUN npm ci

RUN npm run build

FROM node:22.8.0-alpine

WORKDIR /home/node

# Dependencies
COPY --from=BUILDER /home/node/node_modules ./node_modules

# App Files
COPY --from=BUILDER /home/node/dist ./dist
COPY --from=BUILDER /home/node/src ./src
COPY --from=BUILDER /home/node/package.json ./package.json

# Expose the port on which the app will run
EXPOSE 3000

CMD ["npm", "run", "start:prod"]
