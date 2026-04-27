import { apiClient } from './client';
import type { SearchResponse } from './types';

export interface SearchParams {
  city_id?: number;
  date?: string;
  guests?: number;
  price_max?: number;
  amenity_ids?: number[];
  sort?: 'rating_desc' | 'price_asc' | 'price_desc';
  page?: number;
  page_size?: number;
}

export const searchApi = {
  async halls(params: SearchParams): Promise<SearchResponse> {
    const query: Record<string, string | number> = {};
    if (params.city_id !== undefined) query.city_id = params.city_id;
    if (params.date) query.date = params.date;
    if (params.guests !== undefined) query.guests = params.guests;
    if (params.price_max !== undefined) query.price_max = params.price_max;
    if (params.amenity_ids && params.amenity_ids.length) {
      query.amenity_ids = params.amenity_ids.join(',');
    }
    if (params.sort) query.sort = params.sort;
    if (params.page !== undefined) query.page = params.page;
    if (params.page_size !== undefined) query.page_size = params.page_size;

    const { data } = await apiClient.get<SearchResponse>('/search/halls', { params: query });
    return data;
  },
};
