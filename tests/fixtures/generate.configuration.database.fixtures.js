import {writeFileSync} from 'node:fs'
import {faker} from '@faker-js/faker'

const count = 10

const fixtures = []

for(let i = 0; i < count; i++) {
  fixtures.push({
    host: faker.internet.url({protocol: 'http', appendSlash: false}).replace('http://', ''),
    username: faker.internet.userName(),
    password: faker.internet.password(),
    name: 'fido',
    atlas: faker.datatype.boolean(),
  })
}

writeFileSync('configuration.database.fixtures.json', JSON.stringify(fixtures, null, 2))
