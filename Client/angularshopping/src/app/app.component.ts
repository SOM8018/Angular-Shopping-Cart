import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from './data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  searchTerm = '';
  isCollapsed = true;
  constructor(private router:Router ,private data:DataService){}


  get token(){
    return localStorage.getItem('token');
  }
  collapse(){
    this.isCollapsed = true;
  }
  closeDropdown(dropdown)
  {
    dropdown.close();

  }
  logout()
  {
    this.data.user = {};
    localStorage.clear();
    this.router.navigate(['']);
  }

  search()
  {

  }
}
