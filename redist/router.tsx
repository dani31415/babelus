import { Observable } from 'rxjs';
import React from 'react';
import { NavLink, Route, Switch, useRouteMatch } from 'react-router-dom';

export type SingleRoute =  {
    path:string,
    component?:any,
    loadChildren?:Routes
};

export type Routes =  SingleRoute[];

class Switch2 extends React.Component {
    render() {
        return <React.Fragment>
            &lt;switch&gt;
            {this.props.children}
            &lt;/switch&gt;
        </React.Fragment>
    }
}

class Route2Props {
    path:string;
}

class Route2 extends React.Component<Route2Props> {
    constructor(props) {
        super(props);
    }
    render() {
        return <React.Fragment>
            &lt;route path={this.props.path}&gt;
            <br/>
            {this.props.children}
            <br/>
            &lt;/route&gt;
        </React.Fragment>
    }
}

class RouterOutletProps {
    routes: Routes
}

export function RouterOutlet(props:RouterOutletProps) {
    let { url } = useRouteMatch();
    if (!url.endsWith('/')) url = url + '/';
    return  <Switch>
                { props.routes.map( (route:SingleRoute) =>
                    <Route path={url+route.path}>
                        { route.component ?
                            React.createElement(route.component,{},[]) :
                            <RouterOutlet routes={route.loadChildren}></RouterOutlet>
                        }
                    </Route>
                )}
            </Switch>
    ;
}

export class Router {
    readonly events: Observable<ActivationEnd> = new Observable();
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