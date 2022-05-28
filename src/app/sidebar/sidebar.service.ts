import { Injectable } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private sidebar?: MatSidenav;

  constructor() { }

  register(sidebar: MatSidenav) {
    this.sidebar = sidebar
    if(window.innerWidth > 768) {
      this.sidebar.open()
    }
  }

  toggle(): void {
    if(this.sidebar){
      this.sidebar.toggle();
    }
  }

  open(): void {
    if(this.sidebar){
      this.sidebar.open();
    }
  }

  close(): void {
    if(this.sidebar){
      this.sidebar.close();
    }
  }
}
