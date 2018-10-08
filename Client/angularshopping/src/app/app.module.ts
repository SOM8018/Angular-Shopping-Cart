import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from "@ng-bootstrap/ng-bootstrap"
import { FormsModule } from "@angular/forms"
import { HttpClientModule } from "@angular/common/http";
import { HomeComponent } from './home/home.component';

//import services and register in providers @NgModule
import { RestApiService } from './rest-api.service';
import { DataService } from './data.service';
import { AuthGuardService } from './auth-guard.service';

//import Components and register in declarations @NgModule
import { RegistrationComponent } from './registration/registration.component';
import { LoginComponent } from './login/login.component';
import { MessageComponent } from './message/message.component';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    MessageComponent,
    RegistrationComponent,
    LoginComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule.forRoot(),
    FormsModule,
    HttpClientModule
  ],
  providers: [ RestApiService,DataService,AuthGuardService ],
  bootstrap: [AppComponent]
})
export class AppModule { }
