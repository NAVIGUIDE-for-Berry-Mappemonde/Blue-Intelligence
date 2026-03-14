# Déploiement Blue Intelligence sur VPS OVH

Guide pas à pas pour déployer Blue Intelligence sur un VPS OVH avec Nginx, PM2, SSL Let's Encrypt et domaine.

---

## Prérequis

- VPS OVH (Starter ou supérieur)
- Domaine acheté (OVH ou ailleurs)
- Clés API : `TINYFISH_API_KEY`, `CLAUDE_API_KEY` (ou `ANTHROPIC_API_KEY`)

---

## Partie 1 : Configuration du VPS OVH

### 1.1 Accéder au VPS

1. Connectez-vous au [Manager OVHcloud](https://www.ovh.com/manager/)
2. **Bare Metal Cloud** → **VPS**
3. Sélectionnez votre VPS
4. Notez l’**adresse IP publique** (ex. `51.xxx.xxx.xxx`)

### 1.2 Connexion SSH

**Première connexion** (utilisateur `ubuntu` ou `root` selon l’OS) :

```bash
ssh ubuntu@VOTRE_IP_VPS
```

Ou si vous avez configuré root :

```bash
ssh root@VOTRE_IP_VPS
```

À la première connexion, acceptez l’empreinte avec `yes`.

### 1.3 Mise à jour du système

```bash
sudo apt update && sudo apt upgrade -y
```

---

## Partie 2 : Installation Node.js, PM2, Nginx

### 2.1 Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # doit afficher v20.x
```

### 2.2 PM2 (gestionnaire de processus)

```bash
sudo npm install -g pm2
```

### 2.3 Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

---

## Partie 3 : Domaine et DNS (OVH)

### 3.1 Zone DNS du domaine

1. Manager OVH → **Web Cloud** → **Noms de domaine**
2. Cliquez sur votre domaine (ex. `mondomaine.fr`)
3. Onglet **Zone DNS**
4. Cliquez **Ajouter une entrée**

### 3.2 Enregistrement A (sous-domaine ou racine)

Pour `blue.mondomaine.fr` ou `mondomaine.fr` :

| Champ | Valeur |
|-------|--------|
| **Type** | A |
| **Sous-domaine** | `blue` (ou vide pour la racine) |
| **Cible** | `VOTRE_IP_VPS` |
| **TTL** | 300 (ou défaut) |

5. Validez. La propagation DNS peut prendre 5 min à 24 h.

### 3.3 Vérifier la propagation

```bash
dig blue.mondomaine.fr +short
# doit afficher l’IP du VPS
```

---

## Partie 4 : Déploiement de l’application

### 4.1 Créer un utilisateur dédié (recommandé)

```bash
sudo adduser blueintel --disabled-password
sudo usermod -aG sudo blueintel
```

### 4.2 Cloner le projet (ou transférer les fichiers)

**Option A – Git :**

```bash
sudo su - blueintel
cd ~
git clone https://github.com/NAVIGUIDE-for-Berry-Mappemonde/Blue-Intelligence.git
cd Blue-Intelligence
```

**Option B – SCP depuis votre Mac :**

```bash
# Depuis votre Mac
scp -r /Users/clement/Blue\ Intelligence/Blue-Intelligence blueintel@VOTRE_IP_VPS:~/
```

### 4.3 Installer les dépendances et builder

```bash
cd ~/Blue-Intelligence
npm install
npm run build
```

### 4.4 Fichier .env

```bash
nano .env
```

Contenu minimal :

```
NODE_ENV=production
TINYFISH_API_KEY=votre_clé_tinyfish
CLAUDE_API_KEY=votre_clé_claude
# ou ANTHROPIC_API_KEY=votre_clé
```

Sauvegardez avec `Ctrl+O`, `Entrée`, puis `Ctrl+X`.

### 4.5 Script de démarrage production

Le dépôt GitHub peut ne pas inclure le script `start`. Si `pm2 start npm -- start` échoue avec "Missing script: start", ajoutez-le :

```bash
nano package.json
```

Dans la section `"scripts"`, ajoutez en première ligne :

```json
"start": "NODE_ENV=production tsx server.ts",
```

(Juste avant `"dev": "tsx server.ts",`)

### 4.6 Lancer avec PM2

```bash
cd ~/Blue-Intelligence
pm2 start npm --name "blue-intelligence" -- start
pm2 save
pm2 startup
# exécutez la commande affichée (sudo env PATH=...)
```

Vérification :

```bash
pm2 status
pm2 logs blue-intelligence
```

L’app écoute sur le port 3000.

---

## Partie 5 : Nginx (reverse proxy)

### 5.1 Configuration Nginx

```bash
sudo nano /etc/nginx/sites-available/blue-intelligence
```

Contenu (remplacez `blue.mondomaine.fr` par votre domaine) :

```nginx
server {
    listen 80;
    server_name blue.mondomaine.fr;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

### 5.2 Activer le site

```bash
sudo ln -s /etc/nginx/sites-available/blue-intelligence /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Test : `http://blue.mondomaine.fr` (sans HTTPS pour l’instant).

---

## Partie 6 : SSL avec Let's Encrypt (Certbot)

### 6.1 Installer Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Obtenir le certificat

```bash
sudo certbot --nginx -d blue.mondomaine.fr
```

Répondez aux questions (email, conditions, redirection HTTP→HTTPS).

### 6.3 Renouvellement automatique

```bash
sudo certbot renew --dry-run
```

Le cron de Certbot gère le renouvellement.

---

## Partie 7 : Vérifications finales

### 7.1 Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 7.2 Test complet

1. Ouvrir `https://blue.mondomaine.fr`
2. Vérifier que l’interface charge
3. Tester un déploiement swarm (mode Test)

---

## Mise à jour de l’application

```bash
cd ~/Blue-Intelligence
git pull
npm install
npm run build
pm2 restart blue-intelligence
```

---

## Dépannage

| Problème | Piste de solution |
|----------|-------------------|
| **Missing script: "start"** | Le dépôt GitHub n'a peut‑être pas le script. Voir [4.5](#45-script-de-démarrage-production) : ajoutez `"start": "NODE_ENV=production tsx server.ts",` dans `package.json`, puis `pm2 delete blue-intelligence` et relancez. |
| 502 Bad Gateway | `pm2 status` et `pm2 logs` pour vérifier que l’app tourne |
| Page blanche | Vérifier `npm run build` et que `dist/` existe |
| Erreur API | Vérifier `.env` et les clés |
| DNS ne résout pas | Attendre la propagation ou vérifier la zone DNS |
| SSL échoue | Vérifier que le domaine pointe bien vers le VPS avant de lancer Certbot |

---

## Références OVH

- [Connexion SSH aux serveurs OVHcloud](https://help.ovhcloud.com/csm/fr-ca-dedicated-servers-creating-ssh-keys)
- [Éditer une zone DNS OVHcloud](https://help.ovhcloud.com/csm/fr-ca-dns-edit-dns-zone)
- [Installer un certificat SSL sur un VPS](https://help.ovhcloud.com/csm/en-vps-install-ssl-certificate)
