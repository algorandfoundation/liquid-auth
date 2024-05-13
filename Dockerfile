FROM node:20.12-alpine AS BUILDER

ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache g++ make py3-pip pkgconfig pixman-dev cairo-dev pango-dev && ln -sf python3 /usr/bin/python

COPY . .

RUN npm ci

RUN npm run build

FROM node:20.12-alpine

# App Files
COPY --from=BUILDER ./node_modules ./node_modules
COPY --from=BUILDER ./package.json ./package.json
COPY --from=BUILDER ./package-lock.json ./package-lock.json
# Sites Files
COPY --from=BUILDER ./sites ./sites
# Service Files
COPY --from=BUILDER ./services/liquid-auth-api-js/ ./services/liquid-auth-api-js/

# Expose the port on which the app will run
EXPOSE 3000
EXPOSE 5173

CMD ["npm", "run", "start"]
