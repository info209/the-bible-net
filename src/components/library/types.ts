export interface SongBook {
  id: string;
  title: string;
  subtitle?: string;
  language: string;
  type: 'hymnal' | 'chorus' | 'contemporary' | 'traditional' | 'album';
  coverImage: string;
  songCount: number;
  tags: string[];
  category: string;
  author?: string;
  publisher?: string;
  yearPublished?: number;
  rating?: number;
  popularity?: number;
  description?: string;
}
