# ColumnistosJS

### 🔨 en construcción 🚧

Soy una bot que reporta los porcentajes de representación de género diarios en las columnas de opinión de periódicos. Soy hija de [columnistos](https://github.com/columnistos/columnistos) escrita en NodeJS.

Soy capaz de publicar _woots_ a [Wafrn](https://app.wafrn.net/blog/columnistoscr), una red social de [código abierto](https://github.com/gabboman/wafrn) que está federada con Mastodon y Bluesky.

Puedo correr localmente con Docker y uso Serverless para correr en AWS.

## Desarrollo local

Crea una cuenta en [Wafrn](https://app.wafrn.net). Crea el archivo `.env` usando como base `.env.example`.
y completa las variables de ambiente.

```bash
npm i
docker-compose up -d # Correr la base de datos
```

Usa un programa como TablePlus para conectarse a la base de datos local para correr la configuración

```sql
CREATE DATABASE columnistos;
CREATE USER IF NOT EXISTS '<<DB_USER>>' IDENTIFIED BY '<<DB_PWD>>';
GRANT ALL PRIVILEGES ON columnistos.* TO '<<DB_USER>>';
FLUSH PRIVILEGES;
```

Puedes correr cada uno de los scripts de manera separada con los siguientes comandos:

```bash
npm run scripts:crawl
npm run scripts:post
npm run scripts:sendDms
```

## Docker Compose

```bash
docker build -t crawl:latest -f crawl.Dockerfile .
docker build -t post:latest -f post.Dockerfile .
docker build -t send-dms:latest -f sendDms.Dockerfile .
docker compose run --rm crawl
docker compose run --rm post
docker compose run --rm sendDms
```

## Kubernetes en local

### Instalación

```bash
brew install kubectl
brew install minikube
# Verificar instalación
kubectl version --client
minikube version
minikube start --driver=docker
docker build -t crawl:latest -f crawl.Dockerfile .
docker build -t post:latest -f post.Dockerfile .
docker build -t send-dms:latest -f sendDms.Dockerfile .
kubectl create secret generic columnistos-secret --from-env-file=.env
kubectl create configmap columnistos-config --from-env-file=.env
kubectl apply -f scripts.yaml
```

### Desarrollo

Algunos comandos útiles durante desarrollo local de kubernetes.

```bash
minikube start --driver=docker
minikube dashboard
kubectl delete secret columnistos-secret
kubectl delete configmap columnistos-config
# Forzar una nueva versión de las imágenes
minikube image load crawl:latest
minikube image load post:latest
minikube image load send-dms:latest
minikube stop
```

## Deployment a DigitalOcean

Cada vez que hay commit nuevo en `main` que no contiene la palabra `[no ci]`, corre un workflow que hace deploy a un Kubernetes de DigitalOcean.

### Configurar variables en el repositorio

Configurar las siguientes variables de ambiente en GitHub, usar como base `env.example`

```
WAFRN_EMAIL
DB_HOST
DB_USER=webadmin
CRAWLER_DIR
ADMIN_HANDLES
DOKS_CLUSTER_NAME
DOKS_REGION
```

Configurar los siguientes secretos en GitHub

```
DB_PWD
WAFRN_PASSWORD
GH_TOKEN
DIGITALOCEAN_ACCESS_TOKEN
```

### Configurar Github token para semantic release

Crear un [personal access token](https://github.com/settings/tokens/new) con una expiración de 1 año (custom) con scopes `repo` y `write:packages` y guardar el valor en el secret `GH_TOKEN`.

### Configurar DigitalOcean access token

Crear un [api token de DigitalOcean](https://cloud.digitalocean.com/account/api/tokens?i=641bf2) con una expiración de 1 año con todos los scopes de `app` y guardar el valor en el secret `DIGITALOCEAN_ACCESS_TOKEN`. Se puede llamar `Columnistos GitHub Actions Deploy` para diferenciarlo de otros proyectos.

`DOKS_CLUSTER_NAME` es el nombre del cluster, por ejemplo `columnistos-k8s`.

`DOKS_REGION` es la región elegida para el cluster, por ejemplo `nyc1`.

### Permitir que GithubActions haga tags

En los Settings del repo > Actions > General, habilitar el checkbox "Allow GitHub Actions to create and approve pull requests".
