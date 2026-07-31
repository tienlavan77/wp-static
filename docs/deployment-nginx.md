# Deploy WPSC Static Output With Nginx

## Build On The VPS

```bash
cd /home/data/sites/wp-static
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
npm run build:example
```

## Nginx Root

The virtual host should point to the generated `dist` directory:

```nginx
root /home/data/sites/wp-static/fixtures/basic-shop/dist;
index index.html;

location / {
    try_files $uri $uri.html $uri/ =404;
}
```

## Validate And Reload

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Local Hosts Entry

On the browser machine:

```text
192.168.1.181 tinsinhphat.local
```
