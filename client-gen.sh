

CODEGEN=swagger-codegen-cli.jar
if [ -f $CODEGEN ]; then
    echo "Codegen already exists"
else
    echo "Downloading codegen"
    wget https://repo1.maven.org/maven2/io/swagger/codegen/v3/swagger-codegen-cli/3.0.52/swagger-codegen-cli-3.0.52.jar -O swagger-codegen-cli.jar
fi

wget http://localhost:3000/docs-yaml -O openapi.yaml

java -jar swagger-codegen-cli.jar generate -i ./openapi.yaml -l typescript-fetch -o clients/liquid-auth-client-js/src/client

sed -i "s/configuration/configuration.js/g" clients/liquid-auth-client-js/src/client/index.ts
sed -i "s/api/api.js/g" clients/liquid-auth-client-js/src/client/index.ts
sed -i "s/\.\/configuration/\.\/configuration.js/g" clients/liquid-auth-client-js/src/client/api.ts
sed -i "s/\.\/configuration/\.\/configuration.js/g" clients/liquid-auth-client-js/src/client/api_test.spec.ts
sed -i "s/\.\/api/\.\/api.js/g" clients/liquid-auth-client-js/src/client/api_test.spec.ts
rm clients/liquid-auth-client-js/src/client/git_push.sh

#java -jar swagger-codegen-cli.jar generate -i http://localhost:3000/docs-json -l kotlin-client -o clients/liquid-auth-client-kotlin
