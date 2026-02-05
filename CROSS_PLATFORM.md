# Compatibilidade Cross-Platform - Pro Download Manager

Este documento detalha as alterações realizadas para garantir que a ferramenta funcione corretamente em Windows (10/11) e Linux (Ubuntu 20.04+, CentOS 8+).

## 1. Gerenciamento de Binários (`BinaryManager`)

Foi implementado o serviço `binary-manager.ts` para centralizar a localização e execução do `yt-dlp` e `ffmpeg`:
- **Extensões Automáticas**: Adiciona `.exe` automaticamente em ambientes Windows.
- **Resolução de Caminhos**: 
    1. Verifica se o binário está empacotado com o app (`bin/`).
    2. Verifica se o binário está disponível no `PATH` do sistema usando `where` (Windows) ou `which` (Linux/macOS).
- **Permissões**: Garante permissões de execução (`chmod 755`) para binários empacotados em sistemas Linux/macOS.

## 2. Manipulação de Caminhos (Filesystem)

- **Normalização**: Implementado `path.normalize()` e `path.join()` em todas as operações de download e logs para garantir separadores de caminho corretos (`\` no Windows, `/` no Linux).
- **Diretório de Downloads Dinâmico**: Removido o caminho hardcoded `/Users/jeff/Downloads`. O app agora utiliza `app.getPath('downloads')` do Electron para identificar a pasta de downloads do usuário em qualquer sistema operacional.
- **Sanitização**: Filtros de nomes de arquivos aprimorados para remover caracteres ilegais específicos do Windows (`<>:"/\|?*`).

## 3. Funcionalidades de Sistema Operacional

- **Seleção de Navegador (Cookies)**: A opção de extrair cookies do Safari foi restrita apenas ao macOS, evitando erros em Windows/Linux onde o navegador não existe.
- **Comandos de Terminal**: Substituídos comandos específicos de shell por APIs nativas do Node.js ou Electron (`shell.openPath` em vez de `open`/`start`).
- **Encerramento de App**: Lógica de fechamento de janelas ajustada para seguir as convenções de cada plataforma (quitar no Windows/Linux ao fechar todas as janelas, manter no macOS).

## 4. Validação e Testes

- **Script de Validação**: Criado o script `scripts/validate-platform.js` (executável via `npm run validate-platform`) que verifica:
    - Disponibilidade dos binários no sistema.
    - Correção dos separadores de caminho.
    - Informações da plataforma atual.

## 5. Como Validar em Novos Ambientes

Para validar a ferramenta em uma nova máquina Windows ou Linux:
1. Clone o repositório.
2. Execute `npm install`.
3. Execute `npm run validate-platform`.
4. Verifique se os binários `yt-dlp` e `ffmpeg` foram detectados ou se precisam ser instalados manualmente.
