import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CacheService } from '../cache.service';
import { catchError } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BookService {

  constructor(private httpClient: HttpClient, private cache: CacheService) { }

  getMetadata(book: string): Observable<Metadata>{
      return this.httpClient.get<Metadata>('/v1/books/' + book + '/metadata')
        //.pipe(catchError(() => this.cache.getMetadata(book)));
  }
}

export interface Metadata {
  chapters: Chapter[];
  format: Format;
}

interface Chapter {
  id: number;
  time_base: string;
  start: number;
  start_time: string;
  end: number;
  end_time: string;
  tags: Tags;
}

interface Tags {
  major_brand?: string;
  minor_version?: string;
  compatible_brands?: string;
  creation_time?: string;
  title?: string;
  artist?: string;
  album_artist?: string;
  composer?: string;
  album?: string;
  date?: string;
  encoder?: string;
  comment?: string;
  genre?: string;
  copyright?: string;
  description?: string;
  compilation?: string;
  track?: string;
}

interface Format {
  filename: string;
  nb_streams: number;
  nb_programs: number;
  format_name: string;
  format_long_name: string;
  start_time: string;
  duration: string;
  size: string;
  bit_rate: string;
  probe_score: number;
  tags: Tags;
}

