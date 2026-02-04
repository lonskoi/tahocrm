# Деплой на Beget VPS (Ubuntu 24.04) — через GHCR + Docker Compose

Цель: **сервер не собирает проект**, только подтягивает готовый Docker-образ и запускает его вместе с Postgres.

## 0) Что нужно заранее

- Локально у вас уже есть SSH-ключ (ed25519).
- Нужен GitHub-репозиторий (лучше **private**) и GHCR-образ.
- На VPS пока работаем **по IP**. Домен/HTTPS добавим позже.

## 1) Первичный hardening (на VPS)

Зайдите на сервер (через SSH/консоль провайдера) и выполните:

### 1.1 Сменить root пароль

```bash
passwd
```

### 1.2 Создать пользователя `deploy` и добавить SSH-ключ

```bash
adduser deploy
usermod -aG sudo deploy

mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
cat >> /home/deploy/.ssh/authorized_keys <<'EOF'
PASTE_YOUR_PUBLIC_KEY_HERE
EOF
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

### 1.3 Запретить парольный SSH и root login

Откройте файл:

```bash
nano /etc/ssh/sshd_config
```

Проверьте/установите:

```text
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
```

Перезапустите SSH:

```bash
systemctl restart ssh
```

### 1.4 Фаервол

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
ufw status
```

### 1.5 Swap (критично для 2GB RAM)

```bash
fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

## 2) Установка Docker + compose-plugin (на VPS)

```bash
apt-get update
apt-get install -y ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker
usermod -aG docker deploy
```

Перезайдите по SSH под `deploy`, чтобы группа docker применилась.

## 3) Ротация docker-логов (важно при 30GB диска)

```bash
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  }
}
EOF
systemctl restart docker
```

## 4) Подготовка каталога приложения (на VPS)

Под `deploy`:

```bash
sudo mkdir -p /opt/tahocrm
sudo chown -R deploy:deploy /opt/tahocrm
cd /opt/tahocrm
```

Скопируйте в `/opt/tahocrm` два файла:

- `docker-compose.prod.yml`
- `.env` (создать из `.env.production.example` и заменить значения)

## 5) Логин в GHCR и запуск

Если репозиторий/пакет **private**, создайте GitHub PAT с `read:packages` и выполните:

```bash
docker login ghcr.io
```

Далее:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

## 6) Инициализация БД и Prisma schema (на VPS)

Инициализацию Prisma делаем через **migrator**-контейнер (это отдельный образ с Prisma CLI).

1. Убедитесь, что Postgres поднялся:

```bash
docker compose -f docker-compose.prod.yml logs -n 200 db
```

2. Прогон Prisma schema в master DB:

```bash
docker compose -f docker-compose.prod.yml run --rm --profile migrate \
  -e DATABASE_URL="$DATABASE_URL_MASTER" migrator
```

3. Прогон Prisma schema в tenant DB (tenant-1):

```bash
docker compose -f docker-compose.prod.yml run --rm --profile migrate \
  -e DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@db:5432/tahocrm_tenant_tenant-1" migrator
```

4. Создать TENANT_ADMIN:

```bash
docker compose -f docker-compose.prod.yml run --rm --profile migrate \
  -e TENANT_ID="tenant-1" \
  -e TENANT_NAME="Мастерская tenant-1" \
  -e ADMIN_EMAIL="admin@tahoerp.ru" \
  -e ADMIN_PASSWORD="CHANGE_ME" \
  -e ADMIN_NAME="Администратор" \
  migrator npm run create-tenant-admin
```

## 7) Проверка

- `http://46.173.19.235/api/health`
- `http://46.173.19.235/crm/tenant-1/login`

## Обновление (после нового пуша в GHCR)

```bash
cd /opt/tahocrm
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker image prune -f
```
