# API Chat de Suporte

Base URL producao: `https://apichat.sytes.net`

Base URL local: `http://localhost:9191`

Use `Authorization: Bearer <accessToken>` nas rotas protegidas. As rotas `POST /conversations` e `POST /messages` aceitam cliente sem JWT para uso no widget/site.

## Auth

### POST /auth/login

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
    "online": true
  },
  "accessToken": "jwt",
  "refreshToken": "jwt"
}
```

### POST /auth/refresh

```json
{
  "refreshToken": "jwt"
}
```

### POST /auth/logout

Protegida.

### GET /auth/me

Protegida.

## Users

Todas as rotas exigem `ADMIN`.

### GET /users

Lista atendentes e administradores.

### POST /users

```json
{
  "nome": "Atendente 1",
  "email": "atendente@site.com",
  "senha": "123456",
  "role": "ATENDENTE"
}
```

### PUT /users/:id

```json
{
  "nome": "Atendente Senior",
  "online": false
}
```

### DELETE /users/:id

Remove o usuário.

## Clientes

As rotas consultam a API externa configurada em `CLIENTE_API_BASE_URL`. Não existe tabela local de clientes.

### GET /clientes

Query opcional: `search`, `nome`, `telefone`.

### GET /clientes/:id

Busca cliente por ID externo.

### GET /clientes/search?search=joao

Pesquisa clientes na API externa.

## Conversations

### GET /conversations

Protegida. Query opcional: `status`, `cliente_id_externo`, `search`.

Response:

```json
[
  {
    "id": 10,
    "cliente_id_externo": "123",
    "atendente_id": 1,
    "status": "ABERTA",
    "ultima_mensagem": "Olá",
    "ultima_interacao": "2026-05-29T22:00:00.000Z",
    "cliente": {
      "id": "123",
      "nome": "João",
      "telefone": "11999999999",
      "email": "joao@email.com",
      "cidade": "São Paulo"
    },
    "unread_count": 2
  }
]
```

### GET /conversations/:id

Protegida. Retorna conversa, cliente externo, histórico anterior e notas internas.

### POST /conversations

Pública com autenticação opcional. Se já existir conversa `ABERTA` ou `AGUARDANDO_CLIENTE` para o cliente, retorna a conversa existente.

```json
{
  "cliente_id_externo": "123"
}
```

### PUT /conversations/:id

Protegida.

```json
{
  "status": "AGUARDANDO_CLIENTE",
  "atendente_id": 2
}
```

### DELETE /conversations/:id

Somente `ADMIN`.

### POST /conversations/:id/close

Define `FINALIZADA`.

### POST /conversations/:id/reopen

Define `ABERTA`.

### POST /conversations/:id/archive

Define `ARQUIVADA`.

### POST /conversations/:id/transfer

Somente `ADMIN`.

```json
{
  "atendente_id": 2
}
```

## Messages

### GET /messages/:conversationId

Protegida. Retorna mensagens e anexos.

### POST /messages

Pública com autenticação opcional. Clientes podem enviar `sender_type: CLIENTE` sem JWT. Atendentes e sistema exigem JWT.

```json
{
  "conversation_id": 10,
  "sender_type": "CLIENTE",
  "sender_id": "123",
  "message": "Preciso de ajuda",
  "message_type": "TEXT"
}
```

Com anexo já enviado por `/upload`:

```json
{
  "conversation_id": 10,
  "sender_type": "ATENDENTE",
  "message": "Segue o arquivo",
  "message_type": "FILE",
  "attachments": [
    {
      "filename": "arquivo.pdf",
      "path": "src/uploads/arquivo.pdf",
      "mime_type": "application/pdf",
      "size": 12000
    }
  ]
}
```

### PUT /messages/:id/read

Protegida. Marca mensagem como lida e emite `message_read`.

## Notes

Notas são internas e não aparecem para o cliente.

### GET /notes/:conversationId

Protegida.

### POST /notes

```json
{
  "conversation_id": 10,
  "note": "Cliente pediu retorno amanhã."
}
```

### DELETE /notes/:id

Autor da nota ou `ADMIN`.

## Uploads

### POST /upload

Protegida. Enviar `multipart/form-data` com o campo `file`.

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

### GET /files/:filename

Retorna o arquivo.

## Socket.IO

Conectar com JWT opcional:

```js
io("https://apichat.sytes.net", {
  auth: {
    token: accessToken
  }
});
```

Eventos:

- `join_conversation`: entra na sala `conversation:<id>`
- `leave_conversation`: sai da sala
- `message_sent`: emitido após salvar mensagem
- `message_received`: emitido para participantes da conversa
- `typing`: retransmitido para a conversa
- `stop_typing`: retransmitido para a conversa
- `user_online`: presença de atendente
- `user_offline`: saída de atendente
- `message_read`: mensagem lida
- `conversation_updated`: lista lateral deve recarregar/atualizar
