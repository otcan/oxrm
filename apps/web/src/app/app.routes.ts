import { Component } from "@angular/core";
import { Routes } from "@angular/router";

@Component({ standalone: true, template: "" })
export class RouteSinkComponent {}

export const appRoutes: Routes = [
  { path: "today", component: RouteSinkComponent },
  { path: "applications", component: RouteSinkComponent },
  { path: "jobs", component: RouteSinkComponent },
  { path: "documents", component: RouteSinkComponent },
  { path: "contacts", component: RouteSinkComponent },
  { path: "pipeline", component: RouteSinkComponent },
  { path: "people", component: RouteSinkComponent },
  { path: "companies", component: RouteSinkComponent },
  { path: "settings/advanced", component: RouteSinkComponent },
  { path: "settings/advanced/activity", component: RouteSinkComponent },
  { path: "start", redirectTo: "today", pathMatch: "full" },
  { path: "dashboard", redirectTo: "today", pathMatch: "full" },
  { path: "queue", redirectTo: "today", pathMatch: "full" },
  { path: "workspace", redirectTo: "today", pathMatch: "full" },
  { path: "records/application", redirectTo: "applications", pathMatch: "full" },
  { path: "records/job", redirectTo: "jobs", pathMatch: "full" },
  { path: "records/cv_version", redirectTo: "documents", pathMatch: "full" },
  { path: "records/cover_letter", redirectTo: "documents", pathMatch: "full" },
  { path: "records/job_contact", redirectTo: "contacts", pathMatch: "full" },
  { path: "records/lead", redirectTo: "pipeline", pathMatch: "full" },
  { path: "records/person", redirectTo: "people", pathMatch: "full" },
  { path: "records/company", redirectTo: "companies", pathMatch: "full" },
  { path: "timeline", redirectTo: "settings/advanced/activity", pathMatch: "full" },
  { path: "views/:viewKey", redirectTo: "settings/advanced", pathMatch: "full" },
  { path: "records", redirectTo: "settings/advanced", pathMatch: "full" },
  { path: "records/:objectType/:recordId", component: RouteSinkComponent },
  { path: "settings", component: RouteSinkComponent },
  { path: "", redirectTo: "today", pathMatch: "full" },
  { path: "**", redirectTo: "today" }
];
