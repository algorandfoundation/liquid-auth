import {writeFileSync} from 'node:fs'
import {faker} from '@faker-js/faker'

const count = 10

const fixtures = []
// host: process.env.REDIS_HOST || 'localhost',
//   port: parseInt(process.env.REDIS_PORT, 10) || 6379,
//   username: process.env.REDIS_USERNAME || 'default',
//   password: process.env.REDIS_PASSWORD || '',
for(let i = 0; i < count; i++) {
  fixtures.push({
    host: faker.internet.url({protocol: 'http', appendSlash: false}).replace('http://', ''),
    port: faker.datatype.number({min: 1024, max: 65535}),
    username: faker.internet.userName(),
    password: faker.internet.password()
  })
}

writeFileSync('configuration.socket.fixtures.json', JSON.stringify(fixtures, null, 2))
