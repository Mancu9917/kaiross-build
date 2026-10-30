# kaiross-build

Pipeline di build e rilascio di Kaiross. Il codice non è qui: ogni run lo scarica da un repository privato con una
chiave di sola lettura, e i passi non pubblicano il loro output. In caso di errore il log è allegato al run cifrato
(`logs-cert.pem`) e si apre solo con la chiave privata corrispondente.

Workflow: `build.yml` (app: CI, immagini, deploy su uat.kaiross.ch e app.kaiross.ch), `landing.yml` (sito kaiross.ch),
`watch.yml` (ogni 5 minuti avvia la build dei commit nuovi di entrambi).
