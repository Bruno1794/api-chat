const axios = require('axios');
const ApiError = require('../utils/ApiError');
const { validateClientAccessCode } = require('../utils/clientAccessCode');

class ClienteService {
  constructor() {
    this.cache = new Map();
    this.cacheTtlMs = Number(process.env.CLIENTE_API_CACHE_TTL_MS || 60000);
    this.client = axios.create({
      baseURL: process.env.CLIENTE_API_BASE_URL,
      timeout: Number(process.env.CLIENTE_API_TIMEOUT_MS || 10000)
    });
  }

  isMockEnabled() {
    return process.env.CLIENTE_API_MOCK_ENABLED === 'true';
  }

  getMockClientes() {
    return [
      {
        id: '1',
        nome: 'Cliente Teste',
        referencia: 'CLIENTE_TESTE',
        usuario_referencia: 'CLIENTE_TESTE',
        telefone: '11999999999',
        email: 'cliente@teste.com',
        cidade: 'Sao Paulo',
        status: 'ATIVO'
      },
      {
        id: '2',
        nome: 'Maria Suporte',
        referencia: 'MARIA_SUPORTE',
        usuario_referencia: 'MARIA_SUPORTE',
        telefone: '21988888888',
        email: 'maria@teste.com',
        cidade: 'Rio de Janeiro',
        status: 'ATIVO'
      }
    ];
  }

  mockList(params = {}) {
    const clientes = this.getMockClientes();
    const search = params.search || params.nome || params.telefone;

    if (!search) {
      return clientes;
    }

    const normalizedSearch = String(search).toLowerCase();

    return clientes.filter(cliente =>
      [
        cliente.id,
        cliente.nome,
        cliente.referencia,
        cliente.usuario_referencia,
        cliente.telefone,
        cliente.email,
        cliente.cidade
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(normalizedSearch))
    );
  }

  normalizeCliente(cliente) {
    if (!cliente) {
      return null;
    }

    return {
      ...cliente,
      id: cliente.id,
      nome: cliente.nome || cliente.name || null,
      referencia: cliente.referencia || cliente.reference || null,
      usuario_referencia:
        cliente.usuario_referencia ||
        cliente.user_reference ||
        cliente.referencia ||
        cliente.reference ||
        null,
      telefone: cliente.telefone || cliente.phone || null,
      email: cliente.email || null,
      cidade: cliente.cidade || null,
      status: cliente.status || null
    };
  }

  normalizeList(response) {
    const clientes = Array.isArray(response)
      ? response
      : response?.clientes || response?.data || [];

    return clientes.map(cliente => this.normalizeCliente(cliente));
  }

  filterClientes(clientes, search) {
    if (!search) {
      return clientes;
    }

    const normalizedSearch = String(search).toLowerCase();

    return clientes.filter(cliente =>
      [
        cliente.id,
        cliente.nome,
        cliente.referencia,
        cliente.usuario_referencia,
        cliente.telefone,
        cliente.email,
        cliente.cidade
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(normalizedSearch))
    );
  }

  getHeaders() {
    const headers = {};
    const apiKey = process.env.CLIENTE_API_KEY;
    const token = process.env.CLIENTE_API_TOKEN;

    if (apiKey) {
      headers['X-API-KEY'] = apiKey;
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
      return headers;
    }

    const username = process.env.CLIENTE_API_USERNAME;
    const password = process.env.CLIENTE_API_PASSWORD;

    if (username && password) {
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');

      headers.Authorization = `Basic ${credentials}`;
    }

    return headers;
  }

  getCache(key) {
    const cached = this.cache.get(key);

    if (!cached || cached.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  setCache(key, value) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs
    });
  }

  async request(path, params = {}) {
    if (!process.env.CLIENTE_API_BASE_URL) {
      throw new ApiError('CLIENTE_API_BASE_URL nao configurada', 500);
    }

    const cacheKey = `${path}:${JSON.stringify(params)}`;
    const cached = this.getCache(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.get(path, {
        params,
        headers: this.getHeaders()
      });

      this.setCache(cacheKey, response.data);

      return response.data;
    } catch (error) {
      const status = error.response?.status || 502;
      const message = error.response?.data?.message || 'Erro ao consultar API de clientes';

      throw new ApiError(message, status, error.response?.data || null);
    }
  }

  async list(params = {}) {
    if (this.isMockEnabled()) {
      return this.mockList(params);
    }

    const response = await this.request(this.getClientesPath(), params);

    return this.filterClientes(
      this.normalizeList(response),
      params.search || params.nome || params.telefone
    );
  }

  async findById(id) {
    if (!id) {
      throw new ApiError('ID do cliente e obrigatorio', 422);
    }

    if (this.isMockEnabled()) {
      const cliente = this.getMockClientes().find(item => String(item.id) === String(id));

      if (!cliente) {
        throw new ApiError('Cliente nao encontrado', 404);
      }

      return cliente;
    }

    try {
      const response = await this.request(`${this.getClientesPath()}/${id}`);
      const cliente = this.normalizeCliente(response?.cliente || response);

      if (cliente?.id) {
        return cliente;
      }
    } catch (error) {
      if (![404, 405].includes(error.statusCode)) {
        throw error;
      }
    }

    const clientes = await this.list();
    const cliente = clientes.find(item => String(item.id) === String(id));

    if (!cliente) {
      throw new ApiError('Cliente nao encontrado', 404);
    }

    return cliente;
  }

  async search(search) {
    return this.list({ search });
  }

  async searchByNome(nome) {
    return this.list({ nome });
  }

  async searchByTelefone(telefone) {
    return this.list({ telefone });
  }

  async findByReferencia(referencia) {
    if (!referencia) {
      throw new ApiError('Referencia do cliente e obrigatoria', 422);
    }

    const clientes = await this.list({ search: referencia });
    const cliente = clientes.find(item =>
      [item.referencia, item.usuario_referencia]
        .filter(Boolean)
        .some(value => String(value) === String(referencia))
    );

    if (!cliente) {
      throw new ApiError('Cliente nao encontrado', 404);
    }

    return cliente;
  }

  async findByAccessCode(code) {
    if (!code) {
      throw new ApiError('Codigo de acesso do cliente e obrigatorio', 422);
    }

    const clientes = await this.list();
    const cliente = clientes.find(item => validateClientAccessCode(item, code));

    if (!cliente) {
      throw new ApiError('Codigo de acesso do cliente invalido', 403);
    }

    return cliente;
  }

  getClientesPath() {
    return process.env.CLIENTE_API_CLIENTES_PATH || '/clientes';
  }
}

module.exports = new ClienteService();
