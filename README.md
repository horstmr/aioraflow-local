# AioraFlow — aplicativo local (desktop)

Versão local, funcional e offline-first do fluxo **“da conversa ao prontuário”**:
grava o áudio da consulta, transcreve **localmente** (faster-whisper) e gera o
**prontuário estruturado** com a API da Anthropic (Claude). Empacotado como app
desktop com [pywebview](https://pywebview.flowlib.org/), com backend próprio em
Flask + SQLite. **Sem tela de login** — abre direto no aplicativo.

> Implementação original, inspirada na proposta do AioraFlow, mantendo a mesma
> identidade visual (tema escuro, verde `#39E58C`, fonte Geist). Não é uma cópia
> do backend do produto original (ao qual não há acesso).

## Baixar (pronto para usar)

Veja a [página de releases](https://github.com/horstmr/aioraflow-local/releases/latest):

- **Windows:** `AioraFlow-portatil.zip` — extraia e rode `AioraFlow.exe`.
- **macOS:** `AioraFlow-macOS.zip` — extraia e abra `AioraFlow.app`.

Na **primeira execução**, o app pede sua **chave da API da Anthropic** (usada só
para gerar o prontuário; gravar e transcrever funciona sem ela).

### Avisos de segurança do sistema (app não assinado)

O app não é assinado digitalmente, então o sistema exibe um aviso na 1ª vez:

- **Windows (SmartScreen):** "Mais informações" › "Executar assim mesmo".
- **macOS (Gatekeeper):** clique com o **botão direito** no `AioraFlow.app` ›
  **Abrir** › **Abrir**. Se ainda assim não abrir (Apple Silicon costuma ser mais
  restrito), rode uma vez no Terminal:
  `xattr -cr /caminho/para/AioraFlow.app` e abra novamente.

## Rodar pelo código-fonte

```bash
pip install -r requirements.txt
python main.py
```

Na primeira execução, o app pede a **chave da API da Anthropic** (ou defina a
variável de ambiente `ANTHROPIC_API_KEY`). A chave é usada apenas para gerar o
prontuário.

## Fluxo de uso

1. **Nova consulta** → informe o nome do paciente.
2. **Gravar** o áudio da consulta (botão do microfone). Ao parar, o áudio é
   transcrito localmente — nenhum áudio sai da máquina.
3. Revise a transcrição (editável) e clique em **Gerar prontuário**.
4. O prontuário sai estruturado (queixa, história, antecedentes, exame,
   hipóteses, conduta, observações), **editável**. Salve, copie ou exporte (PDF).

## Privacidade dos dados

- **Áudio e transcrição:** processados **100% localmente** (Whisper na CPU). O
  áudio não é enviado para lugar nenhum.
- **Geração do prontuário:** a **transcrição em texto** é enviada à API da
  Anthropic (Claude) para produzir o prontuário. Se você precisa que nada saia
  da máquina, é possível trocar essa etapa por um modelo local — veja abaixo.
- Pacientes/consultas ficam num **SQLite local** em `data/aioraflow.db`.
- A chave da API fica em `config.json` (ignorado pelo Git).

## Configurações

- **Modelo (Claude):** `claude-opus-4-8` (padrão), `claude-sonnet-5` ou
  `claude-haiku-4-5`.
- **Modelo de transcrição (Whisper):** `tiny` … `large-v3`. Maior = mais preciso
  e mais lento. O modelo é baixado do Hugging Face na primeira transcrição.

## Estrutura

```
aioraflow-local/
├── main.py                 # janela pywebview + app Flask
├── requirements.txt
├── config.example.json     # modelo de configuração
├── app/
│   ├── server.py           # Flask: frontend + API (/api/...)
│   ├── db.py               # SQLite (consultas)
│   ├── transcribe.py       # transcrição local (faster-whisper)
│   ├── prontuario.py       # geração via API da Anthropic (Claude)
│   └── config.py           # config.json / ANTHROPIC_API_KEY
├── web/                    # frontend (HTML/CSS/JS) — estilo AioraFlow
│   └── _next/static/       # fonte Geist (.woff2) reaproveitada do site
├── data/                   # banco SQLite (criado em runtime)
└── _raw/                   # snapshot original da página de login (referência)
```

## Observações técnicas

- No Windows, o pywebview usa o runtime **WebView2** (Edge), já presente no
  Windows 10/11. A gravação usa `getUserMedia` (o WebView2 pode pedir permissão
  de microfone na primeira vez).
- Testado com **Python 3.14**.
- A transcrição usa `faster-whisper` (CTranslate2) na CPU com `int8`; o binário
  do `ffmpeg` vem do pacote `imageio-ffmpeg` (nada a instalar à parte).

### Rodar 100% offline (opcional)

Para não enviar a transcrição à nuvem, troque a etapa de geração por um modelo
local (ex.: via [Ollama](https://ollama.com)) editando
[`app/prontuario.py`](app/prontuario.py). A transcrição já é local.
