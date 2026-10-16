# Live automática • Lula × Flávio

Tela vertical 1080 × 1920 para uma enquete informal por presentes no TikTok de **@jorgedrummerhead**. Ilustração dos dois participantes se encarando, fila com duas participações por vez, foto e @ dos doadores, totais, porcentagens, música de videogame e resultado a cada rodada.

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
3. Salve o ID da rosa em Lula, o ID da rosa branca em Flávio e o ID da **Galáxia** no bônus de tempo. Todos devem ser diferentes e confirmados no catálogo. Sem o ID de Galáxia configurado, esse presente não acrescenta tempo na live real. A duração padrão é 300 segundos e pode ser alterada antes de iniciar.
4. Clique em **Conectar TikTok**. Somente após confirmar a conexão, clique em **Iniciar rodadas**. Verifique os dois tipos de presente com uma participação real antes de usar o placar publicamente.

O conector `tiktok-live-connector` é uma integração comunitária, não uma API oficial do TikTok. Depende do acesso público à live e do serviço de assinatura Euler Stream; mudanças do TikTok, restrições de rede ou exigência de chave do serviço podem impedir a conexão. Nenhuma senha, cookie de sessão ou login do TikTok é solicitado. Se o serviço exigir uma chave, configure `EULER_API_KEY` de forma segura no processo, sem incluí-la no código. O projeto não foi validado com presentes reais nesta configuração.

Em redes com proxy, `HTTPS_PROXY`/`HTTP_PROXY` são usados pelo conector HTTP/WebSocket. Destinos necessários incluem subdomínios de `tiktok.com`, `tiktokv.com`, `tiktokcdn.com` e `api.eulerstream.com`. O acesso observado nesta nuvem retornou HTTP 403 no proxy para TikTok e Euler Stream. Essa falha não prova que a conta esteja offline.

## Regras de contagem

- Rosa → Lula; rosa branca → Flávio. **Galáxia acrescenta cinco minutos por unidade**, sem alterar votos ou porcentagens. Outros presentes e comentários não pontuam.
- Cada unidade vale um ponto, independentemente do custo do presente em moedas.
- Combos são contados ao terminar, usando sua quantidade final. Eventos intermediários não são somados novamente; IDs de mensagens/combos repetidos são descartados.
- Presentes recebidos durante os cinco segundos do resultado ou com a rodada parada não pontuam. Um combo iniciado antes da virada pontua na rodada em que sua conclusão for recebida, se houver votação aberta.
- Falhas de conexão interrompem a rodada. Reconecte e inicie uma nova rodada; não há recuperação de presentes perdidos durante uma desconexão.
- A barra começa visualmente em 50% × 50%, com a indicação de que ainda não houve presentes.
- O bônus de Galáxia é somado imediatamente ao prazo da rodada: duas Galáxias acrescentam dez minutos. O valor padrão de 300 segundos pode ser ajustado em **Conta e presentes** antes de iniciar. Galáxias recebidas na espera ou durante o resultado não prolongam a rodada encerrada.
- Configuração de conta, duração e IDs fica em `.local/settings.json`. O placar fica na memória: reiniciar o servidor limpa as rodadas. Nenhuma rodada ou conexão é retomada automaticamente após reiniciar.

## Sons e animações

Cada rosa ou rosa branca aceita dispara um blip curto, um crescimento rápido no retrato de quem recebeu e um indicador `+quantidade`. O líder aumenta suavemente conforme a diferença de porcentagem (até 14%); o outro fica em preto e branco. No empate ou ao zerar a rodada, ambos voltam ao tamanho normal e às cores. A preferência do sistema de reduzir movimentos é respeitada.

Em **Sons e efeitos**, clique em **Ativar e testar som** para liberar o áudio do navegador. Música e efeitos têm controles independentes de volume e liga/desliga, que também se aplicam ao overlay. O aplicativo usa sons sintetizados localmente: blip por presente, aviso em cada um dos três segundos finais, som de início de rodada e vinheta de resultado. Combos continuam disparando um blip apenas na conclusão; eventos duplicados e atualizações periódicas do placar não repetem o som. Rajadas muito intensas são agrupadas para não acumular uma fila longa de áudio.

A trilha de fundo é uma composição original em estilo **chiptune/8-bit**, sintetizada localmente e repetida enquanto as rodadas estão ativas (incluindo o resultado). Ela para ao interromper a votação. Silenciar a música não silencia os efeitos, e vice-versa. A Galáxia tem um aviso sonoro e um indicador visual de tempo extra próprios. Nenhuma gravação de jogo ou arquivo externo de música é usado.

No OBS, ative a captura/controle de áudio da **fonte de navegador** e confira o mixer. Caso apareça **Ativar som** no overlay, use a opção **Interagir** da fonte para clicar no botão. O áudio liberado no painel não libera automaticamente outro navegador ou a fonte do OBS. Desmarque **Ouvir neste navegador** no painel para evitar duplicar o áudio durante a transmissão; esse controle é local e não silencia o OBS. Volume e liga/desliga da transmissão são preservados em `.local/settings.json`.

## Fila de participantes e fotos

São exibidas **no máximo duas participações ao mesmo tempo**, com quatro segundos para cada uma. As próximas aguardam em ordem de chegada, mesmo que isso crie atraso. A fila permanece visível no resultado e continua na próxima rodada; cada cartão informa a rodada original. Votos, bônus de tempo e efeitos de doação são processados ao receber o presente, sem aguardar a apresentação do cartão.

A foto vem do avatar fornecido pelo TikTok; o @ vem do perfil do doador. Se a foto estiver ausente, bloqueada ou falhar ao carregar, o cartão mostra a inicial. URLs de avatar devem ser HTTPS. Na simulação, use nomes diferentes e, opcionalmente, uma URL HTTPS em **Foto para teste**. Envie seis participações rapidamente: devem aparecer em pares, sem substituir as duas atuais antes dos quatro segundos.

A fila fica na memória e sobrevive às rodadas, mas não a uma reinicialização do servidor. Trocar entre simulação e live limpa a fila para não misturar participações de teste com doações reais.

## Validação

```sh
npm test
```

Os testes exercitam porcentagens, vencedor, empate, rodada vazia, reinício, combos, deduplicação, fila de duas participações, fotos, bônus de Galáxia e transições dos efeitos. Painel e overlay também foram verificados em Chromium, incluindo o ciclo completo de uma rodada simulada, sinal no grafo de áudio, zoom, troca de liderança, volumes independentes, música e mute. A integração real continua pendente de liberação da rede, confirmação do catálogo e live ativa.

`public/hero.png` é uma ilustração gerada por IA. Fontes Inter e Barlow Condensed são distribuídas localmente; licenças em `public/FONT-LICENSE-*.txt`. A ilustração, as fontes e o áudio são locais; apenas os avatares dos doadores são carregados de URLs externas fornecidas pelo TikTok.
