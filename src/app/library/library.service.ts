import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CacheService } from '../cache.service';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LibraryService {

  constructor(private httpClient: HttpClient, private cache: CacheService) { }

  getBooks(){
        //error: () => this.cache.getBookKeys().then(bookKeys => subscriber.next(bookKeys)).catch(err => subscriber.error(err)),
      return this.httpClient.get<string[]>('/v1/books')
        .pipe(catchError(() => this.cache.getBookKeys()));
  }
}
