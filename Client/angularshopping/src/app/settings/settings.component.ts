import { Component, OnInit } from '@angular/core';
import { DataService } from '../data.service';
import { RestApiService } from '../rest-api.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  //disable the button
  btnDisabled = false;
  //create a array currentSettings to store password 
  currentSettings: any;

  constructor(private data:DataService , private rest:RestApiService) { }

  async ngOnInit() {
    try{
      if(!this.data.user)
      {
        await this.data.user.getProfile();
      }
      this.currentSettings = Object.assign({
        newPwd:'',
        pwdCnfrm:''
      },this.data.user);
    }
    catch(error)
    {
      this.data.error(error)
    }

  }

  validate(settings)
  {
    if(settings['name'])
    {
      if(settings['email'])
      {
        if(settings['newPwd'])
        {
          if(settings['pwdCnfrm'])
          {
            if(settings['newPwd']===settings['pwdCnfrm'])
            {
              return true;
            }
            else{
              this.data.error("password donot match");
            }
          }
          else{
            this.data.error("please Enter your confirm password");
          }
        }
        else{
          if(!settings['pwdCnfrm'])
          {
            return true;
          }
          else
          {
            this.data.error("please Enter your new password");
          }
        }
      }
      else{
        this.data.error("please Enter your email");
      }
    }
    else{
      this.data.error("please Enter your name");
    }
  }

  async update()
  {
    //this func make the rest api call and update the value in database that is enterd in setting component
    this.btnDisabled= true;
    try{
      if(this.validate(this.currentSettings))
      {
        const data = await this.rest.post('http://localhost:3030/api/accounts/profile',
        {
          name:this.currentSettings['name'],
          email:this.currentSettings['email'],
          password:this.currentSettings['newPwd'],
          isSeller:this.currentSettings['isSeller'],

        });
        //if success then getProfile(); otherwise show data['error']
        data['success'] ? (this.data.getProfile(),this.data.success(data['message']))
        :this.data.error(data['error'])
      }
    }catch(error)
    {
      this.data.error(error['message']);
    }
    //Enable the button
    this.btnDisabled = false;
  }
}
