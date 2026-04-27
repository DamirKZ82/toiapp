import { apiClient } from './client';
import type { Amenity, City, HallBrief, HallPhoto, VenueBrief } from './types';

export interface VenueBody {
  city_id: number;
  name: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  phone?: string | null;
}

export type VenuePatchBody = Partial<VenueBody>;

export interface HallBriefWithMeta extends HallBrief {
  is_active: boolean;
  main_thumb: string | null;
}

export interface MyVenue {
  id: number;
  guid: string;
  owner_id: number;
  city_id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  halls: HallBriefWithMeta[];
}

export interface HallFull extends HallBrief {
  is_active: boolean;
  photos: HallPhoto[];
  amenities: Amenity[];
}

/** Детали заведения: halls содержат полные фото и удобства (без главного превью — первое фото из photos). */
export interface VenueDetails extends Omit<MyVenue, 'halls'> {
  halls: (HallBrief & {
    is_active: boolean;
    photos: HallPhoto[];
    amenities: Amenity[];
  })[];
}

export const venuesApi = {
  async my(): Promise<{ items: MyVenue[] }> {
    const { data } = await apiClient.get<{ items: MyVenue[] }>('/venues/my');
    return data;
  },

  async create(body: VenueBody): Promise<{ venue: MyVenue }> {
    const { data } = await apiClient.post<{ venue: MyVenue }>('/venues', body);
    return data;
  },

  async get(guid: string): Promise<{ venue: VenueDetails }> {
    const { data } = await apiClient.get<{ venue: VenueDetails }>(`/venues/${guid}`);
    return data;
  },

  async patch(guid: string, body: VenuePatchBody): Promise<{ venue: MyVenue }> {
    const { data } = await apiClient.patch<{ venue: MyVenue }>(`/venues/${guid}`, body);
    return data;
  },

  async remove(guid: string): Promise<{ deleted: true }> {
    const { data } = await apiClient.delete<{ deleted: true }>(`/venues/${guid}`);
    return data;
  },
};
