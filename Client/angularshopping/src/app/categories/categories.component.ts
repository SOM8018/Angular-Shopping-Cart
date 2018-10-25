import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RestApiService } from '../rest-api.service';
import { DataService } from '../data.service';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent implements OnInit {

	categories:any;
	newCategory = '';
	btndisabled = false ;

  constructor(private rest:RestApiService , private data:DataService) 
  { 

  }

  async ngOnInit() {
  	try{
      const data = await this.rest.get('http://localhost:3030/api/categories');
      data['success'] ? (this.categories = data['categories']) : this.data.error(data['message'])
    }
    catch(error)
    {
      this.data.error(error['message']);
    }

  }
  async addCategory(){
  	this.btndisabled = true;
  	try{
      const data = await this.rest.post('http://localhost:3030/api/categories',{category : this.newCategory});
      data['success'] ? this.data.success(data['message']) : this.data.error(data['message'])
    }
    catch(error)
    {
      this.data.error(error['message']);
    }
    this.btndisabled = false;
  }

}
