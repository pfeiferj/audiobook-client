import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CacheService } from '../cache.service';

@Component({
  selector: 'app-book',
  templateUrl: './book.component.html',
  styleUrls: ['./book.component.scss']
})
export class BookComponent implements OnInit {

  @Input() public title!: string;
  @Input() public cover!: string | SafeUrl;

  constructor(private cache: CacheService, private sanitizer: DomSanitizer) {}

  async ngOnInit(): Promise<void> {
    const books = await this.cache.getBookKeys();
    if(books.includes(this.title)) {
      this.cache.cacheCover(this.title);
      const cover = await this.cache.getCover(this.title)
      if(cover) {
        this.cover = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(cover.data));
      }
    }
  }

}
