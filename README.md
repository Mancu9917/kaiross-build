# kaiross-build

Pipeline di build e rilascio di Kaiross. Il codice non è qui: ogni run lo scarica da un repository privato con una
chiave di sola lettura, e i passi non pubblicano il loro output. In caso di errore il log è allegato al run cifrato
(`logs-cert.pem`) e si apre solo con la chiave privata corrispondente.

Workflow: `build.yml` (app: CI, immagini, deploy su uat.kaiross.ch e app.kaiross.ch), `landing.yml` (sito kaiross.ch),
`backoffice.yml` (app amministrativa separata), `watch.yml` (ogni 5 minuti avvia le pipeline dei commit nuovi).

Il backoffice segue soltanto i rami `uat` e `main` del repository privato Kaiross, con la chiave di lettura esistente
`KAIROSS_READ_KEY`. Se `backoffice/package.json` non esiste, il run lo segnala nel riepilogo e salta controlli, build e
deploy. Un nuovo commit contenente il manifest attiva automaticamente la pipeline; non occorre modificare il watcher.
La pipeline dell'app esistente resta indipendente.

Il futuro workspace npm `./backoffice` deve essere registrato nel `package.json` e lockfile della radice e offrire
gli script `typecheck`, `test` (non interattivo con `--watch=false`) e `build`. I controlli usano `KAIROSS_ENV=.env.ci`
con valori fittizi locali e `scripts/env-backoffice.ts` prima dei controlli; l'immagine viene costruita invece con
i valori pubblici Supabase reali dell'ambiente,
`API_URL=/api` e `KAIROSS_VERSION`. Il Dockerfile è `deploy/backoffice/Dockerfile` nel repository privato.

L'immagine dedicata è `ghcr.io/mancu9917/kaiross-backoffice`: `uat-<sha7>` (e `uat`) per UAT,
`sha-<sha7>` (e `main`) per produzione. I domini sono `backoffice-uat.kaiross.ch` e `backoffice.kaiross.ch`.
Il deploy richiede il servizio BO già installato sul server e il nuovo segreto `BACKOFFICE_DEPLOY_SSH_KEY`,
con chiave autorizzata esclusivamente al comando forzato `/srv/kaiross/deploy/remote-deploy-backoffice.sh`.
Riutilizza `DEPLOY_HOST`, `DEPLOY_KNOWN_HOSTS` e gli environment `uat`/`production`; passa il tag come comando SSH
e il token GHCR su stdin. Non usare la chiave di deploy dell'app, che ha un comando forzato diverso.
Installazione iniziale, DNS e autorizzazioni del nuovo pacchetto GHCR vanno predisposti prima del primo rilascio.

Il watcher non rilancia uno stesso commit già esaminato, anche se assente o fallito: per riprovare lo stesso SHA,
avviare manualmente `backoffice.yml` scegliendo `ref` e `sha`. I rilasci BO e app dello stesso ambiente condividono
la coda di deploy; anche lo script sul server usa il lock comune e ripristina l'immagine precedente in caso di errore.
