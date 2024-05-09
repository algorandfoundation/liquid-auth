FROM node:20.12-alpine AS BUILDER

COPY . .

RUN npm ci

RUN npm run build

FROM node:20.12-alpine

# App Files
COPY --from=BUILDER ./node_modules ./node_modules
COPY --from=BUILDER ./package.json ./package.json
COPY --from=BUILDER ./package-lock.json ./package-lock.json
# Client Files
COPY --from=BUILDER ./clients ./clients
# Service Files
COPY --from=BUILDER ./services/liquid-auth-api-js/ ./services/liquid-auth-api-js/

RUN npm ci --production

# Expose the port on which the app will run
EXPOSE 3000

CMD ["npm", "run", "start"]
