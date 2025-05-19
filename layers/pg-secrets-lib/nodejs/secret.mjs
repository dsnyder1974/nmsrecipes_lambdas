import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

export const getDBCreds = async () => {
    const secret_name = "postgres_credentials";

    const smClient = new SecretsManagerClient({
      region: "us-east-2",
    });

    let response;

    try {
      response = await smClient.send(
        new GetSecretValueCommand({
          SecretId: secret_name,
          VersionStage: "AWSCURRENT",
        })
      );
    } catch (error) {
      // For a list of exceptions thrown, see
      // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
      throw error;
    }

    const secret = response.SecretString;
    return JSON.parse(secret);
};
