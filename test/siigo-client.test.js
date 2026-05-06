import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockAxiosInstance = {
  defaults: { headers: { common: {} } },
  post: jest.fn(),
  request: jest.fn(),
};

const mockAxios = {
  create: jest.fn(() => mockAxiosInstance),
  isAxiosError: jest.fn((error) => Boolean(error?.isAxiosError)),
};

jest.unstable_mockModule('axios', () => ({
  __esModule: true,
  default: mockAxios,
}));

const { SiigoApiError, SiigoClient } = await import('../dist/siigo-client.js');

describe('SiigoClient', () => {
  beforeEach(() => {
    mockAxios.create.mockReturnValue(mockAxiosInstance);
    mockAxios.isAxiosError.mockImplementation((error) => Boolean(error?.isAxiosError));
    mockAxiosInstance.defaults.headers.common = {};
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.request.mockReset();
  });

  test('throws SiigoApiError when the API returns an error payload', async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: '*',
      },
    });
    mockAxiosInstance.request.mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: {
          Status: 400,
          errors: [{ Code: 'invalid', Message: 'Invalid request payload' }],
        },
      },
    });

    const client = new SiigoClient({
      username: 'user',
      accessKey: 'key',
      baseUrl: 'https://api.siigo.com',
      partnerId: 'partner',
    });

    let thrownError;

    try {
      await client.getProduct('123');
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toMatchObject({
      name: 'SiigoApiError',
      message: 'Invalid request payload',
      status: 400,
      response: { Status: 400 },
    });
    expect(thrownError).toBeInstanceOf(SiigoApiError);
  });

  test('uses the webhook id in the update endpoint path', async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: '*',
      },
    });
    mockAxiosInstance.request.mockResolvedValue({
      data: { data: { id: 'wh_123', active: false } },
    });

    const client = new SiigoClient({
      username: 'user',
      accessKey: 'key',
      baseUrl: 'https://api.siigo.com',
      partnerId: 'partner',
    });

    await client.updateWebhook('wh_123', { active: false });

    expect(mockAxiosInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PUT',
        url: '/v1/webhooks/wh_123',
        data: { active: false },
      }),
    );
  });

  test('searchProducts scans later pages before filtering partial matches', async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: '*',
      },
    });
    mockAxiosInstance.request
      .mockResolvedValueOnce({
        data: {
          results: [
            { code: 'A1', name: 'Alpha' },
            { code: 'B1', name: 'Beta' },
          ],
          pagination: { page: 1, page_size: 2, total_results: 3 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          results: [{ code: 'G1', name: 'Gamma' }],
          pagination: { page: 2, page_size: 2, total_results: 3 },
        },
      });

    const client = new SiigoClient({
      username: 'user',
      accessKey: 'key',
      baseUrl: 'https://api.siigo.com',
      partnerId: 'partner',
    });

    const response = await client.searchProducts({ name: 'gamm' });

    expect(response.results).toEqual([{ code: 'G1', name: 'Gamma' }]);
    expect(response.pagination).toEqual({
      page: 1,
      page_size: 1,
      total_results: 1,
    });
    expect(mockAxiosInstance.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        params: { page: 1, page_size: 100 },
        url: '/v1/products',
      }),
    );
    expect(mockAxiosInstance.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        params: { page: 2, page_size: 2 },
        url: '/v1/products',
      }),
    );
  });

  test('searchCustomers scans later pages before filtering partial matches', async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: '*',
      },
    });
    mockAxiosInstance.request
      .mockResolvedValueOnce({
        data: {
          results: [
            { identification: '1', name: ['Alice'] },
            { identification: '2', name: ['Bob'] },
          ],
          pagination: { page: 1, page_size: 2, total_results: 3 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          results: [{ identification: '3', name: ['Carlos Gomez'] }],
          pagination: { page: 2, page_size: 2, total_results: 3 },
        },
      });

    const client = new SiigoClient({
      username: 'user',
      accessKey: 'key',
      baseUrl: 'https://api.siigo.com',
      partnerId: 'partner',
    });

    const response = await client.searchCustomers({
      name: 'gomez',
      type: 'Customer',
    });

    expect(response.results).toEqual([{ identification: '3', name: ['Carlos Gomez'] }]);
    expect(response.pagination).toEqual({
      page: 1,
      page_size: 1,
      total_results: 1,
    });
    expect(mockAxiosInstance.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        params: { page: 1, page_size: 100, type: 'Customer' },
        url: '/v1/customers',
      }),
    );
    expect(mockAxiosInstance.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        params: { page: 2, page_size: 2, type: 'Customer' },
        url: '/v1/customers',
      }),
    );
  });

  test('creates purchase support documents through the documented endpoint', async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: '*',
      },
    });
    mockAxiosInstance.request.mockResolvedValue({
      data: { data: { id: 'psd_123' } },
    });

    const client = new SiigoClient({
      username: 'user',
      accessKey: 'key',
      baseUrl: 'https://api.siigo.com',
      partnerId: 'partner',
    });

    await client.createPurchaseSupportDocument({ document: { id: 2446 }, date: '2026-02-15' });

    expect(mockAxiosInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/v1/purchase-support-documents',
        data: { document: { id: 2446 }, date: '2026-02-15' },
      }),
    );
  });

  test('updates purchase support documents by id', async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: '*',
      },
    });
    mockAxiosInstance.request.mockResolvedValue({
      data: { data: { id: 'psd_123' } },
    });

    const client = new SiigoClient({
      username: 'user',
      accessKey: 'key',
      baseUrl: 'https://api.siigo.com',
      partnerId: 'partner',
    });

    await client.updatePurchaseSupportDocument('psd_123', { observations: 'updated' });

    expect(mockAxiosInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PUT',
        url: '/v1/purchase-support-documents/psd_123',
        data: { observations: 'updated' },
      }),
    );
  });

  test('requests DS document types', async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: '*',
      },
    });
    mockAxiosInstance.request.mockResolvedValue({
      data: { results: [] },
    });

    const client = new SiigoClient({
      username: 'user',
      accessKey: 'key',
      baseUrl: 'https://api.siigo.com',
      partnerId: 'partner',
    });

    await client.getDocumentTypes('DS');

    expect(mockAxiosInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/v1/document-types',
        params: { type: 'DS' },
      }),
    );
  });

  test('requests receipt adjustment catalogs', async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: '*',
      },
    });
    mockAxiosInstance.request.mockResolvedValue({
      data: { results: [] },
    });

    const client = new SiigoClient({
      username: 'user',
      accessKey: 'key',
      baseUrl: 'https://api.siigo.com',
      partnerId: 'partner',
    });

    await client.getExpenses();
    await client.getMiscIncome();

    expect(mockAxiosInstance.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        method: 'GET',
        url: '/v1/expenses',
      }),
    );
    expect(mockAxiosInstance.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: 'GET',
        url: '/v1/misc-income',
      }),
    );
  });
});
