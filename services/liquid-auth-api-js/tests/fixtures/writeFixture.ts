import { join } from "node:path";
import { writeFileSync } from "node:fs";
const filePath = join(process.cwd(), './src');
let fixtures = {}
export function writeFixture(name: string, content: string) {
    if(typeof fixtures[name] === 'undefined') {
      fixtures[name] = []
    }
    let fixture
    try{
        fixture = JSON.parse(content)
    } catch (e) {
        fixture = content
    }
    fixtures[name].push(fixture)
    const namePath = name.split('.')[0]
    const fixturePath = join(filePath, `./${namePath}/__fixtures__`);
    if(process.env.NODE_ENV !== 'test') {
        writeFileSync(join(fixturePath, name), JSON.stringify(fixtures[name],null, 2));
    }
}
