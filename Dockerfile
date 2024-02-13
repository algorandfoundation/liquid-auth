FROM node:20-alpine AS BUILDER

COPY . .

RUN npm ci

RUN npm run build

FROM node:20-alpine

COPY --from=BUILDER ./node_modules ./node_modules
COPY --from=BUILDER ./package.json ./package.json
COPY --from=BUILDER ./services/liquid-auth-api-js/assetlinks.json ./services/liquid-auth-api-js/assetlinks.json
COPY --from=BUILDER ./services/liquid-auth-api-js/dist ./services/liquid-auth-api-js/dist
COPY --from=BUILDER ./services/liquid-auth-api-js/views ./services/liquid-auth-api-js/views
COPY --from=BUILDER ./services/liquid-auth-api-js/public ./services/liquid-auth-api-js/public
COPY --from=BUILDER ./services/liquid-auth-api-js/package.json ./services/liquid-auth-api-js/package.json

# Expose the port on which the app will run
EXPOSE 3000

CMD ["npm", "run", "start"]
