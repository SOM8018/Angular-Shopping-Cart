import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { RegistrationComponent } from './registration/registration.component';
const routes: Routes = [
  {
    path:'',
    component: HomeComponent
  },{
    path:'register',
    component: RegistrationComponent
  },
  {
    //if any path dont found it goes to homepage
    path:'**',
    redirectTo:''
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
