# ColumnistosJS

Soy una bot que reporta los porcentajes de representación de género diarios en las columnas de opinión de periódicos. Soy hija de [columnistos](https://github.com/columnistos/columnistos) escrita en NodeJS.

Soy capaz de publicar _woots_ a [Wafrn](https://app.wafrn.net/blog/columnistoscr), una red social de [código abierto](https://github.com/gabboman/wafrn) que está federada con Mastodon y Bluesky.

Puedo correr localmente con Docker y uso Serverless para correr en AWS.

## Desarrollo local

Crea una cuenta en [Wafrn](https://app.wafrn.net). Crea el archivo `.env` usando como base `.env.example`.
y completa las variables de ambiente.

```bash
npm i
npm run start
```

## Configurar un proyecto nuevo en la nube

### Deployment local a la nube

```bash
npm i -g serverless@3.40.0
```

En AWS, en el menú superior derecho elige "Security credentials". Crea un nuevo set de Access keys para CLI y guarda el csv a la computadora. Llena el siguiente comando con esos valores.

```bash
serverless config credentials --provider aws --key XXXX --secret XXXX
```

#### Instrucciones con MFA

Si tienes MFA habilitado, guarda de la misma página Security credentials el identificador de tu dispositivo MFA que tiene el patrón `arn:aws:iam:xxx`.

Vamos a generar unas credenciales temporales que vamos a guardar en un perfil llamado `mfa`. Por defecto expiran en un día.
Para que Serverless sepa que queremos usar estas credenciales temporales, hay que pasarle el parámetro `--aws-profile mfa`.

```bash
# hay que deshabilitar estas variables primero
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
# este comando devuelve con json con los valores temporales para aws_access_key_id, aws_secret_access_key y aws_session_token
aws sts get-session-token --serial-number arn:aws:iam:xxx --token-code [token-de-dispositivo-mfa]
# ingresa los valores temporales de key id and key secret del comando anterior
aws configure --profile mfa
# ingresa el valor temporal de session token
aws configure --profile mfa set aws_session_token [session-token-del-comando-anterior]
export AWS_PROFILE="mfa" # talvez no es completamente necesario
```

#### Comando para hacer deployment

```bash
npm run local-deploy
```

### Deployment desde GitHub Actions

Cuando ocurre un commit en `main`, un [GitHub Workflow](.github/workflows/build-and-deploy.yml) actualiza el deployment en AWS. Para que Github sea capaz de hacer cambios en AWS, hay que darle un rol en nuestra cuenta de AWS.

1. Crear un Identity provider en AWS.
   En la consola de IAM, elije Identity providers y Add provider. En Configure provider, elije OpenID Connect.
   En Provider URL, usa `https://token.actions.githubusercontent.com`. Para la audiencia, usa `sts.amazonaws.com`.
2. Asigna un rol IAM al identity provider.
   En la página del identity provider, elije Assign role. Elije crear un nuevo rol.
   El nombre puede ser `GitHubAction-AssumeRoleWithAction` y para los permisos asigna los siguientes:

```
AmazonAPIGatewayAdministrator
AmazonRoute53AutoNamingFullAccess
AmazonRoute53ReadOnlyAccess
AmazonS3FullAccess
AWSCertificateManagerReadOnly
AWSCloudFormationFullAccess
AWSLambda_FullAccess
AmazonAPIGatewayPushToCloudWatchLogs
IAMFullAccess
CloudWatchLogsFullAccess
```

También es necesario agregar la siguiente política inline

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Statement1",
      "Effect": "Allow",
      "Action": [
        "events:DescribeRule",
        "events:PutRule",
        "events:PutTargets"
      ],
      "Resource": [
        "*"
      ]
    }
  ]
}
```

3. Copia el ARN del rol a la variable de ambiente de GitHub `AWS_ROLE_TO_ASSUME`.

4. Configura los secretos de ambiente de GitHub `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`.
