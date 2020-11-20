import { Observable } from 'rxjs';
import React from 'react';
import { NavLink, Route, Switch, useParams, useRouteMatch, withRouter } from 'react-router-dom';

export type SingleRoute =  {
    path:string,
    component?:any,
    loadChildren?:Routes
};

export type Routes =  SingleRoute[];

class RouterOutletProps {
    routes: Routes
}

function RouterTarget(props) {
    activatedRoute._currentParams = useParams();
    return React.createElement(props.component,{},[]);
}

export function RouterOutlet(props:RouterOutletProps) {
    let { url } = useRouteMatch();
    if (!url.endsWith('/')) url = url + '/';
    return  <Switch>
                { props.routes.map( (route:SingleRoute) =>
                    <Route path={url+route.path}>
                        { route.component ?
                            <RouterTarget component={route.component}></RouterTarget> :
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
    public params: Observable<Params> = new Observable(subscriber => {
        subscriber.next(this._currentParams);
    });
    public _currentParams:object = {};
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
    static forRoot(x:Routes) {
        return {routes:x};
    }
    static forChild(x:Routes) {
        return {routes:x};
    }
}
