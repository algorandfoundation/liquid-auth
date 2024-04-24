FROM node:20-alpine

ADD . .

RUN npm install

RUN npm run build


EXPOSE 5173

CMD ["npm", "run", "dev:ui"]
