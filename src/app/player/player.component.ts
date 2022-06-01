import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BookService } from '../book/book.service';
import { CacheService } from '../cache.service';
import { Position } from '../db';
import { AudioService } from './audio.service';
import { PositionService } from './position.service';

const BOOK = 'book';

enum CacheState {
  CACHED,
  NOT_CACHED,
  DOWNLOADING
};

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements OnInit {

  @Input() public book!: string;
  @Input() public title!: string;
  @Input() public cover!: string;
  @Input() public book_length: string = "0";
  @Input() public display_time_remaining: boolean = true;
  @Input() public cache_state: CacheState = CacheState.DOWNLOADING;
  @Input() public current_position?: Position;
  @Input() public last_sync: number = 0;

  @Input() public get cache_state_icon(): string {
    switch (this.cache_state) {
      case CacheState.CACHED:
        return 'file_download_done';
      case CacheState.NOT_CACHED:
        return 'file_download';
      default:
        return 'downloading';
    }
  }

  @Input() public get cache_text(): string {
    switch (this.cache_state) {
      case CacheState.CACHED:
        return 'Remove book from player';
      case CacheState.NOT_CACHED:
        return 'Download book to player';
      default:
        return 'Downloading';
    }
  }

  @Input() public cover_url!: string | SafeUrl;

  @Input() public get play_pause_icon() {
    return this.audioService.paused ? "play_arrow" : "pause";
  }

  @Input() public current_time: number = 0;

  constructor(private route: ActivatedRoute, public cache: CacheService, private sanitizer: DomSanitizer, private bookService: BookService, public audioService: AudioService, public positionService: PositionService) { }

  ngOnInit(): void {
    this.positionService.setAudio(this.audioService);

    this.route.params.subscribe(async params => {
      const paramsMap = convertToParamMap(params);
      const book = paramsMap.get(BOOK);
      if(book !== null) {
        this.positionService.current_position.book = book;
        this.book = book;
        this.title = book;

        const metadata = this.bookService.getMetadata(book);
        metadata.subscribe(metadata => {
          this.audioService.setMetadata(metadata);
          if(metadata.format.tags.title) {
            this.title = metadata.format.tags.title;
          }
        });

        const cachedBook = await this.cache.getBook(book);
        if(cachedBook) {
          this.cache_state = CacheState.CACHED;
          const source = URL.createObjectURL(cachedBook.data);
          this.audioService.setSrc(source);
        } else {
          this.cache_state = CacheState.NOT_CACHED;
          const source = `/v1/books/${book}`;
          this.audioService.setSrc(source);
        }
        const currentPosition = await this.cache.getCurrentPosition(book);
        if(currentPosition) {
          this.audioService.setPosition(currentPosition.position);
          this.positionService.updateCurrentPosition(currentPosition.position);
        }

        const bookKeys = await this.cache.getBookKeys();
        if(bookKeys.includes(this.book)) {
          this.cache.cacheCover(this.book);
          const cover = await this.cache.getCover(this.book)
          if(cover) {
            const source = URL.createObjectURL(cover.data);
            this.cover_url = this.sanitizer.bypassSecurityTrustUrl(source);
            this.audioService.setCover(source);
          }
        } else {
          const source = `/v1/books/${this.book}/cover`;
          this.cover_url = source;
          this.audioService.setCover(source);
        }
      }
    });
  }

//  private timeUpdate(forceSync: boolean = false) {
//    const isManualChange = this.current_time == this.audio.currentTime;
//    this.current_time = this.audio.currentTime;
//
//    if(
//      this.current_position &&
//      !isManualChange
//    ) {
//      this.current_position.position = this.current_time;
//      this.current_position.timestamp = Date.now();
//    } else {
//      this.current_position = {
//        book: this.book,
//        position: this.current_time,
//        timestamp: Date.now()
//      };
//    }
//
//    if((
//        Date.now() - this.last_sync > SYNC_INTERVAL
//      ) || forceSync) {
//      this.cache.syncPositions(this.book, this.current_position).then((newPositions) => {
//        this.positions = newPositions.positions;
//        if(this.current_position) {
//          if(newPositions.currentPosition) {
//            this.current_position = newPositions.currentPosition;
//          }
//        }
//      });
//      this.last_sync = Date.now();
//    }
//
//  }

  public toggleDisplayType() {
    this.display_time_remaining = !this.display_time_remaining;
  }

  public cacheOrRemoveBook() {
    if(this.cache_state == CacheState.CACHED) {
      this.removeBook();
    } else if(this.cache_state == CacheState.NOT_CACHED){
      this.cacheBook();
    }
  }

  public async cacheBook() {
    this.cache_state = CacheState.DOWNLOADING;
    await this.cache.cacheBook(this.book);
    this.cache_state = CacheState.CACHED;
  }

  public removeBook() {
    this.cache.removeBook(this.book);
    this.cache_state = CacheState.NOT_CACHED;
  }
}
