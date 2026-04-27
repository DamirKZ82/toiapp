import { apiClient } from './client';
import type { Amenity, CalendarResponse, City, HallBrief, HallPhoto, VenueBrief } from './types';

export interface PublicHallDetails extends HallBrief {
  venue_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  photos: HallPhoto[];
  amenities: Amenity[];
  venue: VenueBrief;
  city: City;
}

export const hallsApi = {
  /** Публичные детали зала (используется на карточке C02). */
  async getPublic(guid: string): Promise<{ hall: PublicHallDetails }> {
    const { data } = await apiClient.get<{ hall: PublicHallDetails }>(`/search/halls/${guid}`);
    return data;
  },

  /** Календарь занятости зала (требует JWT). */
  async calendar(guid: string, month: string): Promise<CalendarResponse> {
    const { data } = await apiClient.get<CalendarResponse>(
      `/halls/${guid}/calendar`,
      { params: { month } },
    );
    return data;
  },
};
