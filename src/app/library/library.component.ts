import { Component, OnInit } from '@angular/core';
import { LibraryService } from './library.service';
import { Observable } from 'rxjs';
import {
  BreakpointObserver,
  BreakpointState
} from '@angular/cdk/layout';

@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryComponent implements OnInit {

  public books$!: Observable<string[]>
  public flexWidth: string = '25%';

  constructor(private libraryService: LibraryService, private breakpointObserver: BreakpointObserver) { }

  ngOnInit(): void {
    this.books$ = this.libraryService.getBooks();
    this.breakpointObserver
      .observe(['(min-width: 601px)', '(max-width: 850px)'])
      .subscribe((state: BreakpointState) => {
        if (state.matches) {
          this.flexWidth = '33%';
        }
      });
    this.breakpointObserver
      .observe(['(max-width: 600px)'])
      .subscribe((state: BreakpointState) => {
        if (state.matches) {
          this.flexWidth = '100%';
        }
      });
    this.breakpointObserver
      .observe(['(min-width: 851px)'])
      .subscribe((state: BreakpointState) => {
        if (state.matches) {
          this.flexWidth = '25%';
        }
      });
  }
}
