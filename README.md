# Live automática • Lula × Flávio

Tela vertical 1080 × 1920 para uma enquete informal por presentes no TikTok de **@jorgedrummerhead**. Ilustração dos dois participantes se encarando, histórico dos últimos quatro presentes, totais, porcentagens e resultado a cada rodada.

## Executar

Requer Node.js 20 ou superior (validado com Node.js 24).

```sh
npm ci --ignore-scripts
npm start
```

O servidor usa a porta 3000, apenas na máquina local. Abra o endereço local do servidor no navegador para acessar o painel. O caminho `/overlay` contém somente o placar, sem controles. No OBS da **mesma máquina**, use esse endereço com o caminho `/overlay` em uma fonte de navegador de 1080 × 1920. Um OBS no seu computador não alcança o endereço local de uma máquina na nuvem: execute este projeto no computador do OBS, ou providencie separadamente acesso seguro ao servidor. Este aplicativo não inicia a transmissão do TikTok.

## Primeiro teste

1. O aplicativo inicia em **simulação**, sem conexão ou pontuação real.
2. Clique em **Iniciar rodadas** e envie rosas pelos botões do painel.
3. Cada unidade vale um ponto. 30 rosas para Lula e 20 rosas brancas para Flávio resultam em 60% × 40%.
4. Ao terminar o tempo, o vencedor aparece por cinco segundos; o placar zera e começa a próxima rodada. Empates e rodadas sem presentes têm mensagens próprias.

## Conectar à live real

1. Inicie a live na conta `jorgedrummerhead` pelo TikTok/LIVE Studio/OBS autorizado na conta.
2. Pare a simulação. Em **Conta e presentes**, consulte o catálogo. Identifique os presentes **Rosa** e **Rosa branca** disponíveis nessa conta/região. Os nomes e IDs podem variar; não há IDs presumidos no código. Não use dois IDs iguais nem substitua um presente inexistente sem conferir.
3. Salve o ID da rosa em Lula e o ID da rosa branca em Flávio. A duração padrão é 300 segundos e pode ser alterada antes de iniciar.
4. Clique em **Conectar TikTok**. Somente após confirmar a conexão, clique em **Iniciar rodadas**. Verifique os dois tipos de presente com uma participação real antes de usar o placar publicamente.

O conector `tiktok-live-connector` é uma integração comunitária, não uma API oficial do TikTok. Depende do acesso público à live e do serviço de assinatura Euler Stream; mudanças do TikTok, restrições de rede ou exigência de chave do serviço podem impedir a conexão. Nenhuma senha, cookie de sessão ou login do TikTok é solicitado. Se o serviço exigir uma chave, configure `EULER_API_KEY` de forma segura no processo, sem incluí-la no código. O projeto não foi validado com presentes reais nesta configuração.

Em redes com proxy, `HTTPS_PROXY`/`HTTP_PROXY` são usados pelo conector HTTP/WebSocket. Destinos necessários incluem subdomínios de `tiktok.com`, `tiktokv.com`, `tiktokcdn.com` e `api.eulerstream.com`. O acesso observado nesta nuvem retornou HTTP 403 no proxy para TikTok e Euler Stream. Essa falha não prova que a conta esteja offline.

## Regras de contagem

- Rosa → Lula; rosa branca → Flávio. Outros presentes e comentários não pontuam.
- Cada unidade vale um ponto, independentemente do custo do presente em moedas.
- Combos são contados ao terminar, usando sua quantidade final. Eventos intermediários não são somados novamente; IDs de mensagens/combos repetidos são descartados.
- Presentes recebidos durante os cinco segundos do resultado ou com a rodada parada não pontuam. Um combo iniciado antes da virada pontua na rodada em que sua conclusão for recebida, se houver votação aberta.
- Falhas de conexão interrompem a rodada. Reconecte e inicie uma nova rodada; não há recuperação de presentes perdidos durante uma desconexão.
- A barra começa visualmente em 50% × 50%, com a indicação de que ainda não houve presentes.
- Configuração de conta, duração e IDs fica em `.local/settings.json`. O placar fica na memória: reiniciar o servidor limpa as rodadas. Nenhuma rodada ou conexão é retomada automaticamente após reiniciar.

## Validação

```sh
npm test
```

Os testes exercitam porcentagens, vencedor, empate, rodada vazia, reinício, combos e deduplicação. Painel e overlay também foram verificados em Chromium, incluindo o ciclo completo de uma rodada simulada. A integração real continua pendente de liberação da rede, confirmação do catálogo e live ativa.

`public/hero.png` é uma ilustração gerada por IA. Fontes Inter e Barlow Condensed são distribuídas localmente; licenças em `public/FONT-LICENSE-*.txt`. Não há dependência de fontes ou imagens externas ao abrir a tela.
