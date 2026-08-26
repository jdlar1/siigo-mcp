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

const { SiigoApiError, SiigoClient, validateRequestsPerMinute } = await import('../dist/siigo-client.js');

describe('SiigoClient', () => {
  beforeEach(() => {
    mockAxios.create.mockReturnValue(mockAxiosInstance);
    mockAxios.isAxiosError.mockImplementation((error) => Boolean(error?.isAxiosError));
    mockAxiosInstance.defaults.headers.common = {};
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.request.mockReset();
  });

  test('uses the production request budget by default and validates overrides', () => {
    const config = {
      username: 'user',
      accessKey: 'key',
      baseUrl: 'https://api.siigo.com',
      partnerId: 'partner',
    };

    expect(validateRequestsPerMinute(undefined)).toBe(100);
    expect(validateRequestsPerMinute(10)).toBe(10);
    expect(new SiigoClient(config).requestsPerMinute).toBe(100);
    expect(new SiigoClient({ ...config, requestsPerMinute: 10 }).requestsPerMinute).toBe(10);
    expect(() => validateRequestsPerMinute(0)).toThrow('between 1 and 100');
    expect(() => validateRequestsPerMinute(101)).toThrow('between 1 and 100');
    expect(() => new SiigoClient({ ...config, requestsPerMinute: 1.5 })).toThrow('between 1 and 100');
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

  test('uses the documented collection route for webhook updates', async () => {
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
        url: '/v1/webhooks',
        data: { active: false },
      }),
    );
  });

  test('falls back to the legacy webhook id route only after a documented-route miss', async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: '*',
      },
    });
    mockAxiosInstance.request
      .mockRejectedValueOnce({
        isAxiosError: true,
        message: 'Not found',
        response: { status: 404, data: { Errors: [{ Message: 'Not found' }] } },
      })
      .mockResolvedValueOnce({ data: { id: 'wh_123', active: false } });

    const client = new SiigoClient({
      username: 'user',
      accessKey: 'key',
      baseUrl: 'https://api.siigo.com',
      partnerId: 'partner',
    });

    await client.updateWebhook('wh_123', {
      application_id: 'Example',
      topic: 'public.siigoapi.products.update',
      url: 'https://example.test/webhook',
      active: false,
    });

    expect(mockAxiosInstance.request).toHaveBeenNthCalledWith(1, expect.objectContaining({ url: '/v1/webhooks' }));
    expect(mockAxiosInstance.request).toHaveBeenNthCalledWith(2, expect.objectContaining({ url: '/v1/webhooks/wh_123' }));
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

  test('keeps pagination output valid when local searches have no matches', async () => {
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
          results: [{ code: 'A1', name: 'Alpha' }],
          pagination: { page: 1, page_size: 100, total_results: 1 },
        },
      })
      .mockResolvedValueOnce({
        data: {
          results: [{ identification: '1', name: ['Alice'] }],
          pagination: { page: 1, page_size: 100, total_results: 1 },
        },
      });

    const client = new SiigoClient({
      username: 'user',
      accessKey: 'key',
      baseUrl: 'https://api.siigo.com',
      partnerId: 'partner',
    });

    const products = await client.searchProducts({ name: 'missing' });
    const customers = await client.searchCustomers({ name: 'missing' });

    expect(products).toMatchObject({ results: [], pagination: { page_size: 1, total_results: 0 } });
    expect(customers).toMatchObject({ results: [], pagination: { page_size: 1, total_results: 0 } });
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
        url: '/v1/misc-incomes',
      }),
    );
  });

  test('routes miscellaneous-income vouchers through the documented query variant', async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: '*',
      },
    });
    mockAxiosInstance.request.mockResolvedValue({ data: { id: 'voucher_123' } });

    const client = new SiigoClient({
      username: 'user',
      accessKey: 'key',
      baseUrl: 'https://api.siigo.com',
      partnerId: 'partner',
    });

    const voucher = {
      document: { id: 1 },
      date: '2026-08-26',
      type: 'MiscIncome',
      customer: { identification: '900123456' },
      income: { id: 2 },
      payment: { id: 3, value: 100 },
    };
    await client.createMiscIncomeVoucher(voucher);

    expect(mockAxiosInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/v1/vouchers',
        params: { type: 'MiscIncome' },
        data: voucher,
      }),
    );
  });
});
