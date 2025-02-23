# ColumnistosJS

Una versión para el bot [columnistos](https://github.com/columnistos/columnistos) escrita en NodeJS.

## Objetivos iniciales

- Capacidad de usar Serverless para publicar el bot en aws.
- Interfaz para publicar a [Wafrn](https://app.wafrn.net) para aprovechar la capacidad de federar con Mastodon y Bluesky.
- Usar mensajes directos de Wafrn para determinar el género de los autores nuevos.

## Configurar un proyecto nuevo

### Deployment local a la nube

```bash
npm i -g serverless@3.40.0
```

En AWS, en el menú superior derecho elige "Security credentials". Crea un nuevo set de Access keys para CLI y guarda el csv a la computadora. Llena el siguiente comando con esos valores.

```bash
serverless config credentials --provider aws --key XXXX --secret XXXX
```

#### Instrucciones con MFA

Si tienes MFA habilitado, guarda de la misma página el identificador de tu dispositivo MFA que tiene el patrón `arn:aws:iam:xxx`.

Vamos a generar unas credenciales temporales que vamos a guardar en un perfil llamado `mfa`. Por defecto expiran en un día.
Para que Serverless sepa que queremos usar un perfile particular, hay que pasarle el parámetro `--aws-profile mfa`.

```bash
# hay que deshabilitar estas variables primero
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
aws sts get-session-token --serial-number arn:aws:iam:xxx --token-code [token-de-dispositivo-mfa]
# ingresa los valores temporales de key id and key secret devueltos en el comando anterior
aws configure --profile mfa
aws configure --profile mfa set aws_session_token [session-token-del-comando-anterior]
export AWS_PROFILE="mfa" # talvez no es completamente necesario
```

#### Comando para hacer deployment

```bash
npm run local-deploy
```
