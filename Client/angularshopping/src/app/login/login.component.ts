import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RestApiService } from '../rest-api.service';
import { DataService } from '../data.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  btnDisabled = false;
  
  constructor(private router:Router, private rest:RestApiService ,private data:DataService) { }

  ngOnInit() {
  }
  //validate method
  validate()
  {
    if(this.email)
    {
      if(this.password)
      {
        return true;
      }
      else{
        this.data.error('Please Enter a valid email');
      }
    }
    else{
      this.data.error('Please Enter a valid email');
    }
  }
  //End of Validate method
  //++++++++++++++++++++++

  //++++++++++++++++++++
  //async login start
  async login()
  {
    this.btnDisabled = true;
    try
    {
      if(this.validate())
      {
        const data = await this.rest.post('http://localhost:3030/api/accounts/login',
          { email:this.email,
              password:this.password,
          },
        );
        if(data['success'])
        {
          localStorage.setItem('token',data['token']);
          await this.data.getProfile();
          this.router.navigate(['/']);
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
  //End Of login

}
