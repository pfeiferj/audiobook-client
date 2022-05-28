import { Component, OnInit } from '@angular/core';
import { LibraryService } from './library.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryComponent implements OnInit {

  public books$!: Observable<string[]>

  constructor(private libraryService: LibraryService) { }

  ngOnInit(): void {
    this.books$ = this.libraryService.getBooks();
  }
}
