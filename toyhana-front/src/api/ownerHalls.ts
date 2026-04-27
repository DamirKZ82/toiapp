import { apiClient } from './client';
import type { Amenity, HallBrief, HallPhoto } from './types';

export interface HallBody {
  venue_guid: string;
  name: string;
  description?: string | null;
  area_sqm?: number | null;
  capacity_min?: number | null;
  capacity_max?: number | null;
  price_weekday: number;
  price_weekend: number;
  amenity_ids?: number[];
}

export type HallPatchBody = Partial<Omit<HallBody, 'venue_guid'>> & { is_active?: boolean };

export interface OwnerHallFull extends HallBrief {
  venue_id: number;
  is_active: boolean;
  photos: HallPhoto[];
  amenities: Amenity[];
}

export interface UploadedPhoto {
  id: number;
  file_path: string;
  thumb_path: string;
  sort_order: number;
}

/**
 * API для владельца: CRUD залов и управление фото.
 * Отличается от клиентского hallsApi, который берёт публичные детали через /search/halls/{guid}.
 */
export const ownerHallsApi = {
  async create(body: HallBody): Promise<{ hall: OwnerHallFull }> {
    const { data } = await apiClient.post<{ hall: OwnerHallFull }>('/halls', body);
    return data;
  },

  async get(guid: string): Promise<{ hall: OwnerHallFull }> {
    const { data } = await apiClient.get<{ hall: OwnerHallFull }>(`/halls/${guid}`);
    return data;
  },

  async patch(guid: string, body: HallPatchBody): Promise<{ hall: OwnerHallFull }> {
    const { data } = await apiClient.patch<{ hall: OwnerHallFull }>(`/halls/${guid}`, body);
    return data;
  },

  async remove(guid: string): Promise<{ deleted: true }> {
    const { data } = await apiClient.delete<{ deleted: true }>(`/halls/${guid}`);
    return data;
  },

  /**
   * Загрузка фото пачкой.
   * `files` — массив локальных URI из expo-image-picker.
   */
  async uploadPhotos(
    hallGuid: string,
    files: { uri: string; name: string; type: string }[],
  ): Promise<{ items: UploadedPhoto[] }> {
    const form = new FormData();
    for (const f of files) {
      // @ts-expect-error React Native FormData file shape
      form.append('files', { uri: f.uri, name: f.name, type: f.type });
    }
    const { data } = await apiClient.post<{ items: UploadedPhoto[] }>(
      `/halls/${hallGuid}/photos`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  async deletePhoto(photoId: number): Promise<{ deleted: true }> {
    const { data } = await apiClient.delete<{ deleted: true }>(`/halls/photos/${photoId}`);
    return data;
  },

  async reorderPhotos(hallGuid: string, photoIds: number[]): Promise<{ items: HallPhoto[] }> {
    const { data } = await apiClient.patch<{ items: HallPhoto[] }>(
      `/halls/${hallGuid}/photos/order`,
      { photo_ids: photoIds },
    );
    return data;
  },
};
