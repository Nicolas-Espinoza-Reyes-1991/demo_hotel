# Nginx — landing + reservas

La **landing** es HTML estático. Docker solo sirve **reservas** en el puerto 3000.
Sin Nginx en el puerto 80, la landing **no abre por IP**.

## Probar por IP (ahora)

En el VPS:

```bash
cd /var/www/demo_hotel
git pull origin main
cd hotel-reservas
sh scripts/restart-production.sh
```

El script reconstruye Docker, configura nginx y expone **reservas en el puerto 80** (no hace falta abrir el 3000).

Abrí en el navegador:

- **Landing:** `http://TU_IP/`  
- **Reservas:** `http://TU_IP/reservas`  
- **Admin:** `http://TU_IP/reservas/login`

Instalación manual de nginx (solo la primera vez):

```bash
sudo apt update
sudo apt install -y nginx

sudo cp /var/www/demo_hotel/deploy/nginx/landing-ip.conf /etc/nginx/sites-available/hotel-landing
sudo ln -sf /etc/nginx/sites-available/hotel-landing /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx
sudo ufw allow 80
```

## Cuando configures DNS

```bash
sudo cp /var/www/demo_hotel/deploy/nginx/reservas.conf /etc/nginx/sites-available/reservas
sudo ln -sf /etc/nginx/sites-available/reservas /etc/nginx/sites-enabled/
sudo certbot --nginx -d hotel.adkiniq.cl -d reservas.adkiniq.cl
sudo systemctl reload nginx
```
