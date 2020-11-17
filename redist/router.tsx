import { Observable } from 'rxjs';
import React from 'react';
import { NavLink } from 'react-router-dom';

export type Routes =  {
    path:string,
    component?:Function,
    loadChildren?:Routes
}[];

class RouterOutletProps {
    routes: Routes
}

export class RouterOutlet extends React.Component<RouterOutletProps> {
    constructor(props) {
        super(props);
    }
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
    routerLink?:string;
}

export default class RouterLink extends React.Component<RouterLinkProps> {
    constructor(props) {
        super(props);
    }
    render() {
        return <NavLink to={this.props.routerLink} activeClassName='selected'>{this.props.children}</NavLink>;
    }
}

export class RouterModule {

}