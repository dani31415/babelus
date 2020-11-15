import { Observable } from 'rxjs';
import React from 'react';

export class RouterOutlet extends React.Component {

}

export class Router {
    readonly events: Observable<ActivationEnd>;
    public navigateByUrl(url:string) {

    }
}

export class ActivationEnd {
    public snapshot: ActivatedRouteSnapshot
}

export class ActivatedRouteSnapshot {
    public parent: ActivatedRouteSnapshot;
    public routeConfig: { path: string };
}

export declare type Params = {
    [key: string]: any;
};

export class ActivatedRoute {
    public params: Observable<Params>;
}

export let router = new Router();
export let activatedRoute = new ActivatedRoute();

export class RouterLinkProps {
    active?:boolean;
}

export default class RouterLink extends React.Component<RouterLinkProps> {
    constructor(props) {
        super(props);
    }
}