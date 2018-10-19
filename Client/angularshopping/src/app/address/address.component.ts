import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';
import { RestApiService } from '../rest-api.service';

@Component({
  selector: 'app-address',
  templateUrl: './address.component.html',
  styleUrls: ['./address.component.scss']
})
export class AddressComponent implements OnInit {
  btnDisabled = false;
  currentAddress:any;
  constructor(private data:DataService,private rest:RestApiService) { }

  async ngOnInit() {
    try{
      const data = await this.rest.get("http:localhost:3030/api/accounts/address");
      if(JSON.stringify(data['address'])==='{}' && this.data.message == '')
      {
        this.data.warning("You have not Entered the shipping address please fill the address");
      }
      this.currentAddress = data['address'];
    }catch(error)
    {
      this.data.error(error['message']);
    }
  }

  //if data exist then directly redirect to updateAddress
  async updateAddress() {
    //disable the button
    this.btnDisabled= true;
    try{
      const res = await this.rest.post("http:localhost:3030/api/accounts/address",this.currentAddress);
      //Check the *res* from the server 
      //if it is true  means already set get success message and show users profile data;
      //if it is false show res error message
      res['success']
       ? (this.data.success(res['message']),await this.data.getProfile()) : this.data.error(res['message'])
    }catch(error)
    {
      this.data.error(error['message']);
    }
    //when all process done enable the button
    this.btnDisabled= false;
  }
  //End of updateAddress()
}
