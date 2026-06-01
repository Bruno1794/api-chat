# Guia de Integracao Frontend

Este documento descreve como implementar o frontend Next.js para a API de chat.

Base URL local:

```txt
https://apichat.sytes.net
```

Socket.IO URL:

```txt
https://apichat.sytes.net
```

## Autenticacao

### Login do atendente

```http
POST /auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "admin@admin.com",
  "senha": "123456"
}
```

Response:

```json
{
  "user": {
    "id": 1,
    "nome": "Administrador",
    "email": "admin@admin.com",
    "role": "ADMIN",
    "online": true,
    "ultimo_acesso": "2026-05-30T10:00:00.000Z"
  },
  "accessToken": "jwt",
  "refreshToken": "jwt"
}
```

Salve:

```txt
accessToken
refreshToken
user
```

Use em rotas protegidas:

```http
Authorization: Bearer ACCESS_TOKEN
```

### Usuario logado

```http
GET /auth/me
Authorization: Bearer ACCESS_TOKEN
```

### Refresh token

```http
POST /auth/refresh
Content-Type: application/json
```

```json
{
  "refreshToken": "REFRESH_TOKEN"
}
```

### Logout

```http
POST /auth/logout
Authorization: Bearer ACCESS_TOKEN
```

## Tipos TypeScript

```ts
export type UserRole = 'ADMIN' | 'ATENDENTE';

export type ConversationStatus =
  | 'ABERTA'
  | 'AGUARDANDO_CLIENTE'
  | 'FINALIZADA'
  | 'ARQUIVADA';

export type SenderType = 'CLIENTE' | 'ATENDENTE' | 'SISTEMA';

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO';

export interface User {
  id: number;
  nome: string;
  email: string;
  role: UserRole;
  online: boolean;
  ultimo_acesso: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: number | string;
  nome: string | null;
  referencia: string | null;
  usuario_referencia: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  status: string | null;
  name?: string;
  phone?: string;
}

export interface Conversation {
  id: number;
  cliente_id_externo: string;
  atendente_id: number | null;
  status: ConversationStatus;
  ultima_mensagem: string | null;
  ultima_interacao: string;
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  atendente?: User | null;
  unread_count?: number;
  historico?: Conversation[];
  notes?: Note[];
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_type: SenderType;
  sender_id: string | null;
  message: string | null;
  message_type: MessageType;
  read: boolean;
  created_at: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id?: number;
  message_id?: number;
  filename: string;
  path: string;
  url?: string;
  mime_type: string;
  size: number;
  original_name?: string;
}

export interface Note {
  id: number;
  conversation_id: number;
  user_id: number;
  note: string;
  created_at: string;
  user?: User;
}

export interface Shortcut {
  id: number;
  user_id: number | null;
  shortcut: string;
  title: string;
  message: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}
```

## Telas Principais

### 1. Login

Fluxo:

1. Enviar `POST /auth/login`.
2. Salvar tokens.
3. Redirecionar para o painel.
4. Carregar `GET /auth/me` ao abrir o app.

### 2. Painel de Atendimento

Layout recomendado:

```txt
[Sidebar conversas] [Chat ativo] [Painel cliente/notas]
```

Ao abrir a tela:

1. Conectar no Socket.IO com token.
2. Buscar conversas em `GET /conversations`.
3. Renderizar lista ordenada por `ultima_interacao`.
4. Ao clicar em uma conversa, buscar detalhes em `GET /conversations/:id`.
5. Buscar mensagens em `GET /messages/:conversationId`.
6. Entrar na sala Socket.IO com `join_conversation`.

### 3. Widget do Cliente

O cliente nao precisa JWT.

Fluxo:

1. Receber ou identificar `cliente_id_externo`.
2. Criar/abrir conversa com `POST /conversations`.
3. Guardar `conversation.id`.
4. Enviar mensagens com `POST /messages`.
5. Conectar no Socket.IO.
6. Entrar na sala da conversa com `join_conversation`.

## Clientes

### Listar clientes

```http
GET /clientes
Authorization: Bearer ACCESS_TOKEN
```

### Buscar por ID

```http
GET /clientes/1
Authorization: Bearer ACCESS_TOKEN
```

### Pesquisar

```http
GET /clientes/search?search=joao
Authorization: Bearer ACCESS_TOKEN
```

Response esperado:

```json
[
  {
    "id": 1,
    "name": "EDINALDO",
    "referencia": "EDINALDO8435",
    "phone": "5564981114404",
    "nome": "EDINALDO",
    "usuario_referencia": "EDINALDO8435",
    "telefone": "5564981114404",
    "email": null,
    "cidade": null,
    "status": null
  }
]
```

## Conversas

### Listar conversas

```http
GET /conversations
Authorization: Bearer ACCESS_TOKEN
```

Query opcionais:

```txt
status=ABERTA
cliente_id_externo=1
search=texto
```

Response:

```json
[
  {
    "id": 1,
    "cliente_id_externo": "1",
    "atendente_id": 1,
    "status": "ABERTA",
    "ultima_mensagem": "Ola",
    "ultima_interacao": "2026-05-30T10:00:00.000Z",
    "created_at": "2026-05-30T10:00:00.000Z",
    "updated_at": "2026-05-30T10:00:00.000Z",
    "cliente": {
      "id": 1,
      "nome": "EDINALDO",
      "referencia": "EDINALDO8435",
      "usuario_referencia": "EDINALDO8435",
      "telefone": "5564981114404",
      "email": null,
      "cidade": null,
      "status": null
    },
    "unread_count": 1
  }
]
```

### Abrir conversa

```http
GET /conversations/1
Authorization: Bearer ACCESS_TOKEN
```

Retorna conversa, cliente, historico e notas internas.

### Gerar link seguro de conversa

Use esta rota no painel/admin para gerar o link que sera enviado ao cliente.

```http
GET /conversations/client-access/1
Authorization: Bearer ACCESS_TOKEN
```

O `1` acima e o ID do cliente na API externa.

Response:

```json
{
  "cliente": {
    "id": 1,
    "nome": "EDINALDO",
    "referencia": "EDINALDO8435",
    "usuario_referencia": "EDINALDO8435",
    "telefone": "5564981114404"
  },
  "referencia": "EDINALDO8435",
  "codigo": "b73fbd3e68c90f5f3bc7480e",
  "url": "http://localhost:3000/chat?code=b73fbd3e68c90f5f3bc7480e"
}
```

Envie essa `url` para o cliente.

### Criar conversa pelo widget do cliente

Pode ser usada sem token pelo widget do cliente.

```http
POST /conversations
Content-Type: application/json
```

```json
{
  "codigo": "b73fbd3e68c90f5f3bc7480e"
}
```

Regra:

Se ja existir conversa `ABERTA` ou `AGUARDANDO_CLIENTE` para o cliente, a API retorna a conversa existente.

Por seguranca, chamada publica nao aceita mais apenas `cliente_id_externo`. O `cliente_id_externo` pode ser usado apenas por usuario autenticado.

Se quiser, a chamada publica tambem aceita `cliente_referencia` junto do codigo, mas ela nao e obrigatoria:

```json
{
  "cliente_referencia": "EDINALDO8435",
  "codigo": "b73fbd3e68c90f5f3bc7480e"
}
```

### Encerrar

```http
POST /conversations/1/close
Authorization: Bearer ACCESS_TOKEN
```

### Reabrir

```http
POST /conversations/1/reopen
Authorization: Bearer ACCESS_TOKEN
```

### Arquivar

```http
POST /conversations/1/archive
Authorization: Bearer ACCESS_TOKEN
```

### Transferir

Somente `ADMIN`.

```http
POST /conversations/1/transfer
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "atendente_id": 2
}
```

## Mensagens

### Listar mensagens

```http
GET /messages/1
Authorization: Bearer ACCESS_TOKEN
```

O `1` acima e o `conversation_id`.

Response:

```json
[
  {
    "id": 1,
    "conversation_id": 1,
    "sender_type": "CLIENTE",
    "sender_id": "1",
    "message": "Ola, preciso de ajuda",
    "message_type": "TEXT",
    "read": false,
    "created_at": "2026-05-30T10:00:00.000Z",
    "attachments": []
  }
]
```

### Enviar mensagem como cliente

Sem token.

```http
POST /messages
Content-Type: application/json
```

```json
{
  "conversation_id": 1,
  "sender_type": "CLIENTE",
  "sender_id": "1",
  "message": "Ola, preciso de ajuda",
  "message_type": "TEXT"
}
```

### Enviar mensagem como atendente

Com token.

```http
POST /messages
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "conversation_id": 1,
  "sender_type": "ATENDENTE",
  "message": "Ola, como posso ajudar?",
  "message_type": "TEXT"
}
```

### Marcar mensagem como lida

```http
PUT /messages/1/read
Authorization: Bearer ACCESS_TOKEN
```

O `1` acima e o `message_id`, nao o `conversation_id`.

## Notas Internas

### Listar notas

```http
GET /notes/1
Authorization: Bearer ACCESS_TOKEN
```

O `1` acima e o `conversation_id`.

### Criar nota

```http
POST /notes
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "conversation_id": 1,
  "note": "Cliente pediu retorno amanha."
}
```

### Excluir nota

```http
DELETE /notes/1
Authorization: Bearer ACCESS_TOKEN
```

## Uploads e Anexos

### Upload

```http
POST /upload
Authorization: Bearer ACCESS_TOKEN
Content-Type: multipart/form-data
```

Campo:

```txt
file
```

Nao ha filtro de extensao ou MIME type. Arquivos como `apk`, `zip`, `rar`, imagens, PDFs, audios e outros tipos sao aceitos. Com `UPLOAD_MAX_SIZE_MB=0`, nao ha limite de tamanho aplicado pelo Multer.

Response:

```json
{
  "filename": "uuid.pdf",
  "original_name": "contrato.pdf",
  "path": "src/uploads/uuid.pdf",
  "url": "/files/uuid.pdf",
  "mime_type": "application/pdf",
  "size": 12000
}
```

### Enviar mensagem com anexo

Depois do upload, envie uma mensagem usando os dados do arquivo.

```http
POST /messages
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "conversation_id": 1,
  "sender_type": "ATENDENTE",
  "message": "Segue o arquivo",
  "message_type": "FILE",
  "attachments": [
    {
      "filename": "uuid.pdf",
      "path": "src/uploads/uuid.pdf",
      "mime_type": "application/pdf",
      "size": 12000
    }
  ]
}
```

### Acessar arquivo

```http
GET /files/uuid.pdf
```

## Atalhos de Mensagem

Use esta funcionalidade para respostas rapidas no estilo WhatsApp. Quando o atendente digitar `/`, o frontend deve buscar sugestoes e mostrar um menu acima do campo de texto.

Exemplos de atalhos:

```txt
/ola
/pix
/horario
/suporte
```

### Listar atalhos

```http
GET /shortcuts
Authorization: Bearer ACCESS_TOKEN
```

Query opcionais:

```txt
search=ola
active=true
```

### Buscar sugestoes

```http
GET /shortcuts/suggestions?q=ola
Authorization: Bearer ACCESS_TOKEN
```

Tambem funciona com barra:

```http
GET /shortcuts/suggestions?q=/ola
Authorization: Bearer ACCESS_TOKEN
```

Response:

```json
[
  {
    "id": 1,
    "user_id": null,
    "shortcut": "ola",
    "title": "Saudacao inicial",
    "message": "Ola! Como posso ajudar?",
    "active": true,
    "created_at": "2026-05-30T10:00:00.000Z",
    "updated_at": "2026-05-30T10:00:00.000Z"
  }
]
```

### Criar atalho

```http
POST /shortcuts
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

Atalho pessoal do atendente:

```json
{
  "shortcut": "ola",
  "title": "Saudacao inicial",
  "message": "Ola! Como posso ajudar?",
  "active": true
}
```

Atalho global para todos os atendentes:

```json
{
  "shortcut": "pix",
  "title": "Dados do Pix",
  "message": "Nossa chave Pix e ...",
  "active": true,
  "global": true
}
```

### Atualizar atalho

```http
PUT /shortcuts/1
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "title": "Nova saudacao",
  "message": "Ola! Tudo bem? Como posso ajudar hoje?",
  "active": true
}
```

### Excluir atalho

```http
DELETE /shortcuts/1
Authorization: Bearer ACCESS_TOKEN
```

### Logica no frontend

1. Monitorar o valor do textarea.
2. Se o texto atual comecar com `/`, chamar `GET /shortcuts/suggestions?q=<texto>`.
3. Renderizar uma lista com `shortcut`, `title` e uma previa de `message`.
4. Ao clicar em uma sugestao, substituir o texto do textarea por `shortcut.message`.
5. O envio continua usando `POST /messages`.

Exemplo:

```ts
async function loadShortcutSuggestions(value: string) {
  if (!value.startsWith('/')) {
    return [];
  }

  const { data } = await api.get<Shortcut[]>('/shortcuts/suggestions', {
    params: {
      q: value
    }
  });

  return data;
}

function applyShortcut(shortcut: Shortcut) {
  setMessage(shortcut.message);
}
```

## Socket.IO

Instale no frontend:

```bash
npm install socket.io-client
```

### Conexao atendente

```ts
import { io } from 'socket.io-client';

export const socket = io('https://apichat.sytes.net', {
  auth: {
    token: accessToken
  }
});
```

### Conexao cliente/widget

```ts
import { io } from 'socket.io-client';

export const socket = io('https://apichat.sytes.net');
```

### Entrar na conversa

```ts
socket.emit('join_conversation', conversationId);
```

### Sair da conversa

```ts
socket.emit('leave_conversation', conversationId);
```

### Receber mensagem

```ts
socket.on('message_received', (message: Message) => {
  // adicionar mensagem no chat ativo
});
```

### Mensagem enviada

```ts
socket.on('message_sent', (message: Message) => {
  // confirmar envio ou atualizar estado local
});
```

### Atualizar lista de conversas

```ts
socket.on('conversation_updated', ({ conversation_id }) => {
  // recarregar /conversations ou atualizar conversa especifica
});
```

### Digitando

Enviar:

```ts
socket.emit('typing', {
  conversation_id: conversationId,
  sender_type: 'ATENDENTE'
});
```

Parar:

```ts
socket.emit('stop_typing', {
  conversation_id: conversationId,
  sender_type: 'ATENDENTE'
});
```

Receber:

```ts
socket.on('typing', payload => {
  // mostrar "digitando..."
});

socket.on('stop_typing', payload => {
  // esconder "digitando..."
});
```

### Lida

```ts
socket.on('message_read', payload => {
  // payload: { message_id, conversation_id }
});
```

### Presenca

```ts
socket.on('user_online', ({ user_id }) => {
  // marcar atendente online
});

socket.on('user_offline', ({ user_id }) => {
  // marcar atendente offline
});
```

## Fluxo Recomendado do Painel

1. Login.
2. Salvar tokens.
3. Conectar Socket.IO com `accessToken`.
4. Buscar `GET /conversations`.
5. Ao clicar em conversa:
   - emitir `join_conversation`
   - buscar `GET /conversations/:id`
   - buscar `GET /messages/:conversationId`
6. Ao enviar mensagem:
   - chamar `POST /messages`
   - a API salva e emite Socket.IO
7. Ao receber `message_received`:
   - se for conversa aberta, adicionar no chat
   - se for outra conversa, atualizar contador/lista
8. Ao sair de conversa:
   - emitir `leave_conversation`

## Fluxo Recomendado do Widget

1. Ler `code` da URL.
2. Chamar `POST /conversations` com `codigo`.
3. Guardar `conversation_id`.
4. Conectar Socket.IO.
5. Emitir `join_conversation`.
6. Enviar mensagens com `POST /messages` usando `sender_type: CLIENTE`.
7. Receber respostas pelo evento `message_received`.

## Tratamento de Erros

Formato padrao:

```json
{
  "error": true,
  "message": "Mensagem do erro",
  "details": null
}
```

Trate no frontend:

```ts
try {
  await api.post('/messages', payload);
} catch (error) {
  // exibir error.response.data.message
}
```

## Axios Base

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://apichat.sytes.net'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
```

Variavel no Next.js:

```env
NEXT_PUBLIC_API_URL=https://apichat.sytes.net
NEXT_PUBLIC_SOCKET_URL=https://apichat.sytes.net
```
