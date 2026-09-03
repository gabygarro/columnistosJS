# ColumnistosJS

Soy una bot que reporta los porcentajes de representación de género diarios en las columnas de opinión de periódicos. Soy hija de [columnistos](https://github.com/columnistos/columnistos) escrita en NodeJS.

Soy capaz de publicar _woots_ a [Wafrn](https://app.wafrn.net/blog/columnistoscr), una red social de [código abierto](https://github.com/gabboman/wafrn) que está federada con Mastodon y Bluesky.

Puedo correr localmente con Docker y en producción corro en un droplet de DigitalOcean, orquestada con `docker compose` y con [ofelia](https://github.com/mcuadros/ofelia) como scheduler de los cron jobs.

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

> **Nota:** El despliegue en producción ya no usa Kubernetes (ver sección _Deployment a DigitalOcean_ más abajo). Los manifiestos en `k8s/` se conservan como referencia histórica.

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
kubectl apply -f k8s/scripts.yaml
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

Producción corre en un droplet de DigitalOcean junto con otros servicios (WordPress detrás de Traefik). Los 3 workloads del bot (`crawl`, `post`, `send-dms`) se ejecutan como servicios de `docker compose` que quedan _idle_ (`sleep infinity`) y son invocados por [ofelia](https://github.com/mcuadros/ofelia) según los cron schedules definidos en labels. La base de datos MariaDB se comparte con los blogs de WordPress y vive en el mismo `docker compose`.

### Arquitectura

```
Droplet Ubuntu (docker compose)
├── traefik            (reverse proxy + Let's Encrypt)
├── db                 (mariadb:11, volumen persistente, compartida)
├── laurbanista        (WordPress)
├── antigentrificacion (WordPress)
├── ofelia             (scheduler, lee labels de los servicios)
├── crawl              (imagen de GHCR, sleep infinity)
├── post               (imagen de GHCR, sleep infinity)
└── send-dms           (imagen de GHCR, sleep infinity)
```

Ofelia usa formato de cron de **6 campos** (segundos primero). Los schedules replican los de `k8s/scripts.yaml`:

| Servicio   | Schedule (UTC)               |
| ---------- | ---------------------------- |
| `crawl`    | `0 55 13-23,0-5 * * *`       |
| `post`     | `0 0 16-23 * * *`            |
| `send-dms` | `0 20,30,40 13-23,0-5 * * *` |

### CI/CD

En cada commit a `main` que no contenga `[no ci]`, el workflow `.github/workflows/build-and-deploy.yml`:

1. Crea un tag nuevo incrementando el patch.
2. Construye las 3 imágenes (`crawl`, `post`, `send-dms`) y las publica a GHCR con las tags `latest` y `<version>`.
3. Se conecta por SSH al droplet como el usuario `deploy`, actualiza `COLUMNISTOS_VERSION` en `/root/.env`, y corre `docker compose pull && docker compose up -d` sobre los servicios del bot.

### Configurar variables en el repositorio

Variables de ambiente en GitHub (usar `.env.example` como referencia):

```
WAFRN_EMAIL
DB_HOST=db
DB_PORT=3306
DB_USER=columnistos
CRAWLER_DIR=/app
ADMIN_HANDLES
AI_WORKER_URL
CLOUDFLARE_ACCOUNT_ID
```

Secretos en GitHub:

```
DB_PWD
WAFRN_PASSWORD
GH_TOKEN                # PAT con repo + write:packages para GHCR
CLOUDFLARE_API_TOKEN
DROPLET_HOST            # IP o hostname del droplet
DROPLET_USER            # deploy
DROPLET_SSH_KEY         # llave privada del par de llaves dedicado a CI
```

En Settings del repo → Actions → General, habilitar el checkbox _"Allow GitHub Actions to create and approve pull requests"_ para que el workflow pueda crear tags.

### Bootstrap del droplet (una sola vez)

Estos pasos se hacen manualmente al preparar el droplet.

**1. Usuario `deploy` y llaves SSH**

Como `root` en el droplet:

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
usermod -aG docker deploy
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
chmod 440 /etc/sudoers.d/deploy

install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
# Pegar tu llave pública personal + la llave pública de CI en:
nano /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
```

En tu máquina local, generar un par de llaves dedicado a GitHub Actions:

```bash
ssh-keygen -t ed25519 -C "github-actions@columnistos" -f ~/.ssh/columnistos_deploy -N ""
# La llave privada (~/.ssh/columnistos_deploy) va al secret DROPLET_SSH_KEY.
```

**2. Swap y hardening básico**

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf

# Opcional: deshabilitar login por password
sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl reload ssh
```

**3. Login a GHCR desde el droplet**

Crear un PAT clásico de GitHub con scope `read:packages`, luego como `deploy`:

```bash
echo <PAT> | docker login ghcr.io -u <github-username> --password-stdin
```

**4. Base de datos**

En el `docker-compose.yml` del droplet, agregar límites de memoria al servicio `db`:

```yaml
db:
  image: mariadb:11
  restart: always
  command:
    - --innodb-buffer-pool-size=256M
    - --max-connections=50
  # ...resto sin cambios
```

Crear la base y el usuario para el bot:

```bash
docker compose exec db mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" <<SQL
CREATE DATABASE columnistos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'columnistos'@'%' IDENTIFIED BY '<pwd>';
GRANT ALL PRIVILEGES ON columnistos.* TO 'columnistos'@'%';
FLUSH PRIVILEGES;
SQL
```

Si migras data de una base de datos MySQL administrada, hay que limpiar sentencias de replicación antes de importar:

```bash
sed -i.bak \
  -e '/SET @@SESSION\.SQL_LOG_BIN/,/;/d' \
  -e '/SET @@GLOBAL\.GTID_PURGED/,/;/d' \
  /tmp/columnistos.sql

docker compose exec -T db mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" columnistos < /tmp/columnistos.sql
```

**5. Servicios del bot en `docker-compose.yml`**

Agregar al mismo compose file donde vive WordPress:

```yaml
ofelia:
  image: mcuadros/ofelia:latest
  restart: always
  depends_on: [crawl, post, send-dms]
  command: daemon --docker
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro

crawl:
  image: ghcr.io/${GH_OWNER}/columnistosjs/crawl:${COLUMNISTOS_VERSION}
  restart: unless-stopped
  depends_on: [db]
  env_file: /root/columnistos.env
  entrypoint: ["sleep", "infinity"]
  labels:
    ofelia.enabled: "true"
    ofelia.job-exec.crawl.schedule: "0 55 13-23,0-5 * * *"
    ofelia.job-exec.crawl.command: "node run.mjs"

post:
  image: ghcr.io/${GH_OWNER}/columnistosjs/post:${COLUMNISTOS_VERSION}
  restart: unless-stopped
  depends_on: [db]
  env_file: /root/columnistos.env
  entrypoint: ["sleep", "infinity"]
  labels:
    ofelia.enabled: "true"
    ofelia.job-exec.post.schedule: "0 0 16-23 * * *"
    ofelia.job-exec.post.command: "node run.mjs"

send-dms:
  image: ghcr.io/${GH_OWNER}/columnistosjs/send-dms:${COLUMNISTOS_VERSION}
  restart: unless-stopped
  depends_on: [db]
  env_file: /root/columnistos.env
  entrypoint: ["sleep", "infinity"]
  labels:
    ofelia.enabled: "true"
    ofelia.job-exec.send-dms.schedule: "0 20,30,40 13-23,0-5 * * *"
    ofelia.job-exec.send-dms.command: "node run.mjs"
```

**6. Archivos de configuración en el droplet**

Agregar a `/root/.env` (usado por `docker compose` para sustituir `${GH_OWNER}` y `${COLUMNISTOS_VERSION}`):

```
GH_OWNER=<github-username>
COLUMNISTOS_VERSION=latest
```

Crear `/root/columnistos.env` (leído por los containers del bot) con permisos restringidos:

```bash
sudo tee /root/columnistos.env > /dev/null <<EOF
WAFRN_EMAIL=...
WAFRN_PASSWORD=...
DB_HOST=db
DB_PORT=3306
DB_USER=columnistos
DB_PWD=...
CRAWLER_DIR=/app
ADMIN_HANDLES=...
AI_WORKER_URL=...
EOF
sudo chmod 600 /root/columnistos.env
```

**7. Primer deploy**

```bash
cd /root
docker compose pull crawl post send-dms ofelia
docker compose up -d
docker compose logs ofelia          # verificar que los 3 jobs están registrados
docker compose exec crawl node run.mjs   # smoke test manual
```

### Operación diaria

```bash
# Ver logs en tiempo real
ssh deploy@<droplet> "cd /root && docker compose logs -f ofelia crawl post send-dms"

# Trigger manual de un job
ssh deploy@<droplet> "cd /root && docker compose exec crawl node run.mjs"

# Ver qué versión está corriendo
ssh deploy@<droplet> "cd /root && docker compose images crawl post send-dms"
```

### Generar un nuevo tag

El workflow de build and deploy automáticamente crea un nuevo tag cuando hay cambios nuevos, incrementando en 1 el patch number. Si se desea cambiar el número minor o major, se puede correr

```bash
git tag 1.1.0
git push origin --tags
```
