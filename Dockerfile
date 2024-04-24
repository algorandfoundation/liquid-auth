FROM node:20-alpine AS BUILDER

COPY . .

RUN npm ci

RUN npm run build

FROM node:20-alpine

# App Files
COPY --from=BUILDER ./node_modules ./node_modules
COPY --from=BUILDER ./package.json ./package.json
COPY --from=BUILDER ./package-lock.json ./package-lock.json
# Client Files
COPY --from=BUILDER ./clients ./clients
# Service Files
COPY --from=BUILDER ./services/liquid-auth-api-js/assetlinks.json ./services/liquid-auth-api-js/assetlinks.json
COPY --from=BUILDER ./services/liquid-auth-api-js/dist ./services/liquid-auth-api-js/dist
COPY --from=BUILDER ./services/liquid-auth-api-js/bin ./services/liquid-auth-api-js/bin
COPY --from=BUILDER ./services/liquid-auth-api-js/.env.template ./services/liquid-auth-api-js/.env.template
COPY --from=BUILDER ./services/liquid-auth-api-js/package.json ./services/liquid-auth-api-js/package.json

RUN npm ci --production

# Expose the port on which the app will run
EXPOSE 3000

CMD ["npm", "run", "start"]
