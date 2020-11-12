import { Observable } from 'rxjs';
import React from 'react';

export class RouterOutlet extends React.Component {

}

export class Router {
    readonly events: Observable<ActivationEnd>;
}

export class ActivationEnd {
    public snapshot: ActivatedRouteSnapshot
}

export class ActivatedRouteSnapshot {
    public parent: ActivatedRouteSnapshot;
    public routeConfig: { path: string };
}

export let router = new Router();