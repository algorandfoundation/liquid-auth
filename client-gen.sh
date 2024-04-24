

CODEGEN=swagger-codegen-cli.jar
if [ -f $CODEGEN ]; then
    echo "Codegen already exists"
else
    echo "Downloading codegen"
    wget https://repo1.maven.org/maven2/io/swagger/codegen/v3/swagger-codegen-cli/3.0.52/swagger-codegen-cli-3.0.52.jar -O swagger-codegen-cli.jar
fi

java -jar swagger-codegen-cli.jar generate -i http://localhost:3000/api-json -l typescript-fetch -o clients/liquid-auth-client-js/src/client
java -jar swagger-codegen-cli.jar generate -i http://localhost:3000/api-json -l kotlin-client -o clients/liquid-auth-client-kotlin
