import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RestApiService } from '../rest-api.service';
import { DataService } from '../data.service';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss']
})
export class RegistrationComponent implements OnInit {
  name = '';
  email = '';
  password = '';
  password1 = '';
  isSeller = false;
  btnDisabled = false;

  constructor(private router:Router, private rest:RestApiService ,private data:DataService) { }

  ngOnInit() {}

  //validate method
  validate()
  {
    if(this.name)
    {
      if(this.email)
      {
        if(this.password)
        {
          if(this.password1)
          {
            if(this.password== this.password1)
            {
              return true;
            }
            else{
              this.data.error('password donot match , Kindly check');
            }
          }
          else{
            this.data.error('Confirmation password is not entered');
          }
        }
        else{
          this.data.error('Please Enter a valid password');
        }
      }
      else{
        this.data.error('Please Enter a valid email');
      }
    }
    else{
      this.data.error('Please Enter a valid name');
    }
  }
  //End of Validate method
  //++++++++++++++++++++++

  //++++++++++++++++++++
  //async register start
  async register()
  {
    this.btnDisabled = true;
    try
    {
      if(this.validate())
      {
        const data = await this.rest.post('http://localhost:3030/api/accounts/signup',
          {name:this.name,
            email:this.email,
              password:this.password,
                isSeller: this.isSeller,
        });
        if(data['success'])
        {
          localStorage.setItem('token',data['token']);
          this.data.success('Registarion Successful');
        }else{
            this.data.error(data['message']);
        }

      }
    }
    catch(error){
      this.data.error(error['message']);
    }
    this.btnDisabled = false;
  }
  //End Of Register
}
//End of Register Component