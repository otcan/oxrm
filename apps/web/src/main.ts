import { bootstrapApplication } from "@angular/platform-browser";
import { Component } from "@angular/core";
import { provideRouter, Routes } from "@angular/router";
import { AppComponent } from "./app/app.component";

@Component({
  standalone: true,
  template: ""
})
class RouteSinkComponent {}

const routes: Routes = [
  { path: "today", component: RouteSinkComponent },
  { path: "applications", component: RouteSinkComponent },
  { path: "jobs", component: RouteSinkComponent },
  { path: "contacts", component: RouteSinkComponent },
  { path: "settings/advanced", component: RouteSinkComponent },
  { path: "settings/advanced/activity", component: RouteSinkComponent },
  { path: "start", redirectTo: "today", pathMatch: "full" },
  { path: "dashboard", redirectTo: "today", pathMatch: "full" },
  { path: "queue", redirectTo: "today", pathMatch: "full" },
  { path: "workspace", redirectTo: "applications", pathMatch: "full" },
  { path: "records/application", redirectTo: "applications", pathMatch: "full" },
  { path: "records/job", redirectTo: "jobs", pathMatch: "full" },
  { path: "records/job_contact", redirectTo: "contacts", pathMatch: "full" },
  { path: "timeline", redirectTo: "settings/advanced/activity", pathMatch: "full" },
  { path: "views/:viewKey", component: RouteSinkComponent },
  { path: "records", component: RouteSinkComponent },
  { path: "records/:objectType", component: RouteSinkComponent },
  { path: "records/:objectType/:recordId", component: RouteSinkComponent },
  { path: "settings", component: RouteSinkComponent },
  { path: "", redirectTo: "today", pathMatch: "full" },
  { path: "**", redirectTo: "today" }
];

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)]
}).catch((error: unknown) => {
  console.error(error);
});
