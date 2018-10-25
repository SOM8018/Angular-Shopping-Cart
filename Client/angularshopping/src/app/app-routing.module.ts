import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { RegistrationComponent } from './registration/registration.component';
import { LoginComponent } from './login/login.component';
import { AuthGuardService } from "./auth-guard.service";
import { ProfileComponent } from './profile/profile.component';
import { SettingsComponent } from './settings/settings.component';
import { AddressComponent } from './address/address.component';
import { CategoriesComponent } from './categories/categories.component';
import { PostProductComponent } from './post-product/post-product.component';
import { MyProductsComponent } from './my-products/my-products.component';

const routes: Routes = [
  {
    path:'',
    component: HomeComponent
  },{
    path:'register',
    component: RegistrationComponent,
    canActivate : [AuthGuardService]
  },
  {
    path:'login',
    component: LoginComponent,
    canActivate : [AuthGuardService]
  },
  {
    path:'profile',
    component: ProfileComponent,
    canActivate : [AuthGuardService]
  },
   {
    path:'categories',
    component: CategoriesComponent
  },
  {
    path:'profile/settings',
    component: SettingsComponent,
    canActivate : [AuthGuardService]
  },
  {
    path:'profile/address',
    component: AddressComponent,
    canActivate : [AuthGuardService]
  },
  {
    path:'profile/postproduct',
    component: PostProductComponent,
    canActivate : [AuthGuardService]
  },
  {
    path:'profile/myproducts',
    component: MyProductsComponent,
    canActivate : [AuthGuardService]
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
